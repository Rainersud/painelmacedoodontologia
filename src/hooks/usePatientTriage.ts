import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PatientTriageData {
  id?: string;
  lead_id: string;
  filled_by?: string;
  filled_at?: string;
  triage_completed?: boolean;
  completed_at?: string | null;
  full_name?: string | null;
  phone?: string | null;
  nickname?: string | null;
  email?: string | null;
  address?: string | null;
  cep?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  profession?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  motivation?: string[];
  motivation_other?: string | null;
  discomfort_duration?: string | null;
  uses_prosthesis?: boolean | null;
  prosthesis_duration?: string | null;
  difficulty_chewing?: boolean | null;
  ashamed_to_smile?: boolean | null;
  previous_implants?: boolean | null;
  fear_of_dentist?: string | null;
  smile_discomfort_score?: number | null;
  mirror_concern?: string | null;
  desired_smile_change?: string | null;
  desired_feeling?: string | null;
  ice_cream_flavor?: string | null;
  post_treatment_food?: string | null;
  credit_status?: string | null;
  credit_approved_value?: number | null;
  credit_pagmais_value?: number | null;
  credit_capim_value?: number | null;
  credit_maioral_value?: number | null;
  credit_drgestao_value?: number | null;
  spin_answers?: Record<string, string> | null;
}

/** Accepts "DD/MM/AAAA" or ISO and returns "YYYY-MM-DD" (or null when invalid/empty). */
export function normalizeBirthDate(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

/** Converts a stored "YYYY-MM-DD" into "DD/MM/AAAA" for display. */
export function formatBirthDateBR(value?: string | null): string {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : value;
}

export function usePatientTriage(leadId: string | undefined) {
  return useQuery({
    queryKey: ['patient-triage', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('patient_triage')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      return data as PatientTriageData | null;
    },
    enabled: !!leadId,
  });
}

export function useSavePatientTriage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: PatientTriageData) => {
      const { id: _id, ...rest } = data as PatientTriageData & { created_at?: string };
      delete (rest as Record<string, unknown>).created_at;

      const payload = {
        ...rest,
        birth_date: normalizeBirthDate(data.birth_date),
        filled_by: user?.id || data.filled_by,
        filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try upsert by lead_id
      const { data: existing } = await supabase
        .from('patient_triage')
        .select('id')
        .eq('lead_id', data.lead_id)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabase
          .from('patient_triage')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return updated;
      }

      const { data: inserted, error } = await supabase
        .from('patient_triage')
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-triage', variables.lead_id] });
    },
  });
}

export function useMarkTriageCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('patient_triage')
        .update({ triage_completed: true, completed_at: new Date().toISOString() })
        .eq('lead_id', leadId);
      if (error) throw error;
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['patient-triage', leadId] });
    },
  });
}
