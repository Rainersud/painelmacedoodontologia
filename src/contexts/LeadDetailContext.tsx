import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadDetailDialog } from '@/components/crm/LeadDetailDialog';
import type { Lead } from '@/types/crm';

interface LeadDetailApi {
  /** Abre a ficha completa (card raiz) do lead. Fechar volta para a tela em que estava. */
  openLead: (leadId: string) => void;
}

const Ctx = createContext<LeadDetailApi | null>(null);

/**
 * Ficha do lead única para o painel todo: qualquer tela abre o mesmo card raiz,
 * por cima do que está aberto, sem trocar de página.
 */
export function LeadDetailProvider({ children }: { children: ReactNode }) {
  const [leadId, setLeadId] = useState<string | null>(null);
  // Usa a lista já carregada pelas telas (sem buscar os 1.400 leads só por estar aqui)
  const queryClient = useQueryClient();
  const leads = leadId ? queryClient.getQueryData<Lead[]>(['crm-leads']) : undefined;
  const cached = leadId ? leads?.find(l => l.id === leadId) ?? null : null;

  // Lead que ainda não está na lista carregada: busca só ele
  const { data: fetched } = useQuery({
    queryKey: ['lead-detail', leadId],
    enabled: !!leadId && !cached,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId!).maybeSingle();
      if (error) throw error;
      return data as unknown as Lead | null;
    },
  });

  const openLead = useCallback((id: string) => setLeadId(id), []);
  const api = useMemo(() => ({ openLead }), [openLead]);
  const lead = cached ?? fetched ?? null;

  return (
    <Ctx.Provider value={api}>
      {children}
      <LeadDetailDialog lead={lead} open={!!leadId && !!lead} onOpenChange={o => { if (!o) setLeadId(null); }} />
    </Ctx.Provider>
  );
}

export function useOpenLead() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOpenLead fora do LeadDetailProvider');
  return ctx.openLead;
}
