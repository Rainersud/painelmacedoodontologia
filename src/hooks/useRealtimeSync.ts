import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { refreshBusinessDataSoon } from '@/lib/refresh';

/**
 * Sincronização em tempo real: quando alguém muda leads, consultas, pagamentos etc.,
 * todas as telas abertas recalculam (com uma pequena espera para agrupar rajadas).
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshBusinessDataSoon(queryClient);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upsell_opportunities' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'remarketing_entries' }, () => {
        refreshBusinessDataSoon(queryClient);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
