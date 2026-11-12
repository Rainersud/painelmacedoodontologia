import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { fetchMetricsData, inRange, newLeads, pct, sales, summarize } from '@/lib/metrics';
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
      const period = { start: range.start, end: range.end };

      // Números principais pela camada única; aqui só ficam LTV, recuperação e tempo de conversão.
      const [data, leadsRes, upsellRes] = await Promise.all([
        fetchMetricsData(period),
        supabase.from('leads').select('id, status, first_response_at, created_at, closed_at, rescued_at, loss_reason'),
        supabase.from('upsell_opportunities').select('lead_id, closed_value, status'),
      ]);

      const leadsAll = leadsRes.data || [];
      const upsells = upsellRes.data || [];
      const summary = summarize(data, period);
      const leadsPeriod = newLeads(data.leads, period);
      const payments = data.payments.filter(p => p.status === 'pago' && inRange(p.paid_at, period));

      const leadsGerados = summary.newLeads;
      const totalInvestimento = summary.investment;
      const totalReceita = summary.revenue;
      const cpl = summary.cpl;
      const respondidos = leadsPeriod.filter(l => l.first_response_at).length;
      const taxaResposta = Math.round(pct(respondidos, leadsGerados));
      const taxaAgendamento = Math.round(summary.bookingRate);
      const taxaComparecimento = Math.round(summary.attendanceRate);
      const vendasFechadas = summary.sales;
      const taxaFechamento = Math.round(summary.closingRate);
      const ticketMedio = summary.averageTicket;
      const cac = summary.cac;
      const roas = summary.roas;

      const fechadosNoPeriodo = sales(data.leads, period);
      const temposConv = fechadosNoPeriodo.map(l => differenceInDays(new Date(l.closed_at!), new Date(l.created_at)));
      const tempoMedioConversao = temposConv.length > 0 ? Math.round(temposConv.reduce((a, b) => a + b, 0) / temposConv.length) : 0;

      const recuperados = leadsAll.filter(l => l.rescued_at && l.rescued_at >= startISO && l.rescued_at <= endISO).length;
      const perdidos = leadsAll.filter(l => l.loss_reason && l.created_at >= startISO && l.created_at <= endISO).length;
      const taxaRecuperacao = perdidos > 0 ? Math.round((recuperados / perdidos) * 100) : 0;

      const revenueByLead: Record<string, number> = {};
      payments.forEach(p => {
        if (p.lead_id) revenueByLead[p.lead_id] = (revenueByLead[p.lead_id] || 0) + Number(p.net_value || 0);
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
        const m = summarize(data, b);
        const bRescued = leadsAll.filter(l => l.rescued_at && l.rescued_at >= sISO && l.rescued_at <= eISO).length;
        const bLost = leadsAll.filter(l => l.loss_reason && l.created_at >= sISO && l.created_at <= eISO).length;
        const bConvDays = sales(data.leads, b).map(l => differenceInDays(new Date(l.closed_at!), new Date(l.created_at)));
        const bResp = newLeads(data.leads, b).filter(l => l.first_response_at).length;

        trends.leadsGerados.push(m.newLeads);
        trends.cpl.push(Math.round(m.cpl));
        trends.taxaResposta.push(Math.round(pct(bResp, m.newLeads)));
        trends.taxaAgendamento.push(Math.round(m.bookingRate));
        trends.taxaComparecimento.push(Math.round(m.attendanceRate));
        trends.taxaFechamento.push(Math.round(m.closingRate));
        trends.ticketMedio.push(Math.round(m.averageTicket));
        trends.cac.push(Math.round(m.cac));
        trends.roas.push(Math.round(m.roas * 100) / 100);
        trends.tempoMedioConversao.push(bConvDays.length > 0 ? Math.round(bConvDays.reduce((a, b2) => a + b2, 0) / bConvDays.length) : 0);
        trends.taxaRecuperacao.push(bLost > 0 ? Math.round((bRescued / bLost) * 100) : 0);
        trends.ltv.push(Math.round(m.averageTicket));
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
