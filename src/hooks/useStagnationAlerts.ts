import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDaysInStage } from '@/types/crm';

/**
 * Hook that checks for stagnant leads and creates alerts automatically.
 * Should be called once at the app level (e.g., Dashboard).
 */
export function useStagnationAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads } = useQuery({
    queryKey: ['stagnation-check-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, status, stage_entered_at')
        .not('status', 'in', '(fechado,concluido,pos_venda,descartados,sem_interesse)');
      if (error) throw error;
      return data || [];
    },
    // acesso aberto: sem login obrigatorio
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });

  useEffect(() => {
    if (!leads || !user) return;

    const createAlerts = async () => {
      const stagnantLeads = leads.filter(l => {
        const days = getDaysInStage(l.stage_entered_at);
        return days >= 3;
      });

      if (stagnantLeads.length === 0) return;

      // Check which alerts already exist (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('lead_id')
        .eq('type', 'lembrete_followup')
        .gte('created_at', yesterday)
        .in('lead_id', stagnantLeads.map(l => l.id));

      const existingLeadIds = new Set(existingAlerts?.map(a => a.lead_id) || []);

      const newAlerts = stagnantLeads
        .filter(l => !existingLeadIds.has(l.id))
        .map(l => {
          const days = getDaysInStage(l.stage_entered_at);
          const level = days >= 7 ? '🔴 Lead esquecido' : days >= 5 ? '🟠 Lead parado' : '🟡 Atenção';
          return {
            type: 'lembrete_followup' as const,
            title: `${level} há ${days} dias`,
            message: `${l.name} está parado na etapa atual há ${days} dias sem movimentação.`,
            user_id: null,
            lead_id: l.id,
          };
        });

      if (newAlerts.length > 0) {
        await supabase.from('alerts').insert(newAlerts);
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    };

    createAlerts();
  }, [leads, user, queryClient]);
}

/**
 * Dashboard metrics for appointments
 */
export function useAppointmentMetrics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointment-metrics'],
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*');

      if (error) throw error;

      const total = appointments?.length || 0;
      const attended = appointments?.filter(a => a.attended_at).length || 0;
      const noShows = appointments?.filter(a => a.cancelled_at && !a.attended_at).length || 0;
      const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

      // Get leads with most rescheduling
      const leadCounts: Record<string, number> = {};
      appointments?.forEach(a => {
        leadCounts[a.lead_id] = (leadCounts[a.lead_id] || 0) + 1;
      });
      const topRescheduled = Object.entries(leadCounts)
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Get no-show counts from leads
      const { data: leadsWithNoShows } = await supabase
        .from('leads')
        .select('id, name, no_show_count')
        .gt('no_show_count', 0)
        .order('no_show_count', { ascending: false })
        .limit(5);

      return {
        totalAppointments: total,
        attended,
        noShows,
        attendanceRate,
        topRescheduled,
        leadsWithNoShows: leadsWithNoShows || [],
      };
    },
    // acesso aberto: sem login obrigatorio
  });
}
