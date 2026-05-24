import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';

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

export function useStrategicOrigins() {
  const { range } = usePeriodFilter();

  return useQuery({
    queryKey: ['strategic-origins', range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<OriginRow[]> => {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      const [leadsRes, apptsRes, paymentsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, lead_arrival_source, status, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('appointments')
          .select('lead_id, attended_at, scheduled_at')
          .gte('scheduled_at', startISO)
          .lte('scheduled_at', endISO),
        supabase
          .from('payments')
          .select('net_value, lead_id, paid_at')
          .eq('status', 'pago')
          .gte('paid_at', startISO)
          .lte('paid_at', endISO),
      ]);

      const leads = leadsRes.data || [];
      const appts = apptsRes.data || [];
      const payments = paymentsRes.data || [];

      const leadById = new Map(leads.map(l => [l.id, l]));
      const apptLeadIds = new Set(appts.map(a => a.lead_id).filter(Boolean));
      const attendedLeadIds = new Set(appts.filter(a => a.attended_at).map(a => a.lead_id).filter(Boolean));

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

      leads.forEach(l => {
        const k = (l as any).lead_arrival_source || 'passou_na_frente';
        const r = rowMap.get(k);
        if (!r) return;
        r.recebidos += 1;
        if (apptLeadIds.has(l.id)) r.agendados += 1;
        if (attendedLeadIds.has(l.id)) r.compareceram += 1;
      });

      payments.forEach(p => {
        if (!p.lead_id) return;
        const lead = leadById.get(p.lead_id);
        const k = (lead as any)?.lead_arrival_source || 'passou_na_frente';
        const r = rowMap.get(k);
        if (!r) return;
        r.faturamento += p.net_value || 0;
        r.vendas += 1;
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
