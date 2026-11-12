import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { describeError } from '@/lib/errors';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getNextRmktStage, getRmktPhase, RMKT_STAGES } from '@/types/remarketing';
import type { RemarketingEntry } from '@/types/remarketing';

export function useRemarketingEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['remarketing-entries'],
    queryFn: async (): Promise<RemarketingEntry[]> => {
      const { data, error } = await supabase
        .from('remarketing_entries')
        .select('*, lead:leads(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RemarketingEntry[];
    },
    // acesso aberto: sem login obrigatorio
  });
}

export function useEnterRemarketing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, originStatus }: { leadId: string; originStatus: string }) => {
      // Check if already active in RMKT
      const { data: existing } = await supabase
        .from('remarketing_entries')
        .select('id, current_stage')
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) return existing;

      // Check if has previous entry (for memory/return)
      const { data: previous } = await supabase
        .from('remarketing_entries')
        .select('current_stage, return_count')
        .eq('lead_id', leadId)
        .eq('is_active', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const resumeStage = previous?.current_stage || 'dia_1';
      const returnCount = (previous?.return_count || 0) + (previous ? 1 : 0);

      const { data, error } = await supabase
        .from('remarketing_entries')
        .insert({
          lead_id: leadId,
          current_stage: resumeStage,
          phase: getRmktPhase(resumeStage),
          origin_status: originStatus,
          return_count: returnCount,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update lead RMKT fields
      await supabase.from('leads').update({
        rmkt_status: 'ativo',
        rmkt_entered_at: new Date().toISOString(),
        rmkt_last_stage: resumeStage,
        rmkt_origin_status: originStatus,
      }).eq('id', leadId);

      // Log
      await supabase.from('remarketing_logs').insert({
        lead_id: leadId,
        action: previous ? 'reentrada' : 'entrada',
        to_stage: resumeStage,
        triggered_by: 'system',
      });

      return { ...data, resumed: !!previous, resumeStage } as any;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      if (result?.resumed) {
        const stageLabel = RMKT_STAGES.find(s => s.key === result.resumeStage)?.label || result.resumeStage;
        toast.success(`Lead retomado no Remarketing em ${stageLabel} (continuidade preservada)`);
      } else {
        toast.success('Lead enviado para Remarketing');
      }
    },
    onError: (e) => toast.error(`Não foi possível enviar para Remarketing. ${describeError(e)}`),
  });
}

export function useAdvanceRmktStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, leadId }: { entryId: string; leadId: string }) => {
      const { data: entry } = await supabase
        .from('remarketing_entries')
        .select('current_stage, last_advanced_at, entered_at')
        .eq('id', entryId)
        .single();

      if (!entry) throw new Error('Entrada não encontrada');

      const nextStage = getNextRmktStage(entry.current_stage);
      if (!nextStage) throw new Error('Último estágio alcançado');

      // Time-gate enforcement
      const curr = RMKT_STAGES.find(s => s.key === entry.current_stage);
      const next = RMKT_STAGES.find(s => s.key === nextStage);
      const requiredDays = curr && next ? Math.max(1, next.day - curr.day) : 0;
      const refTs = new Date(entry.last_advanced_at || entry.entered_at).getTime();
      const daysElapsed = Math.floor((Date.now() - refTs) / 86400000);
      if (daysElapsed < requiredDays) {
        throw new Error(`Aguarde ${requiredDays - daysElapsed} dia(s) para avançar`);
      }

      const { error } = await supabase
        .from('remarketing_entries')
        .update({
          current_stage: nextStage,
          phase: getRmktPhase(nextStage),
          last_advanced_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      await supabase.from('leads').update({
        rmkt_last_stage: nextStage,
        last_interaction_at: new Date().toISOString(),
      }).eq('id', leadId);

      await supabase.from('remarketing_logs').insert({
        lead_id: leadId,
        action: 'avanco',
        from_stage: entry.current_stage,
        to_stage: nextStage,
        triggered_by: 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead avançado no Remarketing');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao avançar'),
  });
}

export function useMoveRmktStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, leadId, targetStage }: { entryId: string; leadId: string; targetStage: string }) => {
      const { data: entry } = await supabase
        .from('remarketing_entries')
        .select('current_stage')
        .eq('id', entryId)
        .single();

      const { error } = await supabase
        .from('remarketing_entries')
        .update({
          current_stage: targetStage,
          phase: getRmktPhase(targetStage),
          last_advanced_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      await supabase.from('leads').update({ rmkt_last_stage: targetStage }).eq('id', leadId);

      await supabase.from('remarketing_logs').insert({
        lead_id: leadId,
        action: 'movimentacao_manual',
        from_stage: entry?.current_stage,
        to_stage: targetStage,
        triggered_by: 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
      toast.success('Lead movido');
    },
    onError: (e) => toast.error(`Não foi possível mover lead. ${describeError(e)}`),
  });
}

export function useReturnToComercial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, leadId, targetStatus = 'em_atendimento' }: { entryId: string; leadId: string; targetStatus?: string }) => {
      // Deactivate RMKT entry (preserve for memory)
      const { data: entry } = await supabase
        .from('remarketing_entries')
        .select('current_stage')
        .eq('id', entryId)
        .single();

      await supabase
        .from('remarketing_entries')
        .update({ is_active: false })
        .eq('id', entryId);

      // Update lead
      await supabase.from('leads').update({
        status: targetStatus as any,
        rmkt_status: 'inativo',
        stage_entered_at: new Date().toISOString(),
      }).eq('id', leadId);

      await supabase.from('remarketing_logs').insert({
        lead_id: leadId,
        action: 'retorno_comercial',
        from_stage: entry?.current_stage,
        to_stage: targetStatus,
        triggered_by: 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      toast.success('Lead retornado ao Comercial 1');
    },
    onError: (e) => toast.error(`Não foi possível retornar lead. ${describeError(e)}`),
  });
}

export function useExitRemarketing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, leadId }: { entryId: string; leadId: string }) => {
      await supabase
        .from('remarketing_entries')
        .update({ is_active: false })
        .eq('id', entryId);

      await supabase.from('leads').update({
        rmkt_status: 'inativo',
      }).eq('id', leadId);

      await supabase.from('remarketing_logs').insert({
        lead_id: leadId,
        action: 'saida_definitiva',
        triggered_by: 'system',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-entries'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead removido do Remarketing');
    },
    onError: (e) => toast.error(`Não foi possível remover do Remarketing. ${describeError(e)}`),
  });
}
