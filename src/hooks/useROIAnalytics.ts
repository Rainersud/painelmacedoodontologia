import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter, type PeriodRange } from '@/components/dashboard/PeriodFilterContext';
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
  leads: number;
  agendamentos: number;
  comparecimentos: number;
  ticketMedio: number;
  taxaFechamento: number;
  roas: number;
}

export interface ROIAnalytics {
  evolution: ROIPoint[];
  byOrigin: ROIByDimension[];
  byCampaign: ROIByDimension[];
  byAgent: ROIByDimension[];
}

const ARRIVAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  passou_na_frente: 'Passou na Frente',
  indicacao_pac: 'Indicação Pac',
  prospeccao_ativa: 'Prospecção Ativa',
  indicacao_parceria: 'Indicação de Parceria',
  social_selling: 'Social Selling',
};

export function useROIAnalytics(rangeOverride?: PeriodRange) {
  const ctx = usePeriodFilter();
  const range = rangeOverride ?? ctx.range;

  return useQuery({
    queryKey: ['roi-analytics', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<ROIAnalytics> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();
      const startDate = range.start.toISOString().split('T')[0];
      const endDate = range.end.toISOString().split('T')[0];

      const [paymentsRes, costsRes, leadsRes, adsRes, profilesRes, apptRes] = await Promise.all([
        supabase.from('payments').select('net_value, paid_at, lead_id, agent_id').eq('status', 'pago').gte('paid_at', startISO).lte('paid_at', endISO),
        supabase.from('acquisition_costs').select('amount, reference_month').gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('leads').select('id, source, lead_arrival_source, assigned_agent_id, status, created_at').gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('ad_creatives').select('name, platform, investment, revenue, sales').eq('is_active', true).gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('appointments').select('lead_id, scheduled_at, attended_at').gte('scheduled_at', startISO).lte('scheduled_at', endISO),
      ]);

      const payments = paymentsRes.data || [];
      const costs = costsRes.data || [];
      const leads = leadsRes.data || [];
      const ads = adsRes.data || [];
      const profiles = profilesRes.data || [];
      const appts = apptRes.data || [];

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

      // BY ORIGIN — uses lead_arrival_source as primary dimension
      const leadById = new Map(leads.map(l => [l.id, l]));
      const apptByLead = new Map<string, { scheduled: boolean; attended: boolean }>();
      appts.forEach(a => {
        if (!a.lead_id) return;
        const cur = apptByLead.get(a.lead_id) || { scheduled: false, attended: false };
        cur.scheduled = true;
        if (a.attended_at) cur.attended = true;
        apptByLead.set(a.lead_id, cur);
      });

      const originAgg: Record<string, { receita: number; vendas: Set<string>; leads: number; agendamentos: number; comparecimentos: number }> = {};
      const ensure = (k: string) => {
        if (!originAgg[k]) originAgg[k] = { receita: 0, vendas: new Set(), leads: 0, agendamentos: 0, comparecimentos: 0 };
        return originAgg[k];
      };

      // Count leads, agendamentos & comparecimentos by arrival source
      leads.forEach(l => {
        const src = (l as any).lead_arrival_source || 'passou_na_frente';
        const bucket = ensure(src);
        bucket.leads += 1;
        const a = apptByLead.get(l.id);
        if (a?.scheduled) bucket.agendamentos += 1;
        if (a?.attended) bucket.comparecimentos += 1;
      });

      // Revenue from payments → join via lead.lead_arrival_source
      payments.forEach(p => {
        const lead = p.lead_id ? leadById.get(p.lead_id) : null;
        const src = (lead as any)?.lead_arrival_source || 'passou_na_frente';
        const bucket = ensure(src);
        bucket.receita += p.net_value || 0;
        if (p.lead_id) bucket.vendas.add(p.lead_id);
      });

      const totalSrc = Object.keys(originAgg).length || 1;
      const byOrigin: ROIByDimension[] = Object.entries(originAgg).map(([key, v]) => {
        const inv = totalCosts / totalSrc;
        const vendas = v.vendas.size;
        const ticketMedio = vendas > 0 ? Math.round(v.receita / vendas) : 0;
        const taxaFechamento = v.comparecimentos > 0 ? Math.round((vendas / v.comparecimentos) * 100) : 0;
        const roas = inv > 0 ? parseFloat((v.receita / inv).toFixed(2)) : 0;
        return {
          name: ARRIVAL_LABELS[key] || key,
          receita: v.receita,
          investimento: Math.round(inv),
          roi: inv > 0 ? Math.round(((v.receita - inv) / inv) * 100) : 0,
          vendas,
          leads: v.leads,
          agendamentos: v.agendamentos,
          comparecimentos: v.comparecimentos,
          ticketMedio,
          taxaFechamento,
          roas,
        };
      }).sort((a, b) => b.roi - a.roi);

      // BY CAMPAIGN
      const byCampaign: ROIByDimension[] = ads.map(a => {
        const inv = Number(a.investment || 0);
        const rev = Number(a.revenue || 0);
        const vendas = a.sales || 0;
        return {
          name: a.name,
          receita: rev,
          investimento: inv,
          roi: inv > 0 ? Math.round(((rev - inv) / inv) * 100) : 0,
          vendas,
          leads: 0,
          agendamentos: 0,
          comparecimentos: 0,
          ticketMedio: vendas > 0 ? Math.round(rev / vendas) : 0,
          taxaFechamento: 0,
          roas: inv > 0 ? parseFloat((rev / inv).toFixed(2)) : 0,
        };
      }).sort((a, b) => b.roi - a.roi);

      // BY AGENT
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
        const vendas = v.vendas.size;
        return {
          name: profileMap.get(id) || 'Sem nome',
          receita: v.receita,
          investimento: Math.round(inv),
          roi: inv > 0 ? Math.round(((v.receita - inv) / inv) * 100) : 0,
          vendas,
          leads: 0,
          agendamentos: 0,
          comparecimentos: 0,
          ticketMedio: vendas > 0 ? Math.round(v.receita / vendas) : 0,
          taxaFechamento: 0,
          roas: inv > 0 ? parseFloat((v.receita / inv).toFixed(2)) : 0,
        };
      }).sort((a, b) => b.roi - a.roi);

      return { evolution, byOrigin, byCampaign, byAgent };
    },
    refetchInterval: 120000,
  });
}
