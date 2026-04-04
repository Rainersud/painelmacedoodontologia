import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFriendlyPatientStatus(leadId: string | undefined) {
  return useQuery({
    queryKey: ['friendly-patient', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('upsell_opportunities')
        .select('friendly_patient, friendly_patient_video_recorded')
        .eq('lead_id', leadId)
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!leadId,
  });
}
