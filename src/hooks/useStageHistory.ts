import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StageHistoryEntry {
  id: string;
  lead_id: string;
  stage: string;
  entered_at: string;
  exited_at: string | null;
  duration_seconds: number | null;
}

export function useStageHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ['stage-history', leadId],
    queryFn: async (): Promise<StageHistoryEntry[]> => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('entered_at', { ascending: true });
      if (error) throw error;
      return (data || []) as StageHistoryEntry[];
    },
    enabled: !!leadId,
  });
}

/**
 * Records a stage transition: closes the previous stage entry and opens a new one.
 */
export async function recordStageTransition(leadId: string, oldStage: string, newStage: string) {
  const now = new Date().toISOString();

  // Close previous stage entry
  const { data: openEntry } = await supabase
    .from('lead_stage_history')
    .select('id, entered_at')
    .eq('lead_id', leadId)
    .eq('stage', oldStage)
    .is('exited_at', null)
    .order('entered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openEntry) {
    const durationMs = new Date(now).getTime() - new Date(openEntry.entered_at).getTime();
    await supabase
      .from('lead_stage_history')
      .update({
        exited_at: now,
        duration_seconds: Math.floor(durationMs / 1000),
      })
      .eq('id', openEntry.id);
  }

  // Open new stage entry
  await supabase
    .from('lead_stage_history')
    .insert({
      lead_id: leadId,
      stage: newStage,
      entered_at: now,
    });
}
