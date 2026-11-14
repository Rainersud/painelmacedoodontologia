import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Friendly = { friendly_patient: boolean | null; friendly_patient_video_recorded: boolean | null };

/** Paciente amigo de todos os leads numa única busca (usado pelos cards do funil). */
export function useFriendlyPatientStatusBulk(leadId: string | undefined) {
  const q = useQuery({
    queryKey: ['friendly-patient', 'all'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_opportunities')
        .select('lead_id, friendly_patient, friendly_patient_video_recorded');
      if (error) throw error;
      const map = new Map<string, Friendly>();
      for (const r of data || []) if (r.lead_id && !map.has(r.lead_id)) map.set(r.lead_id, r);
      return map;
    },
    enabled: !!leadId,
  });
  return { ...q, data: leadId ? q.data?.get(leadId) ?? null : null };
}

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
