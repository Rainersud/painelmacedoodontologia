import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { differenceInDays, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay, startOfHour, endOfHour, isSameDay } from 'date-fns';

export interface BusinessTrends {
  leadsGerados: number[];
  cpl: number[];
  taxaResposta: number[];
  taxaAgendamento: number[];
  taxaComparecimento: number[];
  taxaFechamento: number[];
  ticketMedio: number[];
  cac: number[];
  roas: number[];
  tempoMedioConversao: number[];
  taxaRecuperacao: number[];
  ltv: number[];
}

export interface BusinessMetrics {
  leadsGerados: number;
  cpl: number;
  taxaResposta: number;
  taxaAgendamento: number;
  taxaComparecimento: number;
  taxaFechamento: number;
  ticketMedio: number;
  cac: number;
  roas: number;
  tempoMedioConversao: number;
  taxaRecuperacao: number;
  ltv: number;
  totalReceita: number;
  totalInvestimento: number;
  vendasFechadas: number;
  trends: BusinessTrends;
}

export function useBusinessMetrics() {
  const { range } = usePeriodFilter();

  return useQuery({
    queryKey: ['business-metrics', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<BusinessMetrics> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      const [leadsRes, apptsRes, paymentsRes, costsRes, upsellRes] = await Promise.all([
        supabase.from('leads').select('id, status, first_response_at, created_at, closed_at, rescued_at, loss_reason'),
        supabase.from('appointments').select('id, attended_at, scheduled_at, lead_id').gte('scheduled_at', startISO).lte('scheduled_at', endISO),
        supabase.from('payments').select('net_value, status, paid_at, lead_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
        supabase.from('acquisition_costs').select('amount').gte('reference_month', range.start.toISOString().split('T')[0]).lte('reference_month', range.end.toISOString().split('T')[0]),
        supabase.from('upsell_opportunities').select('lead_id, closed_value, status'),
      ]);

      const leadsAll = leadsRes.data || [];
      const leadsPeriod = leadsAll.filter(l => l.created_at >= startISO && l.created_at <= endISO);
      const appts = apptsRes.data || [];
      const payments = paymentsRes.data || [];
      const costs = costsRes.data || [];
      const upsells = upsellRes.data || [];

      const leadsGerados = leadsPeriod.length;
      const totalInvestimento = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
      const totalReceita = payments.reduce((s, p) => s + (p.net_value || 0), 0);

      const cpl = leadsGerados > 0 ? totalInvestimento / leadsGerados : 0;
      const respondidos = leadsPeriod.filter(l => l.first_response_at).length;
      const taxaResposta = leadsGerados > 0 ? Math.round((respondidos / leadsGerados) * 100) : 0;
      const atendidos = leadsPeriod.filter(l => l.first_response_at || l.status !== 'novo_lead').length;
      const consultasAgendadas = appts.length;
      const taxaAgendamento = atendidos > 0 ? Math.round((consultasAgendadas / atendidos) * 100) : 0;
      const compareceram = appts.filter(a => a.attended_at).length;
      const taxaComparecimento = consultasAgendadas > 0 ? Math.round((compareceram / consultasAgendadas) * 100) : 0;

      const paidLeadIds = new Set(payments.map(p => p.lead_id));
      const vendasFechadas = paidLeadIds.size;
      const taxaFechamento = compareceram > 0 ? Math.round((vendasFechadas / compareceram) * 100) : 0;

      const ticketMedio = vendasFechadas > 0 ? totalReceita / vendasFechadas : 0;
      const cac = vendasFechadas > 0 ? totalInvestimento / vendasFechadas : 0;
      const roas = totalInvestimento > 0 ? totalReceita / totalInvestimento : 0;

      const fechadosNoPeriodo = leadsAll.filter(l => l.status === 'fechado' && l.closed_at && l.closed_at >= startISO && l.closed_at <= endISO);
      const temposConv = fechadosNoPeriodo.map(l => differenceInDays(new Date(l.closed_at!), new Date(l.created_at)));
      const tempoMedioConversao = temposConv.length > 0 ? Math.round(temposConv.reduce((a, b) => a + b, 0) / temposConv.length) : 0;

      const recuperados = leadsAll.filter(l => l.rescued_at && l.rescued_at >= startISO && l.rescued_at <= endISO).length;
      const perdidos = leadsAll.filter(l => l.loss_reason && l.created_at >= startISO && l.created_at <= endISO).length;
      const taxaRecuperacao = perdidos > 0 ? Math.round((recuperados / perdidos) * 100) : 0;

      const revenueByLead: Record<string, number> = {};
      payments.forEach(p => {
        if (p.lead_id) revenueByLead[p.lead_id] = (revenueByLead[p.lead_id] || 0) + (p.net_value || 0);
      });
      upsells.forEach(u => {
        if (u.lead_id && u.closed_value) revenueByLead[u.lead_id] = (revenueByLead[u.lead_id] || 0) + Number(u.closed_value);
      });
      const ltvValues = Object.values(revenueByLead);
      const ltv = ltvValues.length > 0 ? ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length : 0;

      // ============ TRENDS ============
      // Hoje → bucket por hora; Semana/Mês → bucket por dia
      const isToday = isSameDay(range.start, range.end);
      const buckets = isToday
        ? eachHourOfInterval({ start: range.start, end: range.end }).map(d => ({ start: startOfHour(d), end: endOfHour(d) }))
        : eachDayOfInterval({ start: range.start, end: range.end }).map(d => ({ start: startOfDay(d), end: endOfDay(d) }));

      const investPerBucket = buckets.length > 0 ? totalInvestimento / buckets.length : 0;

      const trends: BusinessTrends = {
        leadsGerados: [],
        cpl: [],
        taxaResposta: [],
        taxaAgendamento: [],
        taxaComparecimento: [],
        taxaFechamento: [],
        ticketMedio: [],
        cac: [],
        roas: [],
        tempoMedioConversao: [],
        taxaRecuperacao: [],
        ltv: [],
      };

      buckets.forEach(b => {
        const sISO = b.start.toISOString();
        const eISO = b.end.toISOString();
        const bLeads = leadsPeriod.filter(l => l.created_at >= sISO && l.created_at <= eISO);
        const bAppts = appts.filter(a => a.scheduled_at >= sISO && a.scheduled_at <= eISO);
        const bAtt = bAppts.filter(a => a.attended_at);
        const bPays = payments.filter(p => p.paid_at && p.paid_at >= sISO && p.paid_at <= eISO);
        const bRevenue = bPays.reduce((s, p) => s + (p.net_value || 0), 0);
        const bSales = new Set(bPays.map(p => p.lead_id)).size;
        const bResp = bLeads.filter(l => l.first_response_at).length;
        const bAtendidos = bLeads.filter(l => l.first_response_at || l.status !== 'novo_lead').length;
        const bRescued = leadsAll.filter(l => l.rescued_at && l.rescued_at >= sISO && l.rescued_at <= eISO).length;
        const bLost = leadsAll.filter(l => l.loss_reason && l.created_at >= sISO && l.created_at <= eISO).length;
        const bClosed = leadsAll.filter(l => l.status === 'fechado' && l.closed_at && l.closed_at >= sISO && l.closed_at <= eISO);
        const bConvDays = bClosed.map(l => differenceInDays(new Date(l.closed_at!), new Date(l.created_at)));

        trends.leadsGerados.push(bLeads.length);
        trends.cpl.push(bLeads.length > 0 ? Math.round(investPerBucket / bLeads.length) : 0);
        trends.taxaResposta.push(bLeads.length > 0 ? Math.round((bResp / bLeads.length) * 100) : 0);
        trends.taxaAgendamento.push(bAtendidos > 0 ? Math.round((bAppts.length / bAtendidos) * 100) : 0);
        trends.taxaComparecimento.push(bAppts.length > 0 ? Math.round((bAtt.length / bAppts.length) * 100) : 0);
        trends.taxaFechamento.push(bAtt.length > 0 ? Math.round((bSales / bAtt.length) * 100) : 0);
        trends.ticketMedio.push(bSales > 0 ? Math.round(bRevenue / bSales) : 0);
        trends.cac.push(bSales > 0 ? Math.round(investPerBucket / bSales) : 0);
        trends.roas.push(investPerBucket > 0 ? Math.round((bRevenue / investPerBucket) * 100) / 100 : 0);
        trends.tempoMedioConversao.push(bConvDays.length > 0 ? Math.round(bConvDays.reduce((a, b2) => a + b2, 0) / bConvDays.length) : 0);
        trends.taxaRecuperacao.push(bLost > 0 ? Math.round((bRescued / bLost) * 100) : 0);
        trends.ltv.push(bSales > 0 ? Math.round(bRevenue / bSales) : 0);
      });

      return {
        leadsGerados,
        cpl: Math.round(cpl),
        taxaResposta,
        taxaAgendamento,
        taxaComparecimento,
        taxaFechamento,
        ticketMedio: Math.round(ticketMedio),
        cac: Math.round(cac),
        roas: Math.round(roas * 100) / 100,
        tempoMedioConversao,
        taxaRecuperacao,
        ltv: Math.round(ltv),
        totalReceita,
        totalInvestimento,
        vendasFechadas,
        trends,
      };
    },
    refetchInterval: 60000,
  });
}
