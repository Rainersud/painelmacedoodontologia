import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { isSoldStatus } from '@/lib/metrics/stages';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';

const LOST = new Set(['sem_interesse', 'descartados']);
const REFERRAL_ORIGINS = new Set(['indicacao_pac', 'indicacao_parceria']);

/**
 * Indicações abertas = pessoas indicadas que ainda não fecharam nem foram perdidas:
 * leads com origem de indicação ou vinculados a quem indicou, mais os nomes indicados
 * na triagem que ainda não viraram lead.
 */
export function useOpenReferralsCount() {
  return useQuery({
    queryKey: ['menu-open-referrals'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [leads, refs, triageRefs] = await Promise.all([
        allPages<{ id: string; status: string; lead_arrival_source: string | null }>(
          supabase.from('leads').select('id, status, lead_arrival_source').order('id'),
        ),
        allPages<{ referred_lead_id: string }>(supabase.from('referrals').select('referred_lead_id').order('id')),
        allPages<{ id: string }>(
          supabase.from('triage_referrals').select('id').is('converted_lead_id', null).order('id'),
        ),
      ]);
      for (const r of [leads, refs, triageRefs]) if (r.error) throw r.error;
      const referred = new Set(refs.data.map(r => r.referred_lead_id));
      const openLeads = leads.data.filter(l =>
        (REFERRAL_ORIGINS.has(l.lead_arrival_source ?? '') || referred.has(l.id) || l.status === 'indicacoes')
        && !isSoldStatus(l.status) && !LOST.has(l.status),
      ).length;
      return openLeads + triageRefs.data.length;
    },
  });
}

/** Contadores que aparecem como balãozinho no menu lateral, por endereço da tela. */
export function useMenuCounts(): Record<string, number> {
  const referrals = useOpenReferralsCount();
  const credit = useCreditApprovedPatients();
  return {
    '/indicacoes': referrals.data ?? 0,
    '/credito-liberado': credit.data?.length ?? 0,
  };
}
