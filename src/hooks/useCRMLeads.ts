import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Lead, LeadStatus, LeadSource } from '@/types/crm';
import { recordStageTransition } from './useStageHistory';
import { getNextRmktStage, getRmktPhase } from '@/types/remarketing';
import { describeError } from '@/lib/errors';
import type { Database } from '@/integrations/supabase/types';
import { refreshBusinessData } from '@/lib/refresh';
import { isSoldStatus } from '@/lib/metrics/stages';

export function useCRMLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-leads'],
    queryFn: async (): Promise<Lead[]> => {
      // Todos os leads, em páginas de 1.000 (o banco corta cada consulta em 1.000 linhas;
      // o .limit(5000) antigo não passava desse teto e o funil escondia leads antigos).
      const PAGE = 1000;
      const data: Database['public']['Tables']['leads']['Row'][] = [];
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase
          .from('leads')
          .select('*')
          .order('updated_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        data.push(...(page ?? []));
        if (!page || page.length < PAGE) break;
      }

      // Fetch agent names
      const agentIds = [...new Set(data?.map(l => l.assigned_agent_id).filter(Boolean))];
      let agentMap: Record<string, string> = {};
      
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds as string[]); // poucos atendentes: cabe na URL
        
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      // Retornos pendentes: busca pelos status (e não por milhares de IDs na URL,
      // que estourava o tamanho do endereço e falhava sem aviso)
      const taskMap: Record<string, boolean> = {};
      for (let from = 0; ; from += PAGE) {
        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select('lead_id')
          .in('status', ['pendente', 'reagendado'])
          .not('lead_id', 'is', null)
          .range(from, from + PAGE - 1);
        if (taskError) { console.warn('Retornos pendentes não carregaram:', taskError); break; }
        (tasks ?? []).forEach(t => { if (t.lead_id) taskMap[t.lead_id] = true; });
        if (!tasks || tasks.length < PAGE) break;
      }

      return (data || []).map(lead => ({
        ...lead,
        status: lead.status as LeadStatus,
        source: lead.source as LeadSource,
        attendance_discount_status: lead.attendance_discount_status as Lead['attendance_discount_status'],
        discount_percentage: lead.discount_percentage as number ?? 5,
        no_show_count: (lead as any).no_show_count ?? 0,
        sale_type: (lead as any).sale_type as Lead['sale_type'],
        loss_reason: (lead as any).loss_reason || null,
        lead_score: (lead as any).lead_score ?? 50,
        score_category: ((lead as any).score_category || 'morno') as Lead['score_category'],
        contact_attempts: (lead as any).contact_attempts ?? 0,
        profiles: lead.assigned_agent_id ? { full_name: agentMap[lead.assigned_agent_id] || 'Sem agente' } : null,
        tasks: taskMap[lead.id] ? [{ id: 'has-task' } as any] : [],
      }));
    },
    // acesso aberto: sem login obrigatorio
  });
}

export function useUpdateLeadStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      newStatus,
      additionalData,
    }: {
      leadId: string;
      newStatus: LeadStatus;
      additionalData?: Partial<Lead>;
      /** sem mensagem de sucesso (quem chamou mostra a sua) */
      silent?: boolean;
    }) => {
      // Status anterior (para histórico) — se a leitura falhar, não dá para continuar com segurança
      const { data: oldLead, error: oldLeadError } = await supabase
        .from('leads')
        .select('status, name, closed_at, no_show_count')
        .eq('id', leadId)
        .maybeSingle();
      if (oldLeadError) throw oldLeadError;
      if (!oldLead) throw new Error('Lead não encontrado. Ele pode ter sido excluído.');

      // Efeitos que só rodam DEPOIS de o lead ser salvo (evita agendamento/alerta duplicado
      // quando o salvamento falha e a pessoa tenta de novo).
      const afterSave: Array<() => PromiseLike<unknown>> = [];

      const updates: Record<string, unknown> = { 
        status: newStatus,
        stage_entered_at: new Date().toISOString(),
        ...additionalData,
      };
      
      // Map concluido/tratamento_andamento to fechado (Venda Realizada is the single final stage)
      if (newStatus === 'concluido' || newStatus === 'tratamento_andamento') {
        updates.status = 'fechado';
      }

      // Add timestamp fields based on status
      const effectiveStatus = (updates.status as string) || newStatus;
      if (effectiveStatus === 'resgatado') {
        updates.rescued_at = new Date().toISOString();
      } else if (effectiveStatus === 'fechado') {
        // A data da venda é a do primeiro fechamento; mexer depois não muda o mês da venda
        if (!(oldLead as { closed_at?: string | null }).closed_at || !isSoldStatus(oldLead.status)) {
          updates.closed_at = new Date().toISOString();
        }
        updates.completed_at = new Date().toISOString();
      } else if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        if (!additionalData?.scheduled_appointment_at) {
          updates.scheduled_appointment_at = new Date().toISOString();
        }
      }

      // Handle attendance discount for ALL leads
      if (newStatus === 'compareceu') {
        updates.attendance_discount_status = 'liberado';

        // Desconto da indicação (depois de salvar o lead)
        afterSave.push(async () => {
          const { data: refData } = await supabase
            .from('referrals')
            .update({ attendance_discount_applied: true })
            .eq('referred_lead_id', leadId)
            .eq('attendance_discount_eligible', true)
            .select('referrer_lead_id');
          if (refData?.length) {
            const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', refData[0].referrer_lead_id).maybeSingle();
            await supabase.from('alerts').insert({
              type: 'indicacao_compareceu' as any,
              title: 'Indicação compareceu!',
              message: `${oldLead?.name || 'Paciente'} (indicado por ${referrerLead?.name || 'você'}) compareceu à consulta. Desconto de 5% aplicado!`,
              user_id: null,
              lead_id: leadId,
            });
          }
        });
      } else if (newStatus === 'faltou') {
        updates.attendance_discount_status = 'cancelado';
        updates.discount_percentage = 0;

        // Conta mais uma falta (só se ainda não estava em "faltou")
        updates.no_show_count = ((oldLead as { no_show_count?: number }).no_show_count || 0) + (oldLead.status === 'faltou' ? 0 : 1);

        afterSave.push(() => supabase
          .from('referrals')
          .update({ attendance_discount_eligible: false, attendance_discount_applied: false })
          .eq('referred_lead_id', leadId));
      }

      // Bonificação de indicação (depois de salvar o lead)
      afterSave.push(async () => {
        if (newStatus === 'tratamento_andamento' || newStatus === 'fechado' || newStatus === 'concluido') {
          const { data: refConvert } = await supabase
            .from('referrals')
            .select('id, referrer_lead_id, reward_type, reward_value')
            .eq('referred_lead_id', leadId);
        
          if (refConvert?.length ) {
            const ref = refConvert[0];
            const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', ref.referrer_lead_id).maybeSingle();
          
            if (newStatus === 'fechado' || newStatus === 'concluido') {
              const rewardText = ref.reward_type === 'dinheiro' 
                ? `R$${ref.reward_value} em dinheiro` 
                : `R$${ref.reward_value} em crédito`;
              await supabase.from('alerts').insert({
                type: 'indicacao_converteu' as any,
                title: 'Indicação convertida!',
                message: `${oldLead?.name || 'Paciente'} (indicado por ${referrerLead?.name || 'indicador'}) fechou tratamento!\n\nBonificação disponível para pagamento\nValor: ${rewardText}`,
                user_id: null,
                lead_id: leadId,
              });
            }

            if (newStatus === 'tratamento_andamento') {
              const rewardText = ref.reward_type === 'dinheiro' 
                ? `R$${ref.reward_value} em dinheiro` 
                : `R$${ref.reward_value} em crédito`;
              await supabase.from('alerts').insert({
                type: 'indicacao_converteu' as any,
                title: 'Bonificação liberada!',
                message: `${oldLead?.name || 'Paciente'} iniciou tratamento. Bonificação de ${rewardText} liberada para ${referrerLead?.name || 'indicador'}.`,
                user_id: null,
                lead_id: leadId,
              });
            }
          }
        }
      });

      // Touch interaction timestamp at the last follow-up
      if (newStatus === 'followup_14') {
        updates.last_interaction_at = new Date().toISOString();
      }

      // If lead was in RMKT and gets scheduled (agendou), exit RMKT
      if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        afterSave.push(() => supabase.from('remarketing_entries')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true));
        updates.rmkt_status = 'inativo';
      }

      // If lead reaches fechado, exit RMKT definitively
      if (effectiveStatus === 'fechado') {
        afterSave.push(() => supabase.from('remarketing_entries')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true));
        updates.rmkt_status = 'inativo';
      }

      // If lead faltou (no-show), return to RMKT at last position
      if (newStatus === 'faltou' || newStatus === 'nao_compareceu') {
        const { data: lastRmkt } = await supabase
          .from('remarketing_entries')
          .select('current_stage')
          .eq('lead_id', leadId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastRmkt) {
          afterSave.push(() => supabase.from('remarketing_entries').insert({
            lead_id: leadId,
            current_stage: lastRmkt.current_stage,
            phase: getRmktPhase(lastRmkt.current_stage),
            origin_status: newStatus,
            is_active: true,
          }));
          updates.rmkt_status = 'ativo';
          updates.rmkt_last_stage = lastRmkt.current_stage;
        }
      }

      // Auto-create appointment when moving to agendou
      if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        const scheduledAt = (additionalData?.scheduled_appointment_at as string) || new Date().toISOString();
        afterSave.push(() => supabase.from('appointments').insert({
          lead_id: leadId,
          agent_id: user?.id ?? null,
          scheduled_at: scheduledAt,
          notes: `Agendamento criado automaticamente via funil`,
        }));
      }

      // 1) Salva o lead. Se falhar, nada mais é feito.
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      // 2) Efeitos ligados à nova etapa. Uma falha aqui não desfaz o status já salvo,
      //    mas é avisada para a pessoa conferir.
      const sideErrors: string[] = [];
      for (const run of afterSave) {
        try {
          const res = await run() as { error?: unknown } | undefined;
          if (res && res.error) sideErrors.push(describeError(res.error));
        } catch (e) {
          sideErrors.push(describeError(e));
        }
      }
      if (sideErrors.length) {
        toast.warning(`Status salvo, mas uma etapa automática falhou: ${sideErrors[0]}`);
      }

      // Record stage history
      if (oldLead && oldLead.status !== newStatus) {
        await recordStageTransition(leadId, oldLead.status, newStatus);
      }

      // Log activity (non-blocking)
      if (oldLead) {
        supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user?.id ?? null,
          activity_type: 'status_changed',
          title: `Status alterado: ${oldLead.name}`,
          old_value: oldLead.status,
          new_value: newStatus,
        }).then(({ error: logError }) => {
          if (logError) console.warn('Activity log failed:', logError);
        });
      }
    },
    onMutate: async ({ leadId, newStatus, additionalData }) => {
      await queryClient.cancelQueries({ queryKey: ['crm-leads'] });

      const previousLeads = queryClient.getQueryData<Lead[]>(['crm-leads']);
      const now = new Date().toISOString();
      const effectiveStatus = (newStatus === 'concluido' || newStatus === 'tratamento_andamento') ? 'fechado' : newStatus;

      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(['crm-leads'],
          previousLeads.map(lead => {
            if (lead.id !== leadId) return lead;

            const optimisticUpdates: Partial<Lead> = {
              status: effectiveStatus as LeadStatus,
              stage_entered_at: now,
              updated_at: now,
              ...additionalData,
            };

            if (effectiveStatus === 'compareceu') {
              optimisticUpdates.attendance_discount_status = 'liberado';
            }

            if (newStatus === 'faltou' || newStatus === 'nao_compareceu') {
              optimisticUpdates.attendance_discount_status = 'cancelado';
              optimisticUpdates.discount_percentage = 0;
              optimisticUpdates.no_show_count = lead.status === 'faltou'
                ? (lead.no_show_count || 0)
                : (lead.no_show_count || 0) + 1;
            }

            if ((newStatus === 'agendou' || newStatus === 'consulta_agendada') && !additionalData?.scheduled_appointment_at) {
              optimisticUpdates.scheduled_appointment_at = now;
            }

            return { ...lead, ...optimisticUpdates };
          })
        );
      }

      return { previousLeads };
    },
    onSuccess: (_data, variables) => {
      void refreshBusinessData(queryClient);
      if (!variables.silent) toast.success('Status salvo');
    },
    onError: (error, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['crm-leads'], context.previousLeads);
      }
      toast.error(`O status não foi salvo. ${describeError(error)}`);
    },
  });
}

export function useUpdateLeadRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, rating }: { leadId: string; rating: number }) => {
      const safeRating = Math.min(Math.max(Math.round(Number(rating) || 0), 0), 3);
      const { error } = await supabase
        .from('leads')
        .update({ interest_rating: safeRating })
        .eq('id', leadId);

      if (error) throw error;
      return safeRating;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar avaliação: ${error?.message ?? 'tente novamente'}`);
    },
  });

}

export function useUpdateLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      updates,
    }: {
      leadId: string;
      updates: Partial<Lead>;
      /** sem mensagem de sucesso (quem chamou mostra a sua) */
      silent?: boolean;
    }) => {
      const { error } = await supabase
        .from('leads')
        .update(updates as any)
        .eq('id', leadId);

      if (error) throw error;

      // Log edit activity (non-blocking)
      if (true) {
        supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user?.id ?? null,
          activity_type: 'lead_edited',
          title: 'Lead editado',
          metadata: { fields: Object.keys(updates) },
        }).then(({ error: logError }) => {
          if (logError) console.warn('Activity log failed:', logError);
        });
      }
    },
    onMutate: async ({ leadId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['crm-leads'] });

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(['crm-leads']);

      // Optimistically update the cache
      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(['crm-leads'], 
          previousLeads.map(lead => 
            lead.id === leadId ? { ...lead, ...updates } : lead
          )
        );
      }

      return { previousLeads };
    },
    onError: (err, _vars, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(['crm-leads'], context.previousLeads);
      }
      toast.error(`As alterações não foram salvas. ${describeError(err)}`);
    },
    onSettled: () => {
      void refreshBusinessData(queryClient);
    },
    onSuccess: (_data, variables) => {
      if (!variables.silent) toast.success('Alterações salvas');
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído com sucesso!');
    },
    onError: (e) => {
      toast.error(`Não foi possível excluir lead. ${describeError(e)}`);
    },
  });
}
