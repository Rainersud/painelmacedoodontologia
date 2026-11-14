import { buildPatients, summarize, type LtvOppRow, type LtvPaymentRow } from '@/lib/ltv';
import { useQuery } from '@tanstack/react-query';
import { allPages } from '@/lib/paging';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cac, fetchMetricsData, investment, roi, safeDiv, sales } from '@/lib/metrics';

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
  /** CAC do mês = investimento do mês ÷ vendas do mês (regra única) */
  cac: number;
  /** Faturamento de primeira compra (Comercial 1) */
  primeiraCompra: number;
  /** Faturamento de recompra (Comercial 2) */
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
      const { data: paidPayments } = await allPages(paidQuery.order('id'));

      // 2. Pending payments (faturamento futuro)
      const { data: pendingPayments } = await allPages(supabase
        .from('payments')
        .select('net_value, due_date, lead_id')
        .eq('status', 'pendente')
        .order('due_date', { ascending: true })
        .order('id'));

      // 3. Upsell opportunities for LTV funnel
      const { data: upsellOpps } = await allPages(supabase
        .from('upsell_opportunities')
        .select('id, lead_id, status, purchase_count, next_return_date, return_scheduled, contact_status, lead:leads(name, treatment_value, closed_at, sale_type)')
        .order('id'));
      const { data: ltvPays } = await allPages(supabase
        .from('payments')
        .select('lead_id, upsell_opportunity_id, status, gross_value, net_value, paid_at, due_date, created_at')
        .not('upsell_opportunity_id', 'is', null)
        .order('id'));
      // LTV pela definição única (lib/ltv): a mesma do Comercial 2 e das metas
      const ltvSummary = summarize(buildPatients(
        (upsellOpps || []) as unknown as LtvOppRow[],
        (ltvPays || []) as LtvPaymentRow[],
      ));

      // 4. Investimento e vendas pela camada única (mesmas regras do resto do painel)
      const now = new Date();
      const chartStart = startOfMonth(subMonths(now, 11));
      const kpiRange = dateRange ?? { start: new Date(2000, 0, 1), end: endOfMonth(now) };
      const span = { start: kpiRange.start < chartStart ? kpiRange.start : chartStart, end: endOfMonth(now) };
      const metrics = await fetchMetricsData(span);
      const totalCosts = investment(metrics.costs, kpiRange, metrics.calendar);
      const salesCount = sales(metrics.leads, kpiRange).length;

      // Calculate KPIs
      const faturamentoRecebido = (paidPayments || []).reduce((s, p) => s + Number(p.net_value || 0), 0);
      const faturamentoPrevisto = (pendingPayments || []).reduce((s, p) => s + Number(p.net_value || 0), 0);
      const cacMedio = cac(totalCosts, salesCount);

      const uniquePacientes = ltvSummary.patients;
      const ltvTotal = ltvSummary.totalRevenue;
      // Ticket médio pela regra única: faturamento ÷ vendas
      const ticketMedio = safeDiv(faturamentoRecebido, salesCount);

      const mediaCompras = ltvSummary.purchasesPerPatient || 1;

      const roiGeral = roi(faturamentoRecebido, totalCosts);

      // Monthly data for charts
      const monthlyMap: Record<string, MonthlyData> = {};
      for (let i = -11; i <= 0; i++) {
        const d = addMonths(now, i);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yy', { locale: ptBR });
        const mRange = { start: startOfMonth(d), end: endOfMonth(d) };
        monthlyMap[key] = {
          month: key, label, faturamentoReal: 0, faturamentoFuturo: 0, primeiraCompra: 0, ltv: 0,
          cac: Math.round(cac(investment(metrics.costs, mRange, metrics.calendar), sales(metrics.leads, mRange).length)),
        };
      }

      // Fill real revenue
      (paidPayments || []).forEach(p => {
        const dateStr = p.paid_at || p.created_at;
        const key = dateStr.substring(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].faturamentoReal += Number(p.net_value || 0);
          if (p.upsell_opportunity_id) {
            monthlyMap[key].ltv += Number(p.gross_value || 0);
          } else {
            monthlyMap[key].primeiraCompra += Number(p.net_value || 0);
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

      // Funil de LTV: front → LTV 1x … 5+ (mesmos grupos do LTV Inteligente)
      const ltvFunnel: LTVFunnelStage[] = ltvSummary.groups.map(g => ({
        label: g.label,
        count: g.patients,
        percent: g.share,
        progressionRate: g.stepConversion ?? 100,
      }));

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

      // LTV médio por etapa (front + LTV vendido ÷ pacientes da etapa)
      const ltvEvolution = ltvSummary.groups.map(g => ({ stage: g.short, value: g.avgLtv }));

      // Smart Alerts
      const alerts: BIAlert[] = [];
      
      // Check overdue payments
      const overdue = (pendingPayments || []).filter(p => {
        if (!p.due_date) return false;
        return new Date(p.due_date) < now;
      });
      if (overdue.length > 5) {
        alerts.push({ type: 'danger', icon: '', message: `${overdue.length} parcelas em atraso totalizando R$ ${overdue.reduce((s, p) => s + (p.net_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`});
      }

      // Revenue drop
      const currentMonth = format(now, 'yyyy-MM');
      const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
      const currentRev = monthlyMap[currentMonth]?.faturamentoReal || 0;
      const lastRev = monthlyMap[lastMonth]?.faturamentoReal || 0;
      if (lastRev > 0 && currentRev < lastRev * 0.7) {
        alerts.push({ type: 'warning', icon: '', message: `Faturamento caiu ${Math.round(((lastRev - currentRev) / lastRev) * 100)}% em relação ao mês anterior`});
      }

      // Low repurchase
      const singleBuyers = ltvSummary.groups[0]?.patients ?? 0;
      const totalBuyers = ltvSummary.patients;
      if (totalBuyers > 0 && (singleBuyers / totalBuyers) > 0.7) {
        alerts.push({ type: 'warning', icon: '', message: `${Math.round((singleBuyers / totalBuyers) * 100)}% dos pacientes ainda não compraram no LTV - ação de recompra necessária`});
      }

      // Low LTV
      if (ticketMedio < cacMedio && cacMedio > 0) {
        alerts.push({ type: 'danger', icon: '', message: `Ticket médio (R$ ${ticketMedio.toFixed(0)}) abaixo do CAC (R$ ${cacMedio.toFixed(0)}) - operação em prejuízo`});
      }

      // Concentration alert
      const maxMonth = monthlyData.reduce((max, m) => m.faturamentoFuturo > max.faturamentoFuturo ? m : max, monthlyData[0]);
      if (faturamentoPrevisto > 0 && maxMonth && (maxMonth.faturamentoFuturo / faturamentoPrevisto) > 0.4) {
        alerts.push({ type: 'info', icon: '', message: `${Math.round((maxMonth.faturamentoFuturo / faturamentoPrevisto) * 100)}% do faturamento futuro concentrado em ${maxMonth.label}`});
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
