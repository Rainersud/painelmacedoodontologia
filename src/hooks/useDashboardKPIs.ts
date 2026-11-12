import { useQuery } from '@tanstack/react-query';
import { fetchMetricsData, isAttendedLead, newLeads, percentChange, summarize, type MetricsSummary } from '@/lib/metrics';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';

export interface KPIValue {
  value: number;
  prev: number;
  change: number; // percentage delta
}

export interface DashboardKPIs {
  leadsRecebidos: KPIValue;
  leadsAtendidos: KPIValue;
  consultasAgendadas: KPIValue;
  taxaComparecimento: KPIValue;
  taxaConversao: KPIValue;
  roi: KPIValue;
  receita: KPIValue;
  investimento: KPIValue;
}

// Todos os números vêm da camada única (src/lib/metrics), as mesmas regras das outras telas.
function toKPIs(m: MetricsSummary, leadsAtendidos: number) {
  return {
    leadsRecebidos: m.newLeads,
    leadsAtendidos,
    consultasAgendadas: m.booked,
    taxaComparecimento: Math.round(m.attendanceRate),
    taxaConversao: Math.round(m.conversionRate),
    receita: m.revenue,
    investimento: m.investment,
    roi: Math.round(m.roi),
  };
}

export function useDashboardKPIs() {
  const { range } = usePeriodFilter();

  return useQuery({
    queryKey: ['dashboard-kpis', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<DashboardKPIs> => {
      const current = { start: range.start, end: range.end };
      const previous = { start: range.prevStart, end: range.prevEnd };
      const data = await fetchMetricsData({ start: range.prevStart, end: range.end });
      const attended = (r: typeof current) => newLeads(data.leads, r).filter(isAttendedLead).length;
      const curr = toKPIs(summarize(data, current), attended(current));
      const prev = toKPIs(summarize(data, previous), attended(previous));

      const wrap = (k: keyof typeof curr): KPIValue => ({
        value: curr[k],
        prev: prev[k],
        change: percentChange(curr[k], prev[k]),
      });

      return {
        leadsRecebidos: wrap('leadsRecebidos'),
        leadsAtendidos: wrap('leadsAtendidos'),
        consultasAgendadas: wrap('consultasAgendadas'),
        taxaComparecimento: wrap('taxaComparecimento'),
        taxaConversao: wrap('taxaConversao'),
        roi: wrap('roi'),
        receita: wrap('receita'),
        investimento: wrap('investimento'),
      };
    },
    refetchInterval: 60000,
  });
}
