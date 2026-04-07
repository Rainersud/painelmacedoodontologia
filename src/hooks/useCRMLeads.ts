import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Lead, LeadStatus, LeadSource } from '@/types/crm';
import { recordStageTransition } from './useStageHistory';
import { getNextRmktStage, getRmktPhase } from '@/types/remarketing';

export function useCRMLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-leads'],
    queryFn: async (): Promise<Lead[]> => {
      // Fetch all leads without the default 1000-row limit
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      // Fetch agent names
      const agentIds = [...new Set(data?.map(l => l.assigned_agent_id).filter(Boolean))];
      let agentMap: Record<string, string> = {};
      
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds as string[]);
        
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      // Fetch tasks for leads
      const leadIds = data?.map(l => l.id) || [];
      let taskMap: Record<string, boolean> = {};
      
      if (leadIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('lead_id')
          .in('lead_id', leadIds)
          .eq('status', 'pendente');
        
        if (tasks) {
          tasks.forEach(t => {
            if (t.lead_id) taskMap[t.lead_id] = true;
          });
        }
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
        profiles: lead.assigned_agent_id ? { full_name: agentMap[lead.assigned_agent_id] || 'Sem agente' } : null,
        tasks: taskMap[lead.id] ? [{ id: 'has-task' } as any] : [],
      }));
    },
    enabled: !!user,
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
    }) => {
      // Get old status for logging
      const { data: oldLead } = await supabase
        .from('leads')
        .select('status, name')
        .eq('id', leadId)
        .maybeSingle();

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
        updates.closed_at = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
      } else if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        if (!additionalData?.scheduled_appointment_at) {
          updates.scheduled_appointment_at = new Date().toISOString();
        }
      }

      // Handle attendance discount for ALL leads
      if (newStatus === 'compareceu') {
        updates.attendance_discount_status = 'liberado';

        // Also handle referral-specific discount
        const { data: refData } = await supabase
          .from('referrals')
          .update({ attendance_discount_applied: true })
          .eq('referred_lead_id', leadId)
          .eq('attendance_discount_eligible', true)
          .select('referrer_lead_id');

        if (refData?.length && user) {
          const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', refData[0].referrer_lead_id).maybeSingle();
          await supabase.from('alerts').insert({
            type: 'indicacao_compareceu' as any,
            title: '📅 Indicação compareceu!',
            message: `${oldLead?.name || 'Paciente'} (indicado por ${referrerLead?.name || 'você'}) compareceu à consulta. Desconto de 5% aplicado!`,
            user_id: null,
            lead_id: leadId,
          });
        }
      } else if (newStatus === 'faltou') {
        updates.attendance_discount_status = 'cancelado';
        updates.discount_percentage = 0;

        // Increment no_show_count
        const { data: currentLead } = await supabase
          .from('leads')
          .select('no_show_count')
          .eq('id', leadId)
          .maybeSingle();
        updates.no_show_count = ((currentLead as any)?.no_show_count || 0) + 1;

        await supabase
          .from('referrals')
          .update({ attendance_discount_eligible: false, attendance_discount_applied: false })
          .eq('referred_lead_id', leadId);
      }

      // Auto-trigger bonificação when referred lead reaches tratamento_andamento, fechado or concluido
      if (newStatus === 'tratamento_andamento' || newStatus === 'fechado' || newStatus === 'concluido') {
        const { data: refConvert } = await supabase
          .from('referrals')
          .select('id, referrer_lead_id, reward_type, reward_value')
          .eq('referred_lead_id', leadId);
        
        if (refConvert?.length && user) {
          const ref = refConvert[0];
          const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', ref.referrer_lead_id).maybeSingle();
          
          if (newStatus === 'fechado' || newStatus === 'concluido') {
            const rewardText = ref.reward_type === 'dinheiro' 
              ? `R$${ref.reward_value} em dinheiro` 
              : `R$${ref.reward_value} em crédito`;
            await supabase.from('alerts').insert({
              type: 'indicacao_converteu' as any,
              title: '🎉 Indicação convertida!',
              message: `${oldLead?.name || 'Paciente'} (indicado por ${referrerLead?.name || 'indicador'}) fechou tratamento!\n\n💰 Bonificação disponível para pagamento\nValor: ${rewardText}`,
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
              title: '🎁 Bonificação liberada!',
              message: `${oldLead?.name || 'Paciente'} iniciou tratamento. Bonificação de ${rewardText} liberada para ${referrerLead?.name || 'indicador'}.`,
              user_id: null,
              lead_id: leadId,
            });
          }
        }
      }

      // Auto-enter RMKT when moving to followup_4
      if (newStatus === 'followup_4') {
        // Non-blocking: after 1 day in followup_4, system should migrate to RMKT
        // For now, we flag it. The actual auto-migration can be done via scheduled check.
        supabase.from('leads').update({
          last_interaction_at: new Date().toISOString(),
        }).eq('id', leadId).then(() => {});
      }

      // If lead was in RMKT and gets scheduled (agendou), exit RMKT
      if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        supabase.from('remarketing_entries')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true)
          .then(() => {});
        updates.rmkt_status = 'inativo';
      }

      // If lead reaches fechado, exit RMKT definitively
      if (effectiveStatus === 'fechado') {
        supabase.from('remarketing_entries')
          .update({ is_active: false })
          .eq('lead_id', leadId)
          .eq('is_active', true)
          .then(() => {});
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
          await supabase.from('remarketing_entries').insert({
            lead_id: leadId,
            current_stage: lastRmkt.current_stage,
            phase: getRmktPhase(lastRmkt.current_stage),
            origin_status: newStatus,
            is_active: true,
          });
          updates.rmkt_status = 'ativo';
          updates.rmkt_last_stage = lastRmkt.current_stage;
        }
      }

      // Auto-create appointment when moving to agendou
      if ((newStatus === 'agendou' || newStatus === 'consulta_agendada') && user) {
        const scheduledAt = (additionalData?.scheduled_appointment_at as string) || new Date().toISOString();
        await supabase.from('appointments').insert({
          lead_id: leadId,
          agent_id: user.id,
          scheduled_at: scheduledAt,
          notes: `Agendamento criado automaticamente via funil`,
        });
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      // Record stage history
      if (oldLead && oldLead.status !== newStatus) {
        await recordStageTransition(leadId, oldLead.status, newStatus);
      }

      // Log activity (non-blocking)
      if (user && oldLead) {
        supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user.id,
          activity_type: 'status_changed',
          title: `Status alterado: ${oldLead.name}`,
          old_value: oldLead.status,
          new_value: newStatus,
        }).then(({ error: logError }) => {
          if (logError) console.warn('Activity log failed:', logError);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-tags'] });
      queryClient.invalidateQueries({ queryKey: ['referral-tags-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['referral-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['referral-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stage-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      queryClient.invalidateQueries({ queryKey: ['loss-analysis'] });
      toast.success('Lead atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar lead');
    },
  });
}

export function useUpdateLeadRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, rating }: { leadId: string; rating: number }) => {
      const { error } = await supabase
        .from('leads')
        .update({ interest_rating: rating })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
    },
  });
}

export function useUpdateLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      updates 
    }: { 
      leadId: string; 
      updates: Partial<Lead>;
    }) => {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      // Log edit activity (non-blocking)
      if (user) {
        supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user.id,
          activity_type: 'lead_edited',
          title: 'Lead editado',
          metadata: { fields: Object.keys(updates) },
        }).then(({ error: logError }) => {
          if (logError) console.warn('Activity log failed:', logError);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Lead atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar lead');
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
    onError: () => {
      toast.error('Erro ao excluir lead');
    },
  });
}
