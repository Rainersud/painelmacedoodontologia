import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMetricsData, newLeads, sales, bookedAppointments, attendances, appointmentsInPeriod,
  conversionRate, bookingRate, isAttendedLead, attendanceRate, closingRate, revenueByAgent,
} from '@/lib/metrics';

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  isActive: boolean;
  /** Novos leads atribuídos no período (mesma fonte do Comercial 1) */
  leadsReceived: number;
  /** Leads que tiveram primeira resposta / saíram de novo_lead */
  leadsAttended: number;
  callsMade: number;
  callsAnswered: number;
  /** Agendamentos criados no período (appointments) */
  appointmentsScheduled: number;
  appointmentsConfirmed: number;
  /** Comparecimentos no período */
  attendedAppointments: number;
  noShows: number;
  /** Indicações geradas pelo atendente */
  referrals: number;
  /** Vendas fechadas (status=fechado) no período — Comercial 1 */
  closed: number;
  /** Faturamento líquido (payments pagos no período) */
  revenue: number;
  /** Vendas ÷ novos leads (%) — regra única */
  conversionRate: number;
  /** Agendamentos marcados ÷ novos leads (%) */
  bookingRate: number;
  /** Consultas do período com presença ÷ consultas do período (%) */
  attendanceRate: number;
  closingRate: number;
  avgResponseTimeSeconds: number;
}

export interface AgentRanking {
  rank: number;
  agentId: string;
  agentName: string;
  value: number;
  metric: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

async function fetchAgentMetrics(range: DateRange, agentFilter?: string): Promise<AgentMetrics[]> {
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();

  // Leads, consultas e pagamentos vêm da camada única de indicadores (mesmas regras do resto do painel).
  const [data, { data: profiles }, { data: calls }, { data: refs }] = await Promise.all([
    fetchMetricsData(range),
    supabase.from('profiles').select('user_id, full_name, is_active').order('full_name'),
    supabase.from('call_logs').select('id, agent_id, call_type, result, created_at')
      .gte('created_at', startISO).lte('created_at', endISO),
    supabase.from('referrals').select('id, referrer_lead_id, created_at')
      .gte('created_at', startISO).lte('created_at', endISO),
  ]);

  // Indicação pertence ao dono do lead que indicou
  const referrerLeadIds = Array.from(new Set((refs ?? []).map(r => r.referrer_lead_id)));
  const referrerAgentMap = new Map<string, string | null>();
  if (referrerLeadIds.length) {
    const { data: refLeads } = await supabase
      .from('leads')
      .select('id, assigned_agent_id')
      .in('id', referrerLeadIds);
    (refLeads ?? []).forEach(l => referrerAgentMap.set(l.id, l.assigned_agent_id));
  }

  const revenueMap = revenueByAgent(data.payments, data.leads, range);
  const nowISO = new Date().toISOString();

  const metrics: AgentMetrics[] = [];
  for (const p of profiles ?? []) {
    if (agentFilter && p.user_id !== agentFilter) continue;
    const aid = p.user_id;

    const leadsReceived = newLeads(data.leads, range, aid).length;
    const leadsAttended = newLeads(data.leads, range, aid).filter(isAttendedLead).length;

    const myCalls = (calls ?? []).filter(c => c.agent_id === aid);
    const callsMade = myCalls.filter(c => c.call_type === 'outbound').length;
    const callsAnswered = myCalls.filter(c => c.result === 'atendida').length;

    const booked = bookedAppointments(data.appointments, range, aid);
    const appointmentsScheduled = booked.length;
    const appointmentsConfirmed = booked.filter(a => a.confirmed_at).length;
    const attendedAppointments = attendances(data.appointments, range, aid).length;
    const noShows = appointmentsInPeriod(data.appointments, range, aid)
      .filter(a => !a.attended_at && !a.cancelled_at && a.scheduled_at < nowISO).length;

    const closed = sales(data.leads, range, aid).length;
    const revenue = revenueMap[aid] ?? 0;
    const referrals = (refs ?? []).filter(r => referrerAgentMap.get(r.referrer_lead_id) === aid).length;

    metrics.push({
      agentId: aid,
      agentName: p.full_name,
      isActive: p.is_active,
      leadsReceived,
      leadsAttended,
      callsMade,
      callsAnswered,
      appointmentsScheduled,
      appointmentsConfirmed,
      attendedAppointments,
      noShows,
      referrals,
      closed,
      revenue,
      conversionRate: Math.round(conversionRate(data.leads, range, aid)),
      bookingRate: Math.round(bookingRate(data.appointments, data.leads, range, aid)),
      attendanceRate: Math.round(attendanceRate(data.appointments, range, aid)),
      closingRate: Math.round(closingRate(data.leads, data.appointments, range, aid)),
      avgResponseTimeSeconds: 0,
    });
  }

  return metrics;
}

export function useAgentMetricsRange(range: DateRange, agentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agent-metrics', range.start.toISOString(), range.end.toISOString(), agentId ?? 'all'],
    queryFn: () => fetchAgentMetrics(range, agentId),
    // acesso aberto: sem login obrigatorio
    refetchInterval: 60000,
  });
}

export function useAgentRankingsRange(range: DateRange) {
  const { data: metrics } = useAgentMetricsRange(range);
  const list = metrics ?? [];

  const ranked = (key: keyof AgentMetrics, metric: string): AgentRanking[] =>
    [...list]
      .sort((a, b) => Number(b[key]) - Number(a[key]))
      .map((m, idx) => ({
        rank: idx + 1,
        agentId: m.agentId,
        agentName: m.agentName,
        value: Number(m[key]),
        metric,
      }));

  return {
    byAppointments: ranked('appointmentsScheduled', 'appointments'),
    byRevenue: ranked('revenue', 'revenue'),
    byConversion: ranked('conversionRate', 'conversion'),
    byAttended: ranked('attendedAppointments', 'attended'),
    byClosed: ranked('closed', 'closed'),
    byReferrals: ranked('referrals', 'referrals'),
  };
}
