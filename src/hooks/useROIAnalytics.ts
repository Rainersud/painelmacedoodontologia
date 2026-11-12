import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter, type PeriodRange } from '@/components/dashboard/PeriodFilterContext';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TRAFFIC_CATEGORY, attendances, bookedAppointments, closingRate, fetchMetricsData, inRange, investment,
  leadOrigin, newLeads, pct, revenue, revenueByAgent, roi, safeDiv, sales,
} from '@/lib/metrics';

/** Origens em que há investimento em anúncios. */
const PAID_ORIGINS = ['facebook', 'instagram', 'google'];

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
      const startDate = range.start.toISOString().split('T')[0];
      const endDate = range.end.toISOString().split('T')[0];

      const period = { start: range.start, end: range.end };
      const [data, adsRes, profilesRes] = await Promise.all([
        fetchMetricsData(period),
        supabase.from('ad_creatives').select('name, platform, investment, revenue, sales').eq('is_active', true).gte('reference_month', startDate).lte('reference_month', endDate),
        supabase.from('profiles').select('user_id, full_name'),
      ]);

      const { calendar, costs } = data;
      const payments = data.payments.filter(p => p.status === 'pago' && inRange(p.paid_at, period));
      const leads = newLeads(data.leads, period);
      const ads = adsRes.data || [];
      const profiles = profilesRes.data || [];

      const days = eachDayOfInterval({ start: range.start, end: range.end });
      const totalCosts = investment(costs, period, calendar);

      const evolution: ROIPoint[] = days.map(d => {
        const day = { start: startOfDay(d), end: endOfDay(d) };
        const dayRev = revenue(data.payments, day);
        const dayCost = investment(costs, day, calendar);
        return {
          date: format(d, 'dd/MM', { locale: ptBR }),
          receita: dayRev,
          investimento: dayCost,
          roi: Math.round(roi(dayRev, dayCost)),
        };
      });

      // POR ORIGEM — origem oficial (lead_arrival_source). Vendas e receita pela regra única.
      // O investimento em anúncios é dividido entre as origens pagas, na proporção dos leads.
      const leadById = new Map(data.leads.map(l => [l.id, l]));
      const booked = bookedAppointments(data.appointments, period);
      const attended = attendances(data.appointments, period);
      const originAgg: Record<string, { receita: number; vendas: number; leads: number; agendamentos: number; comparecimentos: number }> = {};
      const ensure = (k: string) => {
        if (!originAgg[k]) originAgg[k] = { receita: 0, vendas: 0, leads: 0, agendamentos: 0, comparecimentos: 0 };
        return originAgg[k];
      };
      const originOfLead = (id?: string | null) => {
        const l = id ? leadById.get(id) : undefined;
        return l ? leadOrigin(l) : 'passou_na_frente';
      };
      leads.forEach(l => { ensure(leadOrigin(l)).leads += 1; });
      booked.forEach(a => { ensure(originOfLead(a.lead_id)).agendamentos += 1; });
      attended.forEach(a => { ensure(originOfLead(a.lead_id)).comparecimentos += 1; });
      sales(data.leads, period).forEach(l => { ensure(leadOrigin(l)).vendas += 1; });
      payments.forEach(p => { ensure(originOfLead(p.lead_id)).receita += Number(p.net_value || 0); });

      const trafficCosts = investment(costs, period, calendar, [TRAFFIC_CATEGORY]);
      const paidLeads = PAID_ORIGINS.reduce((sum, k) => sum + (originAgg[k]?.leads ?? 0), 0);
      const byOrigin: ROIByDimension[] = Object.entries(originAgg).map(([key, v]) => {
        const inv = PAID_ORIGINS.includes(key) && paidLeads > 0 ? trafficCosts * (v.leads / paidLeads) : 0;
        return {
          name: ARRIVAL_LABELS[key] || key,
          receita: v.receita,
          investimento: Math.round(inv),
          roi: Math.round(roi(v.receita, inv)),
          vendas: v.vendas,
          leads: v.leads,
          agendamentos: v.agendamentos,
          comparecimentos: v.comparecimentos,
          ticketMedio: Math.round(safeDiv(v.receita, v.vendas)),
          taxaFechamento: Math.round(pct(v.vendas, v.comparecimentos)),
          roas: parseFloat(safeDiv(v.receita, inv).toFixed(2)),
        };
      }).sort((a, b) => b.receita - a.receita);

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

      // POR ATENDENTE — receita do dono do lead (regra única)
      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]));
      const revByAgent = revenueByAgent(data.payments, data.leads, period);
      const agentIds = Object.keys(revByAgent).filter(id => id !== 'sem_atendente');
      const totalAgents = agentIds.length || 1;
      const byAgent: ROIByDimension[] = agentIds.map(id => {
        const inv = totalCosts / totalAgents;
        const receita = revByAgent[id];
        const vendas = sales(data.leads, period, id).length;
        return {
          name: profileMap.get(id) || 'Sem nome',
          receita,
          investimento: Math.round(inv),
          roi: Math.round(roi(receita, inv)),
          vendas,
          leads: newLeads(data.leads, period, id).length,
          agendamentos: bookedAppointments(data.appointments, period, id).length,
          comparecimentos: attendances(data.appointments, period, id).length,
          ticketMedio: Math.round(safeDiv(receita, vendas)),
          taxaFechamento: Math.round(closingRate(data.leads, data.appointments, period, id)),
          roas: parseFloat(safeDiv(receita, inv).toFixed(2)),
        };
      }).sort((a, b) => b.receita - a.receita);

      return { evolution, byOrigin, byCampaign, byAgent };
    },
    refetchInterval: 120000,
  });
}
