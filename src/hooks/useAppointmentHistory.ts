import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentRecord {
  id: string;
  scheduled_at: string;
  confirmed_at: string | null;
  attended_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useAppointmentHistory(leadId: string) {
  return useQuery({
    queryKey: ['appointment-history', leadId],
    queryFn: async (): Promise<AppointmentRecord[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, confirmed_at, attended_at, cancelled_at, notes, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
}
