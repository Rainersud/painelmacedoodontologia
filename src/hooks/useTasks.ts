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
      let leadMap: Record<string, { name: string; phone: string }> = {};
      
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, phone')
          .in('id', leadIds as string[]);
        
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, { name: l.name, phone: l.phone }]));
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
    enabled: !!user,
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
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('tasks').insert({
        ...data,
        agent_id: user.id,
        status: 'pendente',
      });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        lead_id: data.lead_id,
        agent_id: user.id,
        activity_type: 'task_created',
        title: `Tarefa criada: ${data.title}`,
        description: data.description,
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
      updates: Partial<Pick<Task, 'title' | 'description' | 'scheduled_at' | 'status' | 'priority'>> 
    }) => {
      const finalUpdates: Record<string, unknown> = { ...updates };
      
      if (updates.status === 'concluido') {
        finalUpdates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', id);

      if (error) throw error;

      // Log completion
      if (updates.status === 'concluido' && user) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title, lead_id')
          .eq('id', id)
          .maybeSingle();

        if (task) {
          await supabase.from('activity_logs').insert({
            lead_id: task.lead_id,
            agent_id: user.id,
            activity_type: 'task_completed',
            title: `Tarefa concluída: ${task.title}`,
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
