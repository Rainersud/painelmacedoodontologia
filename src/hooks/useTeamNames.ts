import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Perfil } from '@/lib/access';

export interface TeamMember { name: string; painel: string }

const PAINEL: Record<Perfil | 'admin', string> = {
  admin: 'Administrador',
  completo: 'Completo',
  atendimento: 'Atendimento',
  comparecimento: 'Comparecimento',
  pendente: 'Aguardando liberação',
};

/** Nome e painel de cada pessoa da equipe, para mostrar quem fez cada ação no lead. */
export function useTeamNames() {
  return useQuery({
    queryKey: ['team-names'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, TeamMember>> => {
      const [{ data: profiles }, { data: roles }, { data: accesses }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('user_roles').select('user_id, role'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
        (supabase as any).from('user_access').select('user_id, perfil') as Promise<{ data: { user_id: string; perfil: Perfil }[] | null }>,
      ]);
      const map: Record<string, TeamMember> = {};
      for (const p of profiles ?? []) {
        const isAdmin = (roles ?? []).some(r => r.user_id === p.user_id && r.role === 'admin');
        const perfil = (accesses ?? []).find(a => a.user_id === p.user_id)?.perfil ?? 'pendente';
        const first = (p.full_name || '').trim().split(/\s+/)[0] || 'Usuário';
        map[p.user_id] = {
          name: first.charAt(0).toUpperCase() + first.slice(1).toLowerCase(),
          painel: PAINEL[isAdmin ? 'admin' : perfil],
        };
      }
      return map;
    },
  });
}

/** Texto curto: "Lidiane · Comparecimento". Sem autor registrado (ações antigas, antes do login): null. */
export function authorLabel(map: Record<string, TeamMember> | undefined, userId: string | null | undefined): string | null {
  if (!userId) return null;
  const m = map?.[userId];
  return m ? `${m.name} · ${m.painel}` : 'Usuário removido';
}
