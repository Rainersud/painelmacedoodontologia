import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Score rules
const SCORE_RULES = {
  // Positive
  respondeu_mensagem: 15,
  clicou_whatsapp: 10,
  demonstrou_interesse: 20,
  solicitou_preco: 15,
  agendou_avaliacao: 30,
  compareceu: 40,
  // Negative
  nao_respondeu: -10,
  inativo_3_dias: -15,
  nao_compareceu: -25,
  sem_interesse: -40,
} as const;

// Score by source
const SOURCE_SCORE: Record<string, number> = {
  google_ads: 10,
  facebook: 10,
  instagram: 10,
  indicacao: 20,
  whatsapp: 5,
  telefone: 5,
  site: 5,
  outro: 5,
};

// Score by product
const PRODUCT_SCORE: Record<string, number> = {
  implante: 25,
  protese_total: 20,
  protese_flexivel: 20,
  estetica: 15,
};

export function getScoreCategory(score: number): 'frio' | 'morno' | 'quente' {
  if (score >= 71) return 'quente';
  if (score >= 31) return 'morno';
  return 'frio';
}

export function getScoreColor(category: string) {
  switch (category) {
    case 'quente': return { bg: 'bg-success/10', text: 'text-success', dot: '🟢' };
    case 'morno': return { bg: 'bg-warning/10', text: 'text-warning', dot: '🟡' };
    default: return { bg: 'bg-destructive/10', text: 'text-destructive', dot: '🔴' };
  }
}

export function calculateInitialScore(source: string, product?: string | null): number {
  let score = 50; // base
  score += SOURCE_SCORE[source] || 5;
  if (product) score += PRODUCT_SCORE[product] || 0;
  return Math.min(100, Math.max(0, score));
}

export function useUpdateLeadScore() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, action }: { leadId: string; action: keyof typeof SCORE_RULES }) => {
      const { data: lead } = await supabase
        .from('leads')
        .select('lead_score')
        .eq('id', leadId)
        .single();

      if (!lead) return;

      const currentScore = (lead as any).lead_score ?? 50;
      const delta = SCORE_RULES[action];
      const newScore = Math.min(100, Math.max(0, currentScore + delta));
      const category = getScoreCategory(newScore);

      await supabase
        .from('leads')
        .update({ lead_score: newScore, score_category: category } as any)
        .eq('id', leadId);

      return { newScore, category };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
    },
  });
}
