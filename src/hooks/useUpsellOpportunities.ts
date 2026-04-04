import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UpsellOpportunity {
  id: string;
  lead_id: string;
  agent_id: string | null;
  status: string;
  suggested_treatment: string;
  treatment_category: string;
  contact_status: string;
  notes: string | null;
  estimated_value: number;
  closed_value: number;
  closed_at: string | null;
  next_contact_at: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  lead?: {
    name: string;
    phone: string;
    interest_product: string | null;
    treatment_value: number | null;
    closed_at: string | null;
    sale_type: string | null;
  } | null;
}

export interface TreatmentSuggestion {
  id: string;
  trigger_treatment: string;
  suggested_treatment: string;
  category: string;
  priority: number;
  delay_months: number;
  is_active: boolean;
}

export interface ContactHistory {
  id: string;
  opportunity_id: string;
  agent_id: string;
  contact_type: string;
  result: string | null;
  notes: string | null;
  created_at: string;
}

export const UPSELL_STAGES = [
  { key: 'base_pacientes', label: 'Base de Pacientes', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'upsell_1', label: 'Upsell 1', color: 'bg-primary', bgColor: 'bg-primary/10' },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'negociacao', label: 'Negociação', color: 'bg-chart-5', bgColor: 'bg-chart-5/10' },
  { key: 'venda_upsell', label: 'Venda Upsell', color: 'bg-success', bgColor: 'bg-success/20' },
];

export const CONTACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nao_contatado: { label: 'Não Contatado', color: 'bg-muted text-muted-foreground' },
  em_negociacao: { label: 'Em Negociação', color: 'bg-warning/10 text-warning' },
  interessado: { label: 'Interessado', color: 'bg-primary/10 text-primary' },
  recusado: { label: 'Recusado', color: 'bg-destructive/10 text-destructive' },
  fechado: { label: 'Fechado', color: 'bg-success/10 text-success' },
};

export function useUpsellOpportunities() {
  return useQuery({
    queryKey: ['upsell-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_opportunities')
        .select('*, lead:leads(name, phone, interest_product, treatment_value, closed_at, sale_type)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as UpsellOpportunity[];
    },
  });
}

export function useTreatmentSuggestions() {
  return useQuery({
    queryKey: ['treatment-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_treatment_suggestions')
        .select('*')
        .eq('is_active', true)
        .order('priority');
      if (error) throw error;
      return data as TreatmentSuggestion[];
    },
  });
}

export function useContactHistory(opportunityId: string | null) {
  return useQuery({
    queryKey: ['upsell-contact-history', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('upsell_contact_history')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContactHistory[];
    },
    enabled: !!opportunityId,
  });
}

export function useCreateUpsellOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      lead_id: string;
      suggested_treatment: string;
      treatment_category?: string;
      estimated_value?: number;
      agent_id?: string;
    }) => {
      const { error } = await supabase.from('upsell_opportunities').insert({
        lead_id: data.lead_id,
        suggested_treatment: data.suggested_treatment,
        treatment_category: data.treatment_category || 'geral',
        estimated_value: data.estimated_value || 0,
        agent_id: data.agent_id,
        status: 'base_pacientes',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upsell-opportunities'] }),
  });
}

export function useUpdateUpsellStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, additionalData }: {
      id: string;
      status: string;
      additionalData?: Record<string, unknown>;
    }) => {
      const updateData: Record<string, unknown> = { status, ...additionalData };
      if (status === 'venda_upsell' && !updateData.closed_at) {
        updateData.closed_at = new Date().toISOString();
        updateData.contact_status = 'fechado';
      }
      const { error } = await supabase.from('upsell_opportunities').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upsell-opportunities'] }),
  });
}

export function useUpdateUpsellOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from('upsell_opportunities').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upsell-opportunities'] }),
  });
}

export function useAddContactHistory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: {
      opportunity_id: string;
      contact_type: string;
      result?: string;
      notes?: string;
    }) => {
      const { error: histError } = await supabase.from('upsell_contact_history').insert({
        opportunity_id: data.opportunity_id,
        agent_id: user!.id,
        contact_type: data.contact_type,
        result: data.result || null,
        notes: data.notes || null,
      });
      if (histError) throw histError;

      // Increment attempt count
      const { error: updError } = await supabase.rpc('increment_attempt_count' as never, { opp_id: data.opportunity_id } as never);
      // Fallback: manual increment if RPC doesn't exist
      if (updError) {
        const { data: opp } = await supabase
          .from('upsell_opportunities')
          .select('attempt_count')
          .eq('id', data.opportunity_id)
          .single();
        await supabase
          .from('upsell_opportunities')
          .update({ attempt_count: (opp?.attempt_count || 0) + 1 })
          .eq('id', data.opportunity_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upsell-contact-history'] });
      qc.invalidateQueries({ queryKey: ['upsell-opportunities'] });
    },
  });
}

export function useAutoGenerateUpsell() {
  const createUpsell = useCreateUpsellOpportunity();
  const { data: suggestions } = useTreatmentSuggestions();
  const { data: existingOpps } = useUpsellOpportunities();

  return useMutation({
    mutationFn: async (lead: {
      id: string;
      interest_product: string | null;
      assigned_agent_id: string | null;
    }) => {
      if (!suggestions) return;
      const treatment = lead.interest_product || 'outro';
      const matchingSuggestions = suggestions.filter(s => s.trigger_treatment === treatment);

      const existingForLead = existingOpps?.filter(o => o.lead_id === lead.id) || [];
      const existingTreatments = new Set(existingForLead.map(o => o.suggested_treatment));

      for (const suggestion of matchingSuggestions) {
        if (!existingTreatments.has(suggestion.suggested_treatment)) {
          await createUpsell.mutateAsync({
            lead_id: lead.id,
            suggested_treatment: suggestion.suggested_treatment,
            treatment_category: suggestion.category,
            agent_id: lead.assigned_agent_id || undefined,
          });
        }
      }
    },
  });
}

// Metrics calculation
export function useUpsellMetrics() {
  const { data: opportunities } = useUpsellOpportunities();

  if (!opportunities) return null;

  const total = opportunities.length;
  const closed = opportunities.filter(o => o.status === 'venda_upsell');
  const conversionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;
  const totalRevenue = closed.reduce((sum, o) => sum + (o.closed_value || o.estimated_value || 0), 0);
  const avgTicket = closed.length > 0 ? totalRevenue / closed.length : 0;
  const uniquePatients = new Set(opportunities.map(o => o.lead_id)).size;
  const ltvPerPatient = uniquePatients > 0 ? totalRevenue / uniquePatients : 0;

  return {
    total,
    closedCount: closed.length,
    conversionRate,
    totalRevenue,
    avgTicket,
    uniquePatients,
    ltvPerPatient,
    byStatus: UPSELL_STAGES.map(s => ({
      ...s,
      count: opportunities.filter(o => o.status === s.key).length,
    })),
  };
}
