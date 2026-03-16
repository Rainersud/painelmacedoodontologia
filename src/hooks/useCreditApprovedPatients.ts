import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreditApprovedPatient {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_status: string;
  credit_approved_value: number;
  credit_status: string;
  filled_at: string;
  updated_at: string;
}

export function useCreditApprovedPatients() {
  return useQuery({
    queryKey: ['credit-approved-patients'],
    queryFn: async (): Promise<CreditApprovedPatient[]> => {
      // Get all triage records with approved credit
      const { data: triages, error: triageError } = await supabase
        .from('patient_triage')
        .select('id, lead_id, credit_approved_value, credit_status, filled_at, updated_at')
        .eq('credit_status', 'aprovado')
        .gt('credit_approved_value', 0);

      if (triageError) throw triageError;
      if (!triages || triages.length === 0) return [];

      // Get lead info for these triages
      const leadIds = triages.map(t => t.lead_id);
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, status')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

      return triages
        .map(t => {
          const lead = leadsMap.get(t.lead_id);
          if (!lead) return null;
          // Exclude patients who already closed (venda realizada)
          if (['fechado', 'concluido'].includes(lead.status)) return null;
          return {
            id: t.id,
            lead_id: t.lead_id,
            lead_name: lead.name,
            lead_status: lead.status,
            credit_approved_value: Number(t.credit_approved_value) || 0,
            credit_status: t.credit_status || 'pendente',
            filled_at: t.filled_at,
            updated_at: t.updated_at,
          };
        })
        .filter(Boolean) as CreditApprovedPatient[];
    },
    refetchInterval: 30000,
  });
}
