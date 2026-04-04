import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface RecurrenceGroup {
  label: string;
  minCount: number;
  maxCount: number | null;
  clientCount: number;
  avgTicket: number;
  avgLTV: number;
  avgCAC: number;
  avgProfit: number;
  totalRevenue: number;
  healthColor: 'success' | 'warning' | 'destructive';
}

export interface LTVMetricsData {
  groups: RecurrenceGroup[];
  bestLTVGroup: string | null;
  bestProfitGroup: string | null;
  highCACGroup: string | null;
  growthPotentialGroup: string | null;
  insights: string[];
}

const RECURRENCE_LABELS = [
  { label: 'Comprou 1 vez', minCount: 1, maxCount: 1 },
  { label: 'Comprou 2 vezes', minCount: 2, maxCount: 2 },
  { label: 'Comprou 3 vezes', minCount: 3, maxCount: 3 },
  { label: 'Comprou 4 vezes', minCount: 4, maxCount: 4 },
  { label: 'Comprou 5+ vezes', minCount: 5, maxCount: null },
];

function getHealthColor(profit: number): 'success' | 'warning' | 'destructive' {
  if (profit > 500) return 'success';
  if (profit >= 0) return 'warning';
  return 'destructive';
}

export function useLTVMetrics() {
  return useQuery({
    queryKey: ['ltv-metrics'],
    queryFn: async (): Promise<LTVMetricsData> => {
      // Get all upsell opportunities with lead data
      const { data: opps } = await supabase
        .from('upsell_opportunities')
        .select('lead_id, purchase_count, estimated_value, closed_value, status')
        .order('lead_id');

      // Get all paid payments grouped by lead
      const { data: payments } = await supabase
        .from('payments')
        .select('lead_id, net_value')
        .eq('status', 'pago');

      // Get total acquisition costs (current month for CAC approximation)
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const { data: costsData } = await supabase
        .from('acquisition_costs')
        .select('amount')
        .gte('reference_month', monthStart.toISOString().split('T')[0])
        .lte('reference_month', monthEnd.toISOString().split('T')[0]);

      const totalCosts = (costsData || []).reduce((sum, c) => sum + Number(c.amount), 0);

      // Get total closed leads for CAC calculation
      const { count: totalClosed } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fechado');

      const avgCACGlobal = (totalClosed || 0) > 0 ? totalCosts / (totalClosed || 1) : 0;

      // Group payments by lead for LTV calculation
      const paymentsByLead: Record<string, number> = {};
      (payments || []).forEach(p => {
        paymentsByLead[p.lead_id] = (paymentsByLead[p.lead_id] || 0) + (p.net_value || 0);
      });

      // Group opportunities by lead, use the max purchase_count per lead
      const leadPurchaseCounts: Record<string, number> = {};
      (opps || []).forEach(o => {
        const current = leadPurchaseCounts[o.lead_id] || 0;
        leadPurchaseCounts[o.lead_id] = Math.max(current, (o as any).purchase_count || 1);
      });

      // Build recurrence groups
      const groups: RecurrenceGroup[] = RECURRENCE_LABELS.map(({ label, minCount, maxCount }) => {
        const leadsInGroup = Object.entries(leadPurchaseCounts).filter(([, count]) => {
          if (maxCount === null) return count >= minCount;
          return count >= minCount && count <= maxCount;
        });

        const clientCount = leadsInGroup.length;
        const leadIds = leadsInGroup.map(([id]) => id);

        // Calculate revenue for this group
        const groupRevenue = leadIds.reduce((sum, id) => sum + (paymentsByLead[id] || 0), 0);
        const avgLTV = clientCount > 0 ? groupRevenue / clientCount : 0;
        const avgTicket = clientCount > 0 ? groupRevenue / (clientCount * (maxCount || minCount)) : 0;
        const avgProfit = avgLTV - avgCACGlobal;

        return {
          label,
          minCount,
          maxCount,
          clientCount,
          avgTicket,
          avgLTV,
          avgCAC: avgCACGlobal,
          avgProfit,
          totalRevenue: groupRevenue,
          healthColor: getHealthColor(avgProfit),
        };
      });

      // Smart insights
      const activeGroups = groups.filter(g => g.clientCount > 0);
      const bestLTVGroup = activeGroups.length > 0
        ? activeGroups.reduce((a, b) => a.avgLTV > b.avgLTV ? a : b).label
        : null;
      const bestProfitGroup = activeGroups.length > 0
        ? activeGroups.reduce((a, b) => a.avgProfit > b.avgProfit ? a : b).label
        : null;
      const highCACGroup = activeGroups.length > 0
        ? activeGroups.reduce((a, b) => a.avgCAC > b.avgCAC ? a : b).label
        : null;
      const singleBuyers = groups[0];
      const growthPotentialGroup = singleBuyers.clientCount > 0 ? singleBuyers.label : null;

      const insights: string[] = [];
      if (singleBuyers.clientCount > 0) {
        insights.push(`"Clientes com 1 compra precisam de ação de pós-venda" – ${singleBuyers.clientCount} pacientes neste grupo`);
      }
      const twoBuyers = groups[1];
      if (twoBuyers.clientCount > 0) {
        insights.push(`"Clientes com 2 compras têm alto potencial de crescimento" – ${twoBuyers.clientCount} pacientes`);
      }
      const threePlus = groups.slice(2).reduce((sum, g) => sum + g.clientCount, 0);
      if (threePlus > 0) {
        insights.push(`"Grupo 3+ gera maior lucro – priorizar retenção" – ${threePlus} pacientes`);
      }
      if (bestProfitGroup) {
        const best = activeGroups.find(g => g.label === bestProfitGroup);
        if (best) {
          insights.push(`💰 Grupo mais lucrativo: ${best.label} com lucro médio de R$ ${best.avgProfit.toFixed(0)} por paciente`);
        }
      }

      return {
        groups,
        bestLTVGroup,
        bestProfitGroup,
        highCACGroup,
        growthPotentialGroup,
        insights,
      };
    },
  });
}
