import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityLog } from '@/types/crm';

export function useActivityLogs(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-logs', limit, user?.id],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch lead names
      const leadIds = [...new Set(data?.map(a => a.lead_id).filter(Boolean))];
      let leadMap: Record<string, { name: string }> = {};
      
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds as string[]);
        
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, { name: l.name }]));
        }
      }

      // Fetch agent names
      const agentIds = [...new Set(data?.map(a => a.agent_id).filter(Boolean))];
      let agentMap: Record<string, { full_name: string }> = {};
      
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds);
        
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, { full_name: p.full_name }]));
        }
      }

      return (data || []).map(log => ({
        id: log.id,
        lead_id: log.lead_id,
        agent_id: log.agent_id,
        activity_type: log.activity_type as ActivityLog['activity_type'],
        title: log.title,
        description: log.description,
        old_value: log.old_value,
        new_value: log.new_value,
        metadata: log.metadata as Record<string, unknown> | null,
        created_at: log.created_at,
        lead: log.lead_id ? leadMap[log.lead_id] : null,
        profiles: agentMap[log.agent_id] || null,
      }));
    },
    // acesso aberto: sem login obrigatorio
    refetchInterval: 30000, // Refresh every 30s
  });
}
