// Programa de recompensas por indicação — regra única para a ficha de triagem e a aba Indicação.
// Níveis por quantidade de indicações; o prêmio é em reais (não há mais % sobre tratamento).
// O valor de cada prêmio fica em meta_settings (premio_indicacao_5 / _10 / _15) e o
// administrador edita na própria tela.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { describeError } from '@/lib/errors';

export interface RewardTier {
  count: 5 | 10 | 15;
  perks: string[];
  prizeKey: string;
  color: string;
  bg: string;
  border: string;
}

export const REWARD_TIERS: RewardTier[] = [
  {
    count: 5,
    perks: ['1 limpeza gratuita'],
    prizeKey: 'premio_indicacao_5',
    color: 'text-chart-2', bg: 'bg-chart-2/10', border: 'border-chart-2/30',
  },
  {
    count: 10,
    perks: ['1 limpeza gratuita', '1 clareamento de plaquinha'],
    prizeKey: 'premio_indicacao_10',
    color: 'text-chart-5', bg: 'bg-chart-5/10', border: 'border-chart-5/30',
  },
  {
    count: 15,
    perks: ['1 limpeza gratuita', '4 sessões de clareamento a laser'],
    prizeKey: 'premio_indicacao_15',
    color: 'text-warning-strong', bg: 'bg-warning/10', border: 'border-warning/30',
  },
];

/** Nível atingido (o maior desbloqueado) e o próximo. */
export function tierProgress(totalReferrals: number) {
  let current: RewardTier | null = null;
  for (const t of REWARD_TIERS) if (totalReferrals >= t.count) current = t;
  const next = REWARD_TIERS.find(t => totalReferrals < t.count) ?? null;
  return { current, next };
}

/** Soma dos prêmios de todos os níveis já desbloqueados. */
export function prizeEarned(totalReferrals: number, prizes: Record<string, number>) {
  return REWARD_TIERS.filter(t => totalReferrals >= t.count)
    .reduce((s, t) => s + (prizes[t.prizeKey] || 0), 0);
}

export const formatPrize = (v: number) =>
  v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'a definir';

export function useReferralPrizes() {
  return useQuery({
    queryKey: ['referral-prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_settings')
        .select('setting_key, setting_value')
        .in('setting_key', REWARD_TIERS.map(t => t.prizeKey));
      if (error) throw error;
      const out: Record<string, number> = {};
      (data ?? []).forEach(r => { out[r.setting_key] = Number(r.setting_value) || 0; });
      return out;
    },
    staleTime: 60_000,
  });
}

export function useSaveReferralPrize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { data: existing, error: readErr } = await supabase
        .from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
      if (readErr) throw readErr;
      const { error } = existing
        ? await supabase.from('meta_settings').update({ setting_value: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
        : await supabase.from('meta_settings').insert({ setting_key: key, setting_value: value, description: 'Prêmio em R$ do programa de indicação' });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['referral-prizes'] });
      toast.success('Prêmio salvo');
    },
    onError: (e) => toast.error(`O prêmio não foi salvo. ${describeError(e)}`),
  });
}
