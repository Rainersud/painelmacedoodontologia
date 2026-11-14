import { useQuery } from '@tanstack/react-query';
import { attendances, bookedAppointments, fetchMetricsData, inRange, leadOrigin, newLeads, sales } from '@/lib/metrics';
import { usePeriodFilter, type PeriodRange } from '@/components/dashboard/PeriodFilterContext';
import { supabase } from '@/integrations/supabase/client';

export const ARRIVAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  passou_na_frente: 'Passou na Frente',
  indicacao_pac: 'Indicação Pac',
  prospeccao_ativa: 'Prospecção Ativa',
  indicacao_parceria: 'Indicação de Parceria',
  social_selling: 'Social Selling',
};

/** Origens cobertas pelo card "Origens Estratégicas" */
export const STRATEGIC_ORIGINS = [
  'indicacao_pac',
  'prospeccao_ativa',
  'indicacao_parceria',
  'social_selling',
] as const;

export interface OriginRow {
  key: string;
  label: string;
  recebidos: number;
  agendados: number;
  compareceram: number;
  vendas: number;
  faturamento: number;
  taxaAgendamento: number; // %
  taxaFechamento: number;  // %
  ticketMedio: number;
}

export function useStrategicOrigins(rangeOverride?: PeriodRange) {
  const ctx = usePeriodFilter();
  const range = rangeOverride ?? ctx.range;

  return useQuery({
    queryKey: ['strategic-origins', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<OriginRow[]> => {
      // Regras únicas: agendado = marcado no período; vendas pela data do fechamento.
      const period = { start: range.start, end: range.end };
      const [data, { data: refs }] = await Promise.all([
        fetchMetricsData(period),
        supabase.from('referrals').select('referred_lead_id'),
      ]);
      // Quem foi cadastrado como indicado de um paciente conta como Indicação Pac,
      // mesmo sem o campo "Como o lead chegou?" preenchido (Comercial 1, CRC ou LTV).
      const referred = new Set((refs ?? []).map(r => r.referred_lead_id));
      const strategic = new Set<string>(STRATEGIC_ORIGINS);
      const originKey = (l: { id: string; lead_arrival_source?: string | null }) => {
        const o = leadOrigin(l);
        return !strategic.has(o) && referred.has(l.id) ? 'indicacao_pac' : o;
      };
      const leadById = new Map(data.leads.map(l => [l.id, l]));
      const originOf = (leadId?: string | null) => {
        const l = leadId ? leadById.get(leadId) : undefined;
        return l ? originKey(l) : 'passou_na_frente';
      };

      const allKeys = Object.keys(ARRIVAL_LABELS);
      const rows: OriginRow[] = allKeys.map(k => ({
        key: k,
        label: ARRIVAL_LABELS[k],
        recebidos: 0,
        agendados: 0,
        compareceram: 0,
        vendas: 0,
        faturamento: 0,
        taxaAgendamento: 0,
        taxaFechamento: 0,
        ticketMedio: 0,
      }));
      const rowMap = new Map(rows.map(r => [r.key, r]));

      newLeads(data.leads, period).forEach(l => { const r = rowMap.get(originKey(l)); if (r) r.recebidos += 1; });
      bookedAppointments(data.appointments, period).forEach(a => { const r = rowMap.get(originOf(a.lead_id)); if (r) r.agendados += 1; });
      attendances(data.appointments, period).forEach(a => { const r = rowMap.get(originOf(a.lead_id)); if (r) r.compareceram += 1; });
      sales(data.leads, period).forEach(l => { const r = rowMap.get(originKey(l)); if (r) r.vendas += 1; });
      data.payments.filter(p => p.status === 'pago' && inRange(p.paid_at, period)).forEach(p => {
        const r = rowMap.get(originOf(p.lead_id));
        if (r) r.faturamento += Number(p.net_value || 0);
      });

      rows.forEach(r => {
        r.taxaAgendamento = r.recebidos > 0 ? Math.round((r.agendados / r.recebidos) * 100) : 0;
        r.taxaFechamento = r.compareceram > 0 ? Math.round((r.vendas / r.compareceram) * 100) : 0;
        r.ticketMedio = r.vendas > 0 ? Math.round(r.faturamento / r.vendas) : 0;
      });

      return rows;
    },
    refetchInterval: 60000,
  });
}
