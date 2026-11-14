import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TABLES = ['leads', 'appointments', 'payments', 'referrals', 'upsell_opportunities', 'acquisition_costs', 'meta_settings'];

/**
 * Tempo real para as telas de gestão: qualquer mudança feita no Comercial 1, CRC ou
 * Comercial 2 (card do lead, consulta, pagamento, indicação) atualiza os números na hora.
 */
export function useLiveRefresh() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void queryClient.invalidateQueries(); }, 1500);
    };
    const channel = supabase.channel(`gestao-live-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
