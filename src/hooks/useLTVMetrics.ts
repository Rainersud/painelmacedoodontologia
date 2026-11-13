import { useQuery } from '@tanstack/react-query';
import { allPages } from '@/lib/paging';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

export type PeriodFilter = 'mes' | 'trimestre' | 'ano' | 'todos';
export type SaleTypeFilter = 'todos' | '1_etapa' | '2_etapas';

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
  percentOfTotal: number;
}

export interface LTVMetricsData {
  groups: RecurrenceGroup[];
  bestLTVGroup: string | null;
  bestProfitGroup: string | null;
  highCACGroup: string | null;
  growthPotentialGroup: string | null;
  insights: string[];
  totalClients: number;
  totalRevenue: number;
  overallLTV: number;
  overallCAC: number;
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

function getDateRange(period: PeriodFilter): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case 'mes':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'trimestre':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'ano':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'todos':
      return null;
  }
}

export function useLTVMetrics(period: PeriodFilter = 'todos', saleType: SaleTypeFilter = 'todos') {
  return useQuery({
    queryKey: ['ltv-metrics', period, saleType],
    queryFn: async (): Promise<LTVMetricsData> => {
      const dateRange = getDateRange(period);

      // Get leads filtered by sale_type if needed
      let leadIdsBySaleType: Set<string> | null = null;
      if (saleType !== 'todos') {
        const saleTypeValue = saleType === '1_etapa' ? '1_etapa' : '2_etapas';
        const { data: filteredLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('sale_type', saleTypeValue);
        leadIdsBySaleType = new Set((filteredLeads || []).map(l => l.id));
      }

      // Get all upsell opportunities with lead data
      const { data: opps } = await allPages(supabase
        .from('upsell_opportunities')
        .select('lead_id, purchase_count, estimated_value, closed_value, status, purchase_values')
        .order('lead_id').order('id'));

      // Get paid payments
      let paymentsQuery = supabase
        .from('payments')
        .select('lead_id, net_value')
        .eq('status', 'pago');

      if (dateRange) {
        paymentsQuery = paymentsQuery
          .gte('paid_at', dateRange.start.toISOString())
          .lte('paid_at', dateRange.end.toISOString());
      }
      const { data: payments } = await allPages(paymentsQuery.order('id'));

      // Get acquisition costs
      const now = new Date();
      const costStart = dateRange ? dateRange.start : subMonths(now, 12);
      const costEnd = dateRange ? dateRange.end : now;
      const { data: costsData } = await supabase
        .from('acquisition_costs')
        .select('amount')
        .gte('reference_month', costStart.toISOString().split('T')[0])
        .lte('reference_month', costEnd.toISOString().split('T')[0]);

      const totalCosts = (costsData || []).reduce((sum, c) => sum + Number(c.amount), 0);

      // Get total closed leads for CAC calculation
      let closedQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fechado');

      if (dateRange) {
        closedQuery = closedQuery
          .gte('closed_at', dateRange.start.toISOString())
          .lte('closed_at', dateRange.end.toISOString());
      }
      const { count: totalClosed } = await closedQuery;

      const avgCACGlobal = (totalClosed || 0) > 0 ? totalCosts / (totalClosed || 1) : 0;

      // Group payments by lead
      const paymentsByLead: Record<string, number> = {};
      (payments || []).forEach(p => {
        paymentsByLead[p.lead_id] = (paymentsByLead[p.lead_id] || 0) + (p.net_value || 0);
      });

      // Group opportunities by lead — use purchase_count as source of truth for stage
      // purchase_values is used only for LTV calculation
      const leadPurchaseCounts: Record<string, number> = {};
      const leadLTVFromPurchases: Record<string, number> = {};
      (opps || []).forEach(o => {
        if (leadIdsBySaleType && !leadIdsBySaleType.has(o.lead_id)) return;
        
        // Pipeline stage (status 'comprou_N') is the source of truth, matching the CRM kanban
        const statusMatch = /^comprou_(\d+)$/.exec(((o as { status?: string }).status) || '');
        const stageCount = statusMatch ? parseInt(statusMatch[1], 10) : (o.purchase_count || 1);
        const totalCount = Math.max(stageCount, 1);
        
        // Parse purchase_values only for LTV value calculation
        let ltvFromField = 0;
        if (o.purchase_values) {
          try {
            const parsed = JSON.parse(o.purchase_values);
            if (Array.isArray(parsed)) {
              const paidEntries = parsed.filter((p: { value?: number; payment_status?: string }) =>
                (p.value || 0) > 0 && p.payment_status === 'pago'
              );
              ltvFromField = paidEntries.reduce((s: number, p: { value?: number }) => s + (p.value || 0), 0);
            }
          } catch {
            // Legacy semicolon format - treat all as paid (backward compat)
            const nums = o.purchase_values.split(';').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v) && v > 0);
            if (nums.length > 0) {
              ltvFromField = nums.reduce((s: number, v: number) => s + v, 0);
            }
          }
        }
        const current = leadPurchaseCounts[o.lead_id] || 0;
        leadPurchaseCounts[o.lead_id] = Math.max(current, totalCount);
        // LTV = only recurrent purchases (excludes first sale)
        leadLTVFromPurchases[o.lead_id] = (leadLTVFromPurchases[o.lead_id] || 0) + ltvFromField;
      });

      const totalClientsAll = Object.keys(leadPurchaseCounts).length;

      // Build recurrence groups
      const groups: RecurrenceGroup[] = RECURRENCE_LABELS.map(({ label, minCount, maxCount }) => {
        const leadsInGroup = Object.entries(leadPurchaseCounts).filter(([, count]) => {
          if (maxCount === null) return count >= minCount;
          return count >= minCount && count <= maxCount;
        });

        const clientCount = leadsInGroup.length;
        const leadIds = leadsInGroup.map(([id]) => id);

        // Use LTV from purchase_values if available, fallback to payments
        const groupRevenue = leadIds.reduce((sum, id) => {
          const fromPurchases = leadLTVFromPurchases[id] || 0;
          const fromPayments = paymentsByLead[id] || 0;
          return sum + Math.max(fromPurchases, fromPayments);
        }, 0);
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
          percentOfTotal: totalClientsAll > 0 ? (clientCount / totalClientsAll) * 100 : 0,
        };
      });

      // Totals
      const totalClients = groups.reduce((sum, g) => sum + g.clientCount, 0);
      const totalRevenue = groups.reduce((sum, g) => sum + g.totalRevenue, 0);
      const overallLTV = totalClients > 0 ? totalRevenue / totalClients : 0;

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
      if (singleBuyers.clientCount > 0 && singleBuyers.avgProfit < 0) {
        insights.push(`Clientes de 1 compra não são lucrativos (lucro médio: ${formatBRL(singleBuyers.avgProfit)}) → melhorar pós-venda`);
      } else if (singleBuyers.clientCount > 0) {
        insights.push(`${singleBuyers.clientCount} pacientes compraram apenas 1 vez → ação de pós-venda necessária`);
      }

      const twoBuyers = groups[1];
      if (twoBuyers.clientCount > 0) {
        insights.push(`Clientes com 2 compras têm alto potencial de LTV → focar upsell (${twoBuyers.clientCount} pacientes)`);
      }

      const threePlus = groups.slice(2).reduce((sum, g) => sum + g.clientCount, 0);
      if (threePlus > 0) {
        const threePlusRevenue = groups.slice(2).reduce((sum, g) => sum + g.totalRevenue, 0);
        insights.push(`Grupo 3+ compras gera maior lucro → priorizar retenção (${threePlus} pacientes, ${formatBRL(threePlusRevenue)} em receita)`);
      }

      if (bestProfitGroup) {
        const best = activeGroups.find(g => g.label === bestProfitGroup);
        if (best) {
          insights.push(`Grupo mais lucrativo: ${best.label} com lucro médio de ${formatBRL(best.avgProfit)} por paciente`);
        }
      }

      // Break-even insight
      const breakEvenGroup = activeGroups.find(g => g.avgProfit > 0);
      if (breakEvenGroup && breakEvenGroup.minCount > 1) {
        insights.push(`O cliente precisa comprar pelo menos ${breakEvenGroup.minCount}x para dar lucro`);
      }

      return {
        groups,
        bestLTVGroup,
        bestProfitGroup,
        highCACGroup,
        growthPotentialGroup,
        insights,
        totalClients,
        totalRevenue,
        overallLTV,
        overallCAC: avgCACGlobal,
      };
    },
  });
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
