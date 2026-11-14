import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { isSoldStatus } from '@/lib/metrics/stages';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';
import { useDueReturns } from '@/components/crm/ReturnColumn';

const LOST = new Set(['sem_interesse', 'descartados']);
const REFERRAL_ORIGINS = new Set(['indicacao_pac', 'indicacao_parceria']);

export interface OpenReferral {
  id: string;
  /** lead = já é lead no CRM; triagem = nome indicado na triagem que ainda não virou lead. */
  kind: 'lead' | 'triagem';
  name: string;
  phone: string | null;
  status: string | null;
  /** Lead para abrir: o próprio indicado, ou quem indicou (triagem). */
  leadId: string | null;
  referrerName: string | null;
  createdAt: string;
}

/**
 * Indicações abertas = pessoas indicadas que ainda não fecharam nem foram perdidas:
 * leads com origem de indicação ou vinculados a quem indicou, mais os nomes indicados
 * na triagem que ainda não viraram lead. A mesma lista aparece na tela de Indicações.
 */
export function useOpenReferrals() {
  return useQuery({
    queryKey: ['menu-open-referrals'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<OpenReferral[]> => {
      type L = { id: string; name: string; phone: string | null; status: string; lead_arrival_source: string | null; created_at: string };
      const [leads, refs, triageRefs] = await Promise.all([
        allPages<L>(supabase.from('leads').select('id, name, phone, status, lead_arrival_source, created_at').order('id')),
        allPages<{ referred_lead_id: string; referrer_lead_id: string }>(
          supabase.from('referrals').select('referred_lead_id, referrer_lead_id').order('id'),
        ),
        allPages<{ id: string; referral_name: string; phone: string | null; lead_id: string | null; created_at: string }>(
          supabase.from('triage_referrals').select('id, referral_name, phone, lead_id, created_at').is('converted_lead_id', null).order('id'),
        ),
      ]);
      for (const r of [leads, refs, triageRefs]) if (r.error) throw r.error;
      const nameById = new Map(leads.data.map(l => [l.id, l.name]));
      const referrerOf = new Map(refs.data.map(r => [r.referred_lead_id, r.referrer_lead_id]));
      const fromLeads: OpenReferral[] = leads.data
        .filter(l =>
          (REFERRAL_ORIGINS.has(l.lead_arrival_source ?? '') || referrerOf.has(l.id) || l.status === 'indicacoes')
          && !isSoldStatus(l.status) && !LOST.has(l.status))
        .map(l => ({
          id: l.id, kind: 'lead', name: l.name.trim(), phone: l.phone, status: l.status, leadId: l.id,
          referrerName: nameById.get(referrerOf.get(l.id) ?? '') ?? null, createdAt: l.created_at,
        }));
      const fromTriage: OpenReferral[] = triageRefs.data.map(t => ({
        id: t.id, kind: 'triagem', name: t.referral_name, phone: t.phone, status: null, leadId: t.lead_id,
        referrerName: t.lead_id ? nameById.get(t.lead_id) ?? null : null, createdAt: t.created_at,
      }));
      return [...fromLeads, ...fromTriage].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  });
}

export function useOpenReferralsCount() {
  const q = useOpenReferrals();
  return { ...q, data: q.data?.length };
}

/** Contadores que aparecem como balãozinho no menu lateral, por endereço da tela. */
export function useMenuCounts(): Record<string, number> {
  const referrals = useOpenReferralsCount();
  const credit = useCreditApprovedPatients();
  const { due } = useDueReturns();
  const indicacoes = referrals.data ?? 0;
  const credito = credit.data?.length ?? 0;
  return {
    '/indicacoes': indicacoes,
    '/credito-liberado': credito,
    '/retorno': due.length,
    // Retorno, Indicações e Crédito Liberado ficam dentro do CRC: o balão do menu soma os três
    '/crc': due.length + indicacoes + credito,
  };
}
