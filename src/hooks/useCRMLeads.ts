import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Lead, LeadStatus, LeadSource } from '@/types/crm';

export function useCRMLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-leads'],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

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
        ...additionalData,
      };
      
      // Add timestamp fields based on status
      if (newStatus === 'resgatado') {
        updates.rescued_at = new Date().toISOString();
      } else if (newStatus === 'fechado') {
        updates.closed_at = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
      } else if (newStatus === 'agendou' || newStatus === 'consulta_agendada') {
        updates.scheduled_appointment_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      // Log activity
      if (user && oldLead) {
        await supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user.id,
          activity_type: 'status_changed',
          title: `Status alterado: ${oldLead.name}`,
          old_value: oldLead.status,
          new_value: newStatus,
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

export function useUpdateLeadRating() {
  const { user } = useAuth();
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

      // Log edit activity
      if (user) {
        await supabase.from('activity_logs').insert({
          lead_id: leadId,
          agent_id: user.id,
          activity_type: 'lead_edited',
          title: 'Lead editado',
          metadata: { fields: Object.keys(updates) },
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
