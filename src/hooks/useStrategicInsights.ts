import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { useDashboardKPIs } from './useDashboardKPIs';

export interface SellerRanking {
  agentId: string;
  name: string;
  vendas: number;
  receita: number;
}

export interface OriginBreakdown {
  source: string;
  count: number;
  conversao: number;
  receita: number;
  roi: number;
}

export interface LossReason {
  reason: string;
  count: number;
  pct: number;
  valorPerdido: number;
}

export interface StrategicInsights {
  sellerRanking: SellerRanking[];
  bestHours: { hour: number; sales: number }[];
  bestDays: { day: string; sales: number }[];
  origins: OriginBreakdown[];
  losses: LossReason[];
  forecast: number; // projected month revenue
  insights: string[];
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function useStrategicInsights() {
  const { range } = usePeriodFilter();
  const { data: kpis } = useDashboardKPIs();

  return useQuery({
    queryKey: ['strategic-insights', range.start.toISOString(), range.end.toISOString(), kpis?.taxaComparecimento.change],
    queryFn: async (): Promise<StrategicInsights> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      const [paymentsRes, leadsRes, profilesRes, costsRes] = await Promise.all([
        supabase.from('payments').select('net_value, paid_at, lead_id, agent_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
        supabase.from('leads').select('id, source, status, loss_reason, treatment_value, created_at'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('acquisition_costs').select('amount').gte('reference_month', range.start.toISOString().split('T')[0]).lte('reference_month', range.end.toISOString().split('T')[0]),
      ]);

      const payments = paymentsRes.data || [];
      const leads = leadsRes.data || [];
      const profiles = profilesRes.data || [];
      const costs = costsRes.data || [];

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || 'Sem nome']));

      // Seller ranking
      const sellerAgg: Record<string, { vendas: Set<string>; receita: number }> = {};
      payments.forEach(p => {
        if (!p.agent_id) return;
        if (!sellerAgg[p.agent_id]) sellerAgg[p.agent_id] = { vendas: new Set(), receita: 0 };
        sellerAgg[p.agent_id].receita += p.net_value || 0;
        if (p.lead_id) sellerAgg[p.agent_id].vendas.add(p.lead_id);
      });
      const sellerRanking: SellerRanking[] = Object.entries(sellerAgg)
        .map(([id, v]) => ({ agentId: id, name: profileMap.get(id) || 'Sem nome', vendas: v.vendas.size, receita: v.receita }))
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 10);

      // Best hours / days (from payments paid_at)
      const hourAgg: Record<number, number> = {};
      const dayAgg: Record<number, number> = {};
      payments.forEach(p => {
        if (!p.paid_at) return;
        const d = new Date(p.paid_at);
        hourAgg[d.getHours()] = (hourAgg[d.getHours()] || 0) + 1;
        dayAgg[d.getDay()] = (dayAgg[d.getDay()] || 0) + 1;
      });
      const bestHours = Object.entries(hourAgg).map(([h, c]) => ({ hour: Number(h), sales: c })).sort((a, b) => b.sales - a.sales).slice(0, 5);
      const bestDays = Object.entries(dayAgg).map(([d, c]) => ({ day: dayNames[Number(d)], sales: c })).sort((a, b) => b.sales - a.sales);

      // Origins
      const totalInvestimento = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
      const leadsByPeriod = leads.filter(l => l.created_at >= startISO && l.created_at <= endISO);
      const originAgg: Record<string, { count: number; converted: number; receita: number }> = {};
      const paidLeadIds = new Set(payments.map(p => p.lead_id).filter(Boolean));
      leadsByPeriod.forEach(l => {
        const src = l.source || 'outro';
        if (!originAgg[src]) originAgg[src] = { count: 0, converted: 0, receita: 0 };
        originAgg[src].count += 1;
        if (paidLeadIds.has(l.id)) originAgg[src].converted += 1;
      });
      payments.forEach(p => {
        const lead = leads.find(l => l.id === p.lead_id);
        const src = lead?.source || 'outro';
        if (!originAgg[src]) originAgg[src] = { count: 0, converted: 0, receita: 0 };
        originAgg[src].receita += p.net_value || 0;
      });
      const totalOrigins = Object.keys(originAgg).length || 1;
      const origins: OriginBreakdown[] = Object.entries(originAgg).map(([source, v]) => {
        const inv = totalInvestimento / totalOrigins;
        return {
          source,
          count: v.count,
          conversao: v.count > 0 ? Math.round((v.converted / v.count) * 100) : 0,
          receita: v.receita,
          roi: inv > 0 ? Math.round(((v.receita - inv) / inv) * 100) : 0,
        };
      }).sort((a, b) => b.count - a.count);

      // Losses
      const lossAgg: Record<string, { count: number; valor: number }> = {};
      leads.filter(l => l.loss_reason && l.created_at >= startISO && l.created_at <= endISO).forEach(l => {
        const r = l.loss_reason!;
        if (!lossAgg[r]) lossAgg[r] = { count: 0, valor: 0 };
        lossAgg[r].count += 1;
        lossAgg[r].valor += Number(l.treatment_value || 0);
      });
      const totalLoss = Object.values(lossAgg).reduce((s, v) => s + v.count, 0) || 1;
      const losses: LossReason[] = Object.entries(lossAgg)
        .map(([reason, v]) => ({ reason, count: v.count, pct: Math.round((v.count / totalLoss) * 100), valorPerdido: v.valor }))
        .sort((a, b) => b.count - a.count);

      // Forecast (linear projection of current month revenue)
      const totalReceita = payments.reduce((s, p) => s + (p.net_value || 0), 0);
      const elapsedDays = Math.max(1, Math.ceil((Date.now() - range.start.getTime()) / (1000 * 60 * 60 * 24)));
      const totalDays = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)));
      const forecast = Math.round((totalReceita / elapsedDays) * totalDays);

      // Auto insights
      const insights: string[] = [];
      if (kpis) {
        if (kpis.taxaComparecimento.change <= -10) insights.push(`Sua taxa de comparecimento caiu ${Math.abs(kpis.taxaComparecimento.change)}% no período.`);
        if (kpis.taxaConversao.change >= 10) insights.push(`Taxa de conversão subiu ${kpis.taxaConversao.change}% — momento de escalar campanhas.`);
        if (kpis.roi.change <= -15) insights.push(`ROI caiu ${Math.abs(kpis.roi.change)}% — revise campanhas com pior performance.`);
      }
      if (origins.length > 0) {
        const top = origins[0];
        if (top.conversao >= 30) insights.push(`Leads de "${top.source}" convertem ${top.conversao}% — sua melhor fonte.`);
      }
      const profitableCampaigns = origins.filter(o => o.roi > 0).sort((a, b) => b.roi - a.roi);
      if (profitableCampaigns.length > 0) insights.push(`"${profitableCampaigns[0].source}" tem o melhor ROI (${profitableCampaigns[0].roi}%) atualmente.`);
      if (losses.length > 0) insights.push(`Principal motivo de perda: "${losses[0].reason}" (${losses[0].pct}% das perdas).`);

      return { sellerRanking, bestHours, bestDays, origins, losses, forecast, insights };
    },
    refetchInterval: 120000,
  });
}
