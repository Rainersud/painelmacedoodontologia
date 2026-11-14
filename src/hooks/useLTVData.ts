import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { buildPatients, type LtvOppRow, type LtvPaymentRow } from '@/lib/ltv';
import { useUpsellOpportunities } from './useUpsellOpportunities';

/** Todos os pagamentos (front e LTV): poucos, e o Financeiro compara os dois. */
export function usePaymentsForLTV() {
  return useQuery({
    queryKey: ['ltv-payments'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await allPages<LtvPaymentRow>(
        supabase.from('payments')
          .select('id, lead_id, upsell_opportunity_id, status, gross_value, net_value, paid_at, due_date, created_at, payment_method, installment_number, total_installments')
          .order('id'),
      );
      if (error) throw error;
      return data;
    },
  });
}

/** Pacientes do LTV já calculados (mesma base para pipeline, LTV Inteligente, Financeiro e metas). */
export function useLTVData() {
  const opps = useUpsellOpportunities();
  const pays = usePaymentsForLTV();
  const queryClient = useQueryClient();

  // Pagamento registrado ou card mudado em outra tela: atualiza na hora
  useEffect(() => {
    const ch = supabase
      .channel(`ltv-data-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ltv-payments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upsell_opportunities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['upsell-opportunities'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const patients = useMemo(
    () => buildPatients((opps.data ?? []) as unknown as LtvOppRow[], pays.data ?? []),
    [opps.data, pays.data],
  );
  return {
    patients,
    payments: pays.data ?? [],
    isLoading: opps.isLoading || pays.isLoading,
  };
}
