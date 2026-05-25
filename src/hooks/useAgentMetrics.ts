import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  conversionRate: number;
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

  // 1) Buscar perfis ativos
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, is_active')
    .order('full_name');

  // 2) Buscar leads do período em batch (Comercial 1 usa created_at)
  const { data: leadsCreated } = await supabase
    .from('leads')
    .select('id, assigned_agent_id, status, first_response_at, closed_at, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  // 3) Leads fechados no período (vendas)
  const { data: leadsClosed } = await supabase
    .from('leads')
    .select('id, assigned_agent_id, closed_at, treatment_value')
    .eq('status', 'fechado')
    .not('closed_at', 'is', null)
    .gte('closed_at', startISO)
    .lte('closed_at', endISO);

  // 4) Appointments (agendamentos + comparecimentos)
  const { data: appts } = await supabase
    .from('appointments')
    .select('id, agent_id, attended_at, confirmed_at, scheduled_at, created_at, revenue')
    .or(`and(created_at.gte.${startISO},created_at.lte.${endISO}),and(attended_at.gte.${startISO},attended_at.lte.${endISO})`);

  // 5) Call logs
  const { data: calls } = await supabase
    .from('call_logs')
    .select('id, agent_id, call_type, result, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  // 6) Pagamentos pagos (receita)
  const { data: payments } = await supabase
    .from('payments')
    .select('net_value, lead_id, paid_at')
    .eq('status', 'pago')
    .gte('paid_at', startISO)
    .lte('paid_at', endISO);

  // 7) Indicações criadas no período → pegar referrer_lead_id e mapear ao agente
  const { data: refs } = await supabase
    .from('referrals')
    .select('id, referrer_lead_id, created_at')
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  const referrerLeadIds = Array.from(new Set((refs ?? []).map(r => r.referrer_lead_id)));
  let referrerAgentMap = new Map<string, string | null>();
  if (referrerLeadIds.length) {
    const { data: refLeads } = await supabase
      .from('leads')
      .select('id, assigned_agent_id')
      .in('id', referrerLeadIds);
    (refLeads ?? []).forEach(l => referrerAgentMap.set(l.id, l.assigned_agent_id));
  }

  // mapa lead_id → assigned_agent_id (para vincular receita ao atendente)
  const leadAgentMap = new Map<string, string | null>();
  (leadsCreated ?? []).forEach(l => leadAgentMap.set(l.id, l.assigned_agent_id));
  (leadsClosed ?? []).forEach(l => leadAgentMap.set(l.id, l.assigned_agent_id));
  // Para pagamentos cujo lead não está nos batches, buscar adicional
  const missingLeadIds = Array.from(
    new Set((payments ?? []).map(p => p.lead_id).filter(id => id && !leadAgentMap.has(id))),
  ) as string[];
  if (missingLeadIds.length) {
    const { data: extraLeads } = await supabase
      .from('leads')
      .select('id, assigned_agent_id')
      .in('id', missingLeadIds);
    (extraLeads ?? []).forEach(l => leadAgentMap.set(l.id, l.assigned_agent_id));
  }

  const metrics: AgentMetrics[] = [];
  for (const p of profiles ?? []) {
    if (agentFilter && p.user_id !== agentFilter) continue;
    const aid = p.user_id;

    const myLeads = (leadsCreated ?? []).filter(l => l.assigned_agent_id === aid);
    const leadsReceived = myLeads.length;
    const leadsAttended = myLeads.filter(l => l.first_response_at || (l.status && l.status !== 'novo_lead')).length;

    const myCalls = (calls ?? []).filter(c => c.agent_id === aid);
    const callsMade = myCalls.filter(c => c.call_type === 'outbound').length;
    const callsAnswered = myCalls.filter(c => c.result === 'atendida').length;

    const myAppts = (appts ?? []).filter(a => a.agent_id === aid);
    const appointmentsScheduled = myAppts.filter(
      a => a.created_at >= startISO && a.created_at <= endISO,
    ).length;
    const appointmentsConfirmed = myAppts.filter(a => a.confirmed_at).length;
    const attendedAppointments = myAppts.filter(
      a => a.attended_at && a.attended_at >= startISO && a.attended_at <= endISO,
    ).length;
    const noShows = myAppts.filter(
      a => !a.attended_at && a.scheduled_at < new Date().toISOString() && a.scheduled_at >= startISO,
    ).length;

    const closed = (leadsClosed ?? []).filter(l => l.assigned_agent_id === aid).length;

    const revenue = (payments ?? []).reduce((sum, pay) => {
      const owner = pay.lead_id ? leadAgentMap.get(pay.lead_id) : null;
      return owner === aid ? sum + Number(pay.net_value || 0) : sum;
    }, 0);

    const referrals = (refs ?? []).filter(
      r => referrerAgentMap.get(r.referrer_lead_id) === aid,
    ).length;

    const conversionRate = leadsReceived > 0 ? Math.round((appointmentsScheduled / leadsReceived) * 100) : 0;
    const attendanceRate = appointmentsScheduled > 0 ? Math.round((attendedAppointments / appointmentsScheduled) * 100) : 0;
    const closingRate = attendedAppointments > 0 ? Math.round((closed / attendedAppointments) * 100) : 0;

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
      conversionRate,
      attendanceRate,
      closingRate,
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
    enabled: !!user,
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
