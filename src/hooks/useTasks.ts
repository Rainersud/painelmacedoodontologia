import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Task, TaskType, TaskStatus, TaskPriority } from '@/types/crm';

export function useTasks(filters?: { 
  status?: TaskStatus; 
  date?: Date;
  leadId?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', filters, user?.id],
    queryFn: async (): Promise<Task[]> => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('scheduled_at', startOfDay.toISOString())
          .lte('scheduled_at', endOfDay.toISOString());
      }

      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch lead names separately
      const leadIds = [...new Set(data?.map(t => t.lead_id).filter(Boolean))];
      let leadMap: Record<string, { name: string; phone: string; budget_value?: number | null; treatment_value?: number | null }> = {};
      
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, phone, budget_value, treatment_value')
          .in('id', leadIds as string[]);
        
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, { name: l.name, phone: l.phone, budget_value: l.budget_value, treatment_value: l.treatment_value }]));
        }
      }

      const tasks = data || [];

      // Fetch original tasks for rescheduled ones
      const originalIds = [...new Set(tasks.map(t => t.rescheduled_from_id).filter(Boolean))] as string[];
      let originalMap: Record<string, { scheduled_at: string }> = {};
      if (originalIds.length > 0) {
        const { data: originals } = await supabase
          .from('tasks')
          .select('id, scheduled_at')
          .in('id', originalIds);
        if (originals) {
          originalMap = Object.fromEntries(originals.map(o => [o.id, { scheduled_at: o.scheduled_at }]));
        }
      }

      // Fetch child tasks for rescheduled originals
      const rescheduledIds = [...new Set(tasks.filter(t => t.status === 'reagendado').map(t => t.id))];
      let childMap: Record<string, { scheduled_at: string }> = {};
      if (rescheduledIds.length > 0) {
        const { data: children } = await supabase
          .from('tasks')
          .select('rescheduled_from_id, scheduled_at')
          .in('rescheduled_from_id', rescheduledIds)
          .eq('status', 'pendente');
        if (children) {
          for (const child of children) {
            if (child.rescheduled_from_id && !childMap[child.rescheduled_from_id]) {
              childMap[child.rescheduled_from_id] = { scheduled_at: child.scheduled_at };
            }
          }
        }
      }

      // Histórico de reagendamentos de todas as tarefas listadas
      const allIds = tasks.map(t => t.id);
      let historyMap: Record<string, Array<{ previous_scheduled_at: string | null; new_scheduled_at: string; reason: string; observation: string | null; created_at: string }>> = {};
      if (allIds.length > 0) {
        const { data: history } = await supabase
          .from('task_reschedule_history')
          .select('task_id, previous_scheduled_at, new_scheduled_at, reason, observation, created_at')
          .in('task_id', allIds)
          .order('created_at', { ascending: true });
        if (history) {
          for (const h of history) {
            (historyMap[h.task_id] ||= []).push({
              previous_scheduled_at: h.previous_scheduled_at,
              new_scheduled_at: h.new_scheduled_at,
              reason: h.reason,
              observation: h.observation,
              created_at: h.created_at,
            });
          }
        }
      }

      return tasks.map(task => ({
        ...task,
        task_type: task.task_type as TaskType,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority | undefined,
        lead: task.lead_id ? leadMap[task.lead_id] : null,
        original_task: task.rescheduled_from_id ? originalMap[task.rescheduled_from_id] : null,
        rescheduled_to_task: task.status === 'reagendado' ? childMap[task.id] : null,
        reschedule_history: historyMap[task.id] || [],
      }));

    },
    // acesso aberto: sem login obrigatorio
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      lead_id?: string;
      title: string;
      description?: string;
      task_type: TaskType;
      scheduled_at: string;
      priority?: TaskPriority;
    }) => {
      // Bloqueia duplicidade: mesma pessoa (nome ou telefone) com tarefa no mesmo dia
      if (data.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, name, phone, whatsapp')
          .eq('id', data.lead_id)
          .maybeSingle();

        if (lead) {
          const phones = [lead.phone, lead.whatsapp].filter(Boolean) as string[];
          const filters = [`name.eq.${lead.name}`, ...phones.map(p => `phone.eq.${p}`)];
          const { data: sameLeads } = await supabase
            .from('leads')
            .select('id')
            .or(filters.join(','));

          const ids = (sameLeads || []).map(l => l.id);
          if (ids.length > 0) {
            const day = new Date(data.scheduled_at);
            const start = new Date(day); start.setHours(0, 0, 0, 0);
            const end = new Date(day); end.setHours(23, 59, 59, 999);

            const { data: existing } = await supabase
              .from('tasks')
              .select('id')
              .in('lead_id', ids)
              .neq('status', 'reagendado')
              .gte('scheduled_at', start.toISOString())
              .lte('scheduled_at', end.toISOString())
              .limit(1);

            if (existing && existing.length > 0) {
              throw new Error('DUPLICATE_TASK');
            }
          }
        }
      }

      const { error } = await supabase.from('tasks').insert({
        ...data,
        agent_id: user?.id ?? null,
        status: 'pendente',
      });


      if (error) throw error;

      // Log activity (non-blocking, don't fail the mutation)
      await supabase.from('activity_logs').insert({
        lead_id: data.lead_id,
        agent_id: user?.id ?? null,
        activity_type: 'task_created',
        title: `Retorno criado: ${data.title}`,
        description: data.description,
      }).then(({ error: logError }) => {
        if (logError) console.warn('Activity log failed:', logError);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Retorno criado');
    },
    onError: (err: Error) => {
      if (err?.message === 'DUPLICATE_TASK') {
        toast.error('Já existe um retorno neste dia para este contato (mesmo nome ou telefone).');
        return;
      }
      toast.error('O retorno não foi criado. Confira a conexão e tente de novo.');
    },

  });
}

export function useUpdateTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<Task, 'title' | 'description' | 'scheduled_at' | 'status' | 'priority' | 'response' | 'task_type'>> 
    }) => {
      const finalUpdates: Record<string, unknown> = { ...updates };
      
      if (updates.status === 'concluido') {
        finalUpdates.completed_at = new Date().toISOString();
      }
      if (updates.status === 'pendente') {
        finalUpdates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', id);

      if (error) throw error;

      if (updates.status === 'concluido' && user) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title, lead_id')
          .eq('id', id)
          .maybeSingle();

        if (task) {
          await supabase.from('activity_logs').insert({
            lead_id: task.lead_id,
            agent_id: user?.id ?? null,
            activity_type: 'task_completed',
            title: `Retorno concluído: ${task.title}`,
            description: updates.response || undefined,
          }).then(({ error: logError }) => {
            if (logError) console.warn('Activity log failed:', logError);
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Retorno atualizado');
    },
    onError: () => {
      toast.error('O retorno não foi atualizado. Tente de novo.');
    },
  });
}

export interface TaskRescheduleHistoryItem {
  id: string;
  task_id: string;
  previous_scheduled_at: string | null;
  new_scheduled_at: string;
  reason: string;
  observation: string | null;
  created_at: string;
}

export function useTaskRescheduleHistory(taskId?: string) {
  return useQuery({
    queryKey: ['task-reschedule-history', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskRescheduleHistoryItem[]> => {
      const { data, error } = await supabase
        .from('task_reschedule_history')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as TaskRescheduleHistoryItem[];
    },
  });
}

export function useRescheduleTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      newDate, 
      reason, 
      observation 
    }: { 
      taskId: string; 
      newDate: string; 
      reason: string; 
      observation?: string; 
    }) => {
      const { data: original, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (fetchError || !original) throw fetchError || new Error('Tarefa não encontrada');

      // Move o próprio card para a nova data (mantém pendente)
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          scheduled_at: newDate,
          status: 'pendente',
          completed_at: null,
          reschedule_reason: reason,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Registra o histórico do reagendamento
      const { error: histError } = await supabase.from('task_reschedule_history').insert({
        task_id: taskId,
        lead_id: original.lead_id,
        agent_id: user?.id ?? null,
        previous_scheduled_at: original.scheduled_at,
        new_scheduled_at: newDate,
        reason,
        observation: observation || null,
      });
      if (histError) throw histError;

      await supabase.from('activity_logs').insert({
        lead_id: original.lead_id,
        agent_id: user?.id ?? null,
        activity_type: 'task_created',
        title: `Retorno reagendado: ${original.title}`,
        description: observation ? `Motivo: ${reason} — ${observation}` : `Motivo: ${reason}`,
      }).then(({ error: logError }) => {
        if (logError) console.warn('Activity log failed:', logError);
      });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-reschedule-history', vars.taskId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Retorno reagendado para a nova data');
    },
    onError: () => {
      toast.error('O retorno não foi reagendado. Tente de novo.');
    },
  });
}


export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Retorno excluído');
    },
    onError: (error: any) => {
      toast.error(`O retorno não foi excluído: ${error?.message ?? 'erro desconhecido'}`);
    },
  });
}
