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

      return (data || []).map(task => ({
        ...task,
        task_type: task.task_type as TaskType,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority | undefined,
        lead: task.lead_id ? leadMap[task.lead_id] : null,
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
        title: `Tarefa criada: ${data.title}`,
        description: data.description,
      }).then(({ error: logError }) => {
        if (logError) console.warn('Activity log failed:', logError);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar tarefa');
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
      updates: Partial<Pick<Task, 'title' | 'description' | 'scheduled_at' | 'status' | 'priority' | 'response'>> 
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
            title: `Tarefa concluída: ${task.title}`,
            description: updates.response || undefined,
          }).then(({ error: logError }) => {
            if (logError) console.warn('Activity log failed:', logError);
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Tarefa atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa');
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
        .single();

      if (fetchError || !original) throw fetchError || new Error('Tarefa não encontrada');

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: 'reagendado', 
          reschedule_reason: reason,
          description: observation ? `${original.description || ''}\n[Reagendamento] ${observation}`.trim() : original.description,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase.from('tasks').insert({
        lead_id: original.lead_id,
        agent_id: user?.id ?? null,
        title: original.title,
        description: original.description,
        task_type: original.task_type,
        priority: original.priority,
        scheduled_at: newDate,
        status: 'pendente',
        rescheduled_from_id: taskId,
      });

      if (insertError) throw insertError;

      await supabase.from('activity_logs').insert({
        lead_id: original.lead_id,
        agent_id: user?.id ?? null,
        activity_type: 'task_created',
        title: `Tarefa reagendada: ${original.title}`,
        description: `Motivo: ${reason}`,
      }).then(({ error: logError }) => {
        if (logError) console.warn('Activity log failed:', logError);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      toast.success('Tarefa reagendada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao reagendar tarefa');
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
      toast.success('Tarefa excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir tarefa');
    },
  });
}
