import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type BIPeriodFilter = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'todos';

export interface BIKPIs {
  faturamentoRecebido: number;
  faturamentoPrevisto: number;
  ltvTotal: number;
  ticketMedio: number;
  mediaComprasPaciente: number;
  totalPacientes: number;
  cacMedio: number;
  roiGeral: number;
}

export interface MonthlyData {
  month: string;
  label: string;
  faturamentoReal: number;
  faturamentoFuturo: number;
  cac: number;
  ltv: number;
}

export interface LTVFunnelStage {
  label: string;
  count: number;
  percent: number;
  progressionRate: number;
}

export interface BIAlert {
  type: 'danger' | 'warning' | 'info';
  icon: string;
  message: string;
}

export interface BIDashboardData {
  kpis: BIKPIs;
  monthlyData: MonthlyData[];
  ltvFunnel: LTVFunnelStage[];
  projection30: number;
  projection60: number;
  projection90: number;
  alerts: BIAlert[];
  ltvEvolution: { stage: string; value: number }[];
}

function getDateRange(period: BIPeriodFilter): { start: Date; end: Date } | null {
  const now = new Date();
  switch (period) {
    case 'mes':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'trimestre':
      return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
    case 'semestre':
      return { start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) };
    case 'ano':
      return { start: subMonths(startOfMonth(now), 11), end: endOfMonth(now) };
    case 'todos':
      return null;
  }
}

export function useBIDashboard(period: BIPeriodFilter = 'todos') {
  return useQuery({
    queryKey: ['bi-dashboard', period],
    queryFn: async (): Promise<BIDashboardData> => {
      const dateRange = getDateRange(period);

      // 1. Paid payments (faturamento recebido)
      let paidQuery = supabase
        .from('payments')
        .select('net_value, gross_value, paid_at, created_at, lead_id, upsell_opportunity_id')
        .eq('status', 'pago');
      if (dateRange) {
        paidQuery = paidQuery
          .gte('paid_at', dateRange.start.toISOString())
          .lte('paid_at', dateRange.end.toISOString());
      }
      const { data: paidPayments } = await paidQuery;

      // 2. Pending payments (faturamento futuro)
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('net_value, due_date, lead_id')
        .eq('status', 'pendente')
        .order('due_date', { ascending: true });

      // 3. Upsell opportunities for LTV funnel
      const { data: upsellOpps } = await supabase
        .from('upsell_opportunities')
        .select('lead_id, purchase_count, purchase_values, estimated_value, closed_value');

      // 4. Acquisition costs
      const { data: costsData } = await supabase
        .from('acquisition_costs')
        .select('amount');

      // 5. Closed leads count
      let closedQuery = supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('status', 'fechado');
      if (dateRange) {
        closedQuery = closedQuery
          .gte('closed_at', dateRange.start.toISOString())
          .lte('closed_at', dateRange.end.toISOString());
      }
      const { count: closedCount } = await closedQuery;

      // Calculate KPIs
      const faturamentoRecebido = (paidPayments || []).reduce((s, p) => s + (p.net_value || 0), 0);
      const faturamentoPrevisto = (pendingPayments || []).reduce((s, p) => s + (p.net_value || 0), 0);
      const totalCosts = (costsData || []).reduce((s, c) => s + Number(c.amount), 0);
      const totalPacientes = closedCount || 0;
      const cacMedio = totalPacientes > 0 ? totalCosts / totalPacientes : 0;

      // LTV from upsell purchase_values
      const leadLTV: Record<string, number> = {};
      const leadPurchaseCounts: Record<string, number> = {};
      (upsellOpps || []).forEach(o => {
        const count = Math.max(o.purchase_count || 1, 1);
        leadPurchaseCounts[o.lead_id] = Math.max(leadPurchaseCounts[o.lead_id] || 0, count);
        
        let ltvVal = 0;
        if (o.purchase_values) {
          try {
            const parsed = JSON.parse(o.purchase_values);
            if (Array.isArray(parsed)) {
              ltvVal = parsed
                .filter((p: any) => (p.value || 0) > 0 && p.payment_status === 'pago')
                .reduce((s: number, p: any) => s + (p.value || 0), 0);
            }
          } catch {
            const nums = o.purchase_values.split(';').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v) && v > 0);
            ltvVal = nums.reduce((s: number, v: number) => s + v, 0);
          }
        }
        leadLTV[o.lead_id] = (leadLTV[o.lead_id] || 0) + ltvVal;
      });

      // Also add paid payments from leads without upsell (first sale)
      const paymentsByLead: Record<string, number> = {};
      (paidPayments || []).forEach(p => {
        paymentsByLead[p.lead_id] = (paymentsByLead[p.lead_id] || 0) + (p.net_value || 0);
      });

      // Total LTV: max between upsell-tracked and payment-tracked per lead
      const allLeadIds = new Set([...Object.keys(leadLTV), ...Object.keys(paymentsByLead)]);
      let ltvTotal = 0;
      allLeadIds.forEach(id => {
        ltvTotal += Math.max(leadLTV[id] || 0, paymentsByLead[id] || 0);
      });

      const uniquePacientes = allLeadIds.size || 1;
      const ticketMedio = ltvTotal / uniquePacientes;

      const totalPurchases = Object.values(leadPurchaseCounts).reduce((s, c) => s + c, 0);
      const mediaCompras = Object.keys(leadPurchaseCounts).length > 0 
        ? totalPurchases / Object.keys(leadPurchaseCounts).length 
        : 1;

      const roiGeral = totalCosts > 0 ? ((faturamentoRecebido - totalCosts) / totalCosts) * 100 : 0;

      // Monthly data for charts
      const now = new Date();
      const monthlyMap: Record<string, MonthlyData> = {};
      for (let i = -11; i <= 0; i++) {
        const d = addMonths(now, i);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yy', { locale: ptBR });
        monthlyMap[key] = { month: key, label, faturamentoReal: 0, faturamentoFuturo: 0, cac: 0, ltv: 0 };
      }

      // Fill real revenue
      (paidPayments || []).forEach(p => {
        const dateStr = p.paid_at || p.created_at;
        const key = dateStr.substring(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].faturamentoReal += p.net_value || 0;
          if (p.upsell_opportunity_id) {
            monthlyMap[key].ltv += p.gross_value || 0;
          } else {
            monthlyMap[key].cac += p.net_value || 0;
          }
        }
      });

      // Fill future revenue
      (pendingPayments || []).forEach(p => {
        if (p.due_date) {
          const key = p.due_date.substring(0, 7);
          if (monthlyMap[key]) {
            monthlyMap[key].faturamentoFuturo += p.net_value || 0;
          }
        }
      });

      const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

      // LTV Funnel
      const stages = [
        { label: 'Comprou 1x', min: 1, max: 1 },
        { label: 'Comprou 2x', min: 2, max: 2 },
        { label: 'Comprou 3x', min: 3, max: 3 },
        { label: 'Comprou 4x', min: 4, max: 4 },
        { label: 'Comprou 5x+', min: 5, max: null },
      ];

      const ltvFunnel: LTVFunnelStage[] = stages.map((stage, idx) => {
        const count = Object.values(leadPurchaseCounts).filter(c => {
          if (stage.max === null) return c >= stage.min;
          return c >= stage.min && c <= stage.max;
        }).length;
        const totalInFunnel = Object.keys(leadPurchaseCounts).length || 1;
        const prevCount = idx === 0 ? totalInFunnel : 
          Object.values(leadPurchaseCounts).filter(c => c >= stages[idx - 1].min).length;
        const progressionRate = prevCount > 0 ? (count / prevCount) * 100 : 0;
        
        return {
          label: stage.label,
          count,
          percent: (count / totalInFunnel) * 100,
          progressionRate: idx === 0 ? 100 : progressionRate,
        };
      });

      // Projections
      const projection30 = (pendingPayments || []).filter(p => {
        if (!p.due_date) return false;
        const d = new Date(p.due_date);
        return d >= now && d <= addMonths(now, 1);
      }).reduce((s, p) => s + (p.net_value || 0), 0);

      const projection60 = (pendingPayments || []).filter(p => {
        if (!p.due_date) return false;
        const d = new Date(p.due_date);
        return d >= now && d <= addMonths(now, 2);
      }).reduce((s, p) => s + (p.net_value || 0), 0);

      const projection90 = (pendingPayments || []).filter(p => {
        if (!p.due_date) return false;
        const d = new Date(p.due_date);
        return d >= now && d <= addMonths(now, 3);
      }).reduce((s, p) => s + (p.net_value || 0), 0);

      // LTV evolution by purchase stage
      const ltvEvolution = stages.map(stage => {
        const leadsInStage = Object.entries(leadPurchaseCounts).filter(([, c]) => {
          if (stage.max === null) return c >= stage.min;
          return c >= stage.min && c <= stage.max;
        });
        const avgValue = leadsInStage.length > 0
          ? leadsInStage.reduce((s, [id]) => s + Math.max(leadLTV[id] || 0, paymentsByLead[id] || 0), 0) / leadsInStage.length
          : 0;
        return { stage: stage.label, value: avgValue };
      });

      // Smart Alerts
      const alerts: BIAlert[] = [];
      
      // Check overdue payments
      const overdue = (pendingPayments || []).filter(p => {
        if (!p.due_date) return false;
        return new Date(p.due_date) < now;
      });
      if (overdue.length > 5) {
        alerts.push({ type: 'danger', icon: '🔴', message: `${overdue.length} parcelas em atraso totalizando R$ ${overdue.reduce((s, p) => s + (p.net_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` });
      }

      // Revenue drop
      const currentMonth = format(now, 'yyyy-MM');
      const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
      const currentRev = monthlyMap[currentMonth]?.faturamentoReal || 0;
      const lastRev = monthlyMap[lastMonth]?.faturamentoReal || 0;
      if (lastRev > 0 && currentRev < lastRev * 0.7) {
        alerts.push({ type: 'warning', icon: '⚠️', message: `Faturamento caiu ${Math.round(((lastRev - currentRev) / lastRev) * 100)}% em relação ao mês anterior` });
      }

      // Low repurchase
      const singleBuyers = Object.values(leadPurchaseCounts).filter(c => c === 1).length;
      const totalBuyers = Object.keys(leadPurchaseCounts).length;
      if (totalBuyers > 0 && (singleBuyers / totalBuyers) > 0.7) {
        alerts.push({ type: 'warning', icon: '🔁', message: `${Math.round((singleBuyers / totalBuyers) * 100)}% dos pacientes compraram apenas 1 vez - ação de recompra necessária` });
      }

      // Low LTV
      if (ticketMedio < cacMedio && cacMedio > 0) {
        alerts.push({ type: 'danger', icon: '📉', message: `Ticket médio (R$ ${ticketMedio.toFixed(0)}) abaixo do CAC (R$ ${cacMedio.toFixed(0)}) - operação em prejuízo` });
      }

      // Concentration alert
      const maxMonth = monthlyData.reduce((max, m) => m.faturamentoFuturo > max.faturamentoFuturo ? m : max, monthlyData[0]);
      if (faturamentoPrevisto > 0 && maxMonth && (maxMonth.faturamentoFuturo / faturamentoPrevisto) > 0.4) {
        alerts.push({ type: 'info', icon: '📊', message: `${Math.round((maxMonth.faturamentoFuturo / faturamentoPrevisto) * 100)}% do faturamento futuro concentrado em ${maxMonth.label}` });
      }

      return {
        kpis: {
          faturamentoRecebido,
          faturamentoPrevisto,
          ltvTotal,
          ticketMedio,
          mediaComprasPaciente: mediaCompras,
          totalPacientes: uniquePacientes,
          cacMedio,
          roiGeral,
        },
        monthlyData,
        ltvFunnel,
        projection30,
        projection60,
        projection90,
        alerts,
        ltvEvolution,
      };
    },
  });
}
