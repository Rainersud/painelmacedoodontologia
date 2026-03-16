import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global realtime sync hook - listens to key tables and invalidates
 * all related React Query caches automatically.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
        queryClient.invalidateQueries({ queryKey: ['funnel-leads'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['leads-for-appointment'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['referral-ranking'] });
        queryClient.invalidateQueries({ queryKey: ['referral-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
        queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['referrals'] });
        queryClient.invalidateQueries({ queryKey: ['referral-tags'] });
        queryClient.invalidateQueries({ queryKey: ['referral-tags-enhanced'] });
        queryClient.invalidateQueries({ queryKey: ['referral-ranking'] });
        queryClient.invalidateQueries({ queryKey: ['referral-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
        queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
        queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_stage_history' }, () => {
        queryClient.invalidateQueries({ queryKey: ['stage-history'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_triage' }, () => {
        queryClient.invalidateQueries({ queryKey: ['patient-triage'] });
        queryClient.invalidateQueries({ queryKey: ['credit-approved-patients'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
