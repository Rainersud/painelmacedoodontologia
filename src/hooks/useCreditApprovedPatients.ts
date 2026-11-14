import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreditCompanyEntry {
  name: string;
  value: number;
}

export interface CreditApprovedPatient {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_status: string;
  credit_status: string;
  credit_companies: CreditCompanyEntry[];
  filled_at: string;
  updated_at: string;
}

export function useCreditApprovedPatients() {
  return useQuery({
    queryKey: ['credit-approved-patients'],
    queryFn: async (): Promise<CreditApprovedPatient[]> => {
      const { data: triages, error: triageError } = await supabase
        .from('patient_triage')
        .select('id, lead_id, credit_approved_value, credit_status, credit_pagmais_value, credit_capim_value, credit_maioral_value, credit_drgestao_value, filled_at, updated_at')
        .eq('credit_status', 'aprovado');

      if (triageError) throw triageError;
      if (!triages || triages.length === 0) return [];

      // Filter triages that have at least one company with value > 0
      const validTriages = triages.filter(t => 
        (Number(t.credit_pagmais_value) || 0) > 0 ||
        (Number(t.credit_maioral_value) || 0) > 0
      );

      if (validTriages.length === 0) return [];

      const leadIds = validTriages.map(t => t.lead_id);
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, status')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

      return validTriages
        .map(t => {
          const lead = leadsMap.get(t.lead_id);
          if (!lead) return null;
          if (['fechado', 'concluido'].includes(lead.status)) return null;

          const companies: CreditCompanyEntry[] = [
            { name: 'PAGMAIS', value: Number(t.credit_pagmais_value) || 0 },
            { name: 'MAIORAL', value: Number(t.credit_maioral_value) || 0 },
          ]; // as duas sempre aparecem, separadas (valor 0 = não liberado nessa empresa)

          return {
            id: t.id,
            lead_id: t.lead_id,
            lead_name: lead.name,
            lead_status: lead.status,
            credit_status: t.credit_status || 'pendente',
            credit_companies: companies,
            filled_at: t.filled_at,
            updated_at: t.updated_at,
          };
        })
        .filter(Boolean) as CreditApprovedPatient[];
    },
    refetchInterval: 30000,
  });
}
