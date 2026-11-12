import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SOLD_STATUS_LIST } from '@/lib/metrics';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface SaleTypeMetrics {
  salesCount: number;
  totalRevenue: number;
  totalCosts: number;
  cac: number;
  ticketMedio: number;
  lucroPorCliente: number;
  roi: number;
  conversionRate: number;
  leadCount: number;
}

export interface SalesComparisonData {
  oneStep: SaleTypeMetrics;
  twoStep: SaleTypeMetrics;
  general: SaleTypeMetrics;
  bestProfit: '1_etapa' | '2_etapas' | 'equal';
  bestCac: '1_etapa' | '2_etapas' | 'equal';
  bestTicket: '1_etapa' | '2_etapas' | 'equal';
  bestConversion: '1_etapa' | '2_etapas' | 'equal';
}

function pickBest(a: number, b: number, lowerIsBetter = false): '1_etapa' | '2_etapas' | 'equal' {
  if (a === 0 && b === 0) return 'equal';
  if (lowerIsBetter) {
    if (a === 0) return '2_etapas';
    if (b === 0) return '1_etapa';
    return a < b ? '1_etapa' : a > b ? '2_etapas' : 'equal';
  }
  return a > b ? '1_etapa' : a < b ? '2_etapas' : 'equal';
}

export function useSalesMetrics(referenceMonth?: Date) {
  const month = referenceMonth || new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return useQuery({
    queryKey: ['sales-metrics', monthStart.toISOString()],
    queryFn: async (): Promise<SalesComparisonData> => {
      // Get closed leads with sale_type
      const { data: closedLeads } = await supabase
        .from('leads')
        .select('id, sale_type, closed_at')
        .in('status', [...SOLD_STATUS_LIST]) // venda = etapa vendida (regra única)
        .gte('closed_at', monthStart.toISOString())
        .lte('closed_at', monthEnd.toISOString());

      const leads = closedLeads || [];
      const oneStepLeads = leads.filter(l => (l as any).sale_type === '1_etapa');
      const twoStepLeads = leads.filter(l => (l as any).sale_type === '2_etapas');
      const oneStepIds = oneStepLeads.map(l => l.id);
      const twoStepIds = twoStepLeads.map(l => l.id);
      const allIds = leads.map(l => l.id);

      // Get payments for each group
      const getRevenue = async (ids: string[]) => {
        if (ids.length === 0) return 0;
        const { data } = await supabase
          .from('payments')
          .select('net_value')
          .eq('status', 'pago')
          .in('lead_id', ids);
        return (data || []).reduce((sum, p) => sum + (p.net_value || 0), 0);
      };

      const [rev1, rev2, revAll] = await Promise.all([
        getRevenue(oneStepIds),
        getRevenue(twoStepIds),
        getRevenue(allIds),
      ]);

      // Total costs (shared across all sales proportionally)
      const { data: costsData } = await supabase
        .from('acquisition_costs' as any)
        .select('amount')
        .gte('reference_month', monthStart.toISOString().split('T')[0])
        .lte('reference_month', monthEnd.toISOString().split('T')[0]);

      const totalCosts = ((costsData || []) as any[]).reduce((sum, c) => sum + Number(c.amount), 0);

      // Total leads in period
      const { count: totalLeadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const totalLeads = totalLeadCount || 0;
      const totalSales = leads.length;

      // Proportional cost split
      const costShare1 = totalSales > 0 ? totalCosts * (oneStepLeads.length / totalSales) : 0;
      const costShare2 = totalSales > 0 ? totalCosts * (twoStepLeads.length / totalSales) : 0;

      const buildMetrics = (count: number, revenue: number, costs: number, leadBase: number): SaleTypeMetrics => {
        const cac = count > 0 ? costs / count : 0;
        const ticketMedio = count > 0 ? revenue / count : 0;
        return {
          salesCount: count,
          totalRevenue: revenue,
          totalCosts: costs,
          cac,
          ticketMedio,
          lucroPorCliente: ticketMedio - cac,
          roi: costs > 0 ? ((revenue - costs) / costs) * 100 : 0,
          conversionRate: leadBase > 0 ? (count / leadBase) * 100 : 0,
          leadCount: leadBase,
        };
      };

      const oneStep = buildMetrics(oneStepLeads.length, rev1, costShare1, totalLeads);
      const twoStep = buildMetrics(twoStepLeads.length, rev2, costShare2, totalLeads);
      const general = buildMetrics(totalSales, revAll, totalCosts, totalLeads);

      return {
        oneStep,
        twoStep,
        general,
        bestProfit: pickBest(oneStep.lucroPorCliente, twoStep.lucroPorCliente),
        bestCac: pickBest(oneStep.cac, twoStep.cac, true),
        bestTicket: pickBest(oneStep.ticketMedio, twoStep.ticketMedio),
        bestConversion: pickBest(oneStep.conversionRate, twoStep.conversionRate),
      };
    },
  });
}
