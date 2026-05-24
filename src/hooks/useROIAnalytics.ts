import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ROIPoint {
  date: string;
  receita: number;
  investimento: number;
  roi: number;
}

export interface ROIByDimension {
  name: string;
  receita: number;
  investimento: number;
  roi: number;
  vendas: number;
  leads?: number;
  agendamentos?: number;
  comparecimentos?: number;
  ticketMedio?: number;
  taxaFechamento?: number;
  roas?: number;
}

export interface ROIAnalytics {
  evolution: ROIPoint[];
  byOrigin: ROIByDimension[];
  byCampaign: ROIByDimension[];
  byAgent: ROIByDimension[];
}

export function useROIAnalytics() {
  const { range } = usePeriodFilter();

  return useQuery({
    queryKey: ['roi-analytics', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<ROIAnalytics> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();
      const startDate = range.start.toISOString().split('T')[0];
      const endDate = range.end.toISOString().split('T')[0];

      const [paymentsRes, costsRes, leadsRes, adsRes, profilesRes] = await Promise.all([
        supabase.from('payments').select('net_value, paid_at, lead_id, agent_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
        supabase.from('acquisition_costs').select('amount, reference_month').gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('leads').select('id, source, assigned_agent_id'),
        supabase.from('ad_creatives').select('name, platform, investment, revenue, sales').eq('is_active', true).gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('profiles').select('user_id, full_name'),
      ]);

      const payments = paymentsRes.data || [];
      const costs = costsRes.data || [];
      const leads = leadsRes.data || [];
      const ads = adsRes.data || [];
      const profiles = profilesRes.data || [];

      // Evolution by day
      const days = eachDayOfInterval({ start: range.start, end: range.end });
      const totalCosts = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
      const dailyCost = days.length > 0 ? totalCosts / days.length : 0;

      const evolution: ROIPoint[] = days.map(d => {
        const ds = startOfDay(d).toISOString();
        const de = endOfDay(d).toISOString();
        const dayRev = payments.filter(p => p.paid_at && p.paid_at >= ds && p.paid_at <= de).reduce((s, p) => s + (p.net_value || 0), 0);
        return {
          date: format(d, 'dd/MM', { locale: ptBR }),
          receita: dayRev,
          investimento: dailyCost,
          roi: dailyCost > 0 ? Math.round(((dayRev - dailyCost) / dailyCost) * 100) : 0,
        };
      });

      // By origin (source)
      const leadById = new Map(leads.map(l => [l.id, l]));
      const originAgg: Record<string, { receita: number; vendas: Set<string> }> = {};
      payments.forEach(p => {
        const lead = p.lead_id ? leadById.get(p.lead_id) : null;
        const src = lead?.source || 'outro';
        if (!originAgg[src]) originAgg[src] = { receita: 0, vendas: new Set() };
        originAgg[src].receita += p.net_value || 0;
        if (p.lead_id) originAgg[src].vendas.add(p.lead_id);
      });
      const totalSrc = Object.keys(originAgg).length || 1;
      const byOrigin: ROIByDimension[] = Object.entries(originAgg).map(([name, v]) => {
        const inv = totalCosts / totalSrc;
        return {
          name,
          receita: v.receita,
          investimento: Math.round(inv),
          roi: inv > 0 ? Math.round(((v.receita - inv) / inv) * 100) : 0,
          vendas: v.vendas.size,
        };
      }).sort((a, b) => b.roi - a.roi);

      // By campaign (ad_creatives)
      const byCampaign: ROIByDimension[] = ads.map(a => ({
        name: a.name,
        receita: Number(a.revenue || 0),
        investimento: Number(a.investment || 0),
        roi: a.investment > 0 ? Math.round(((Number(a.revenue) - Number(a.investment)) / Number(a.investment)) * 100) : 0,
        vendas: a.sales || 0,
      })).sort((a, b) => b.roi - a.roi);

      // By agent
      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
      const agentAgg: Record<string, { receita: number; vendas: Set<string> }> = {};
      payments.forEach(p => {
        if (!p.agent_id) return;
        if (!agentAgg[p.agent_id]) agentAgg[p.agent_id] = { receita: 0, vendas: new Set() };
        agentAgg[p.agent_id].receita += p.net_value || 0;
        if (p.lead_id) agentAgg[p.agent_id].vendas.add(p.lead_id);
      });
      const totalAgents = Object.keys(agentAgg).length || 1;
      const byAgent: ROIByDimension[] = Object.entries(agentAgg).map(([id, v]) => {
        const inv = totalCosts / totalAgents;
        return {
          name: profileMap.get(id) || 'Sem nome',
          receita: v.receita,
          investimento: Math.round(inv),
          roi: inv > 0 ? Math.round(((v.receita - inv) / inv) * 100) : 0,
          vendas: v.vendas.size,
        };
      }).sort((a, b) => b.roi - a.roi);

      return { evolution, byOrigin, byCampaign, byAgent };
    },
    refetchInterval: 120000,
  });
}
