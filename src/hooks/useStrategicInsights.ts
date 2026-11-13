import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ARRIVAL_SOURCE_LABELS, TRAFFIC_CATEGORY, fetchMetricsData, inRange, investment, leadOrigin, newLeads, pct,
  projectByBusinessDays, revenueByAgent, roi, sales,
} from '@/lib/metrics';
import { usePeriodFilter, type PeriodRange } from '@/components/dashboard/PeriodFilterContext';
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
  leads: { id: string; name: string }[];
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

export function useStrategicInsights(rangeOverride?: PeriodRange) {
  const ctx = usePeriodFilter();
  const range = rangeOverride ?? ctx.range;
  const { data: kpis } = useDashboardKPIs();

  return useQuery({
    queryKey: ['strategic-insights', range.start.toISOString(), range.end.toISOString(), kpis?.taxaComparecimento.change],
    queryFn: async (): Promise<StrategicInsights> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      const period = { start: range.start, end: range.end };
      const [data, leadsRes, profilesRes] = await Promise.all([
        fetchMetricsData(period),
        supabase.from('leads').select('id, name, lead_arrival_source, status, loss_reason, treatment_value, created_at')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('profiles').select('user_id, full_name'),
      ]);

      const payments = data.payments.filter(p => p.status === 'pago' && inRange(p.paid_at, period));
      const leads = leadsRes.data || [];
      const profiles = profilesRes.data || [];

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || 'Sem nome']));

      // Ranking de vendedores: receita do dono do lead, vendas pela data do fechamento (regra única)
      const revByAgent = revenueByAgent(data.payments, data.leads, period);
      const sellerRanking: SellerRanking[] = Object.entries(revByAgent)
        .filter(([id]) => id !== 'sem_atendente')
        .map(([id, receita]) => ({ agentId: id, name: profileMap.get(id) || 'Sem nome', vendas: sales(data.leads, period, id).length, receita }))
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

      // Origens — campo oficial "Como o lead chegou?"; conversão = vendas ÷ novos leads
      const leadById = new Map(data.leads.map(l => [l.id, l]));
      const originAgg: Record<string, { count: number; converted: number; receita: number }> = {};
      const bucket = (k: string) => (originAgg[k] ??= { count: 0, converted: 0, receita: 0 });
      newLeads(data.leads, period).forEach(l => { bucket(leadOrigin(l)).count += 1; });
      sales(data.leads, period).forEach(l => { bucket(leadOrigin(l)).converted += 1; });
      payments.forEach(p => {
        const l = leadById.get(p.lead_id);
        bucket(l ? leadOrigin(l) : 'passou_na_frente').receita += Number(p.net_value || 0);
      });
      const trafficInv = investment(data.costs, period, data.calendar, [TRAFFIC_CATEGORY]);
      const paidCount = ['facebook', 'instagram', 'google'].reduce((s, k) => s + (originAgg[k]?.count ?? 0), 0);
      const origins: OriginBreakdown[] = Object.entries(originAgg).map(([source, v]) => {
        const inv = ['facebook', 'instagram', 'google'].includes(source) && paidCount ? trafficInv * (v.count / paidCount) : 0;
        return {
          source: ARRIVAL_SOURCE_LABELS[source] ?? source,
          count: v.count,
          conversao: Math.round(pct(v.converted, v.count)),
          receita: v.receita,
          roi: Math.round(roi(v.receita, inv)),
        };
      }).sort((a, b) => b.count - a.count);

      // Losses (categorias fixas + "Outros")
      const LOSS_CATEGORIES = ['Preço', 'Medo', 'Não tem cartão', 'Desistiu', 'Sumiu', 'Fechou no concorrente'];
      const normalize = (raw: string): string => {
        const t = raw.toLowerCase().trim();
        if (!t) return 'Outros';
        if (t === 'preço' || t.includes('preç') || t.includes('caro') || t === 'valor' || t.includes(' valor')) return 'Preço';
        if (t === 'medo' || t.includes('medo') || t.includes('insegur')) return 'Medo';
        if (t.includes('não tem cart') || t.includes('nao tem cart') || t.includes('sem cart')) return 'Não tem cartão';
        if (t === 'desistiu' || t.includes('desist')) return 'Desistiu';
        if (t === 'sumiu' || t.includes('sumi') || t.includes('não respond') || t.includes('sem resposta')) return 'Sumiu';
        if (t.includes('concorr') || t.includes('outra clíni')) return 'Fechou no concorrente';
        // Custom "Outro" text — preserve verbatim so it appears in the dashboard
        return raw.trim();
      };

      const lossAgg: Record<string, { count: number; valor: number; leads: { id: string; name: string }[] }> = {};
      LOSS_CATEGORIES.forEach(c => { lossAgg[c] = { count: 0, valor: 0, leads: [] }; });
      leads.filter(l => l.loss_reason && l.created_at >= startISO && l.created_at <= endISO).forEach(l => {
        const cat = normalize(l.loss_reason!);
        if (!lossAgg[cat]) lossAgg[cat] = { count: 0, valor: 0, leads: [] };
        lossAgg[cat].count += 1;
        lossAgg[cat].valor += Number(l.treatment_value || 0);
        lossAgg[cat].leads.push({ id: l.id, name: (l as any).name || 'Sem nome' });
      });
      const totalLoss = Object.values(lossAgg).reduce((s, v) => s + v.count, 0) || 1;
      const losses: LossReason[] = Object.entries(lossAgg)
        .map(([reason, v]) => ({ reason, count: v.count, pct: Math.round((v.count / totalLoss) * 100), valorPerdido: v.valor, leads: v.leads }))
        .sort((a, b) => b.count - a.count);


      // Previsão: mesma régua de dias úteis das Metas da clínica ("no ritmo atual, o mês fecha em")
      const totalReceita = payments.reduce((s, p) => s + Number(p.net_value || 0), 0);
      const forecast = projectByBusinessDays(totalReceita, period, data.calendar);

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
      if (losses.length > 0 && losses[0].count > 0) insights.push(`Principal motivo de perda: "${losses[0].reason}" (${losses[0].pct}% das perdas).`);

      return { sellerRanking, bestHours, bestDays, origins, losses, forecast, insights };
    },
    refetchInterval: 120000,
  });
}
