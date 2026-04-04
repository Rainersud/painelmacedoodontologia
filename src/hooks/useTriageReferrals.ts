import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TriageReferral {
  id?: string;
  triage_id?: string;
  lead_id: string;
  referral_name: string;
  situation: string;
  relationship: string;
  phone?: string;
  converted_lead_id?: string | null;
  converted_at?: string | null;
}

export function useTriageReferrals(leadId: string | undefined) {
  return useQuery({
    queryKey: ['triage-referrals', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data: triage } = await supabase
        .from('patient_triage')
        .select('id')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (!triage) return [];

      const { data, error } = await supabase
        .from('triage_referrals' as any)
        .select('*')
        .eq('triage_id', triage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as TriageReferral[];
    },
    enabled: !!leadId,
  });
}

export function useSaveTriageReferrals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      triageId,
      referrals,
    }: {
      leadId: string;
      triageId: string;
      referrals: TriageReferral[];
    }) => {
      // Delete existing non-converted
      await (supabase.from('triage_referrals' as any) as any)
        .delete()
        .eq('triage_id', triageId)
        .is('converted_lead_id', null);

      const newReferrals = referrals.filter(r => !r.converted_lead_id);
      if (newReferrals.length === 0) return;

      const rows = newReferrals.map((r) => ({
        triage_id: triageId,
        lead_id: leadId,
        referral_name: r.referral_name,
        situation: r.situation,
        relationship: r.relationship || '',
        phone: r.phone || null,
      }));

      const { error } = await (supabase.from('triage_referrals' as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['triage-referrals', vars.leadId] });
    },
  });
}

export function useConvertReferralToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referral,
      agentId,
      referrerLeadId,
    }: {
      referral: TriageReferral;
      agentId: string;
      referrerLeadId: string;
    }) => {
      // Check for duplicate phone
      const phone = (referral.phone || '').replace(/\D/g, '');
      if (phone.length >= 10) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id, name')
          .eq('phone', phone)
          .maybeSingle();

        if (existing) {
          throw new Error(`Já existe um lead com este telefone: ${existing.name}`);
        }
      }

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          name: referral.referral_name,
          phone: phone || '',
          source: 'indicacao' as any,
          status: 'indicacoes' as any,
          interest_product: referral.situation === 'dentadura' ? 'protese_total' :
                           referral.situation === 'ponte' ? 'protese_flexivel' : 'implante',
          assigned_agent_id: agentId,
          notes: `Indicado por paciente. Situação: ${referral.situation}. Parentesco: ${referral.relationship || 'Não informado'}`,
        })
        .select('id')
        .single();

      if (leadError) throw leadError;

      // Create referral link
      await supabase.from('referrals').insert({
        referrer_lead_id: referrerLeadId,
        referred_lead_id: newLead.id,
        reward_type: 'dinheiro',
        reward_value: 0,
        discount_type: 'percentual',
        discount_value: 0,
      });

      // Update triage_referral with converted_lead_id
      if (referral.id) {
        await (supabase.from('triage_referrals' as any) as any)
          .update({ converted_lead_id: newLead.id, converted_at: new Date().toISOString() })
          .eq('id', referral.id);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        lead_id: referrerLeadId,
        agent_id: agentId,
        activity_type: 'lead_created',
        title: `Indicação convertida em lead: ${referral.referral_name}`,
      });

      return newLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}

export function useBulkLinkReferrals() {
  const queryClient = useQueryClient();
  const convertMutation = useConvertReferralToLead();

  return useMutation({
    mutationFn: async ({
      referrals,
      agentId,
      referrerLeadId,
    }: {
      referrals: TriageReferral[];
      agentId: string;
      referrerLeadId: string;
    }) => {
      const results: { name: string; success: boolean; error?: string }[] = [];

      for (const referral of referrals) {
        const phone = (referral.phone || '').replace(/\D/g, '');
        if (!referral.referral_name.trim() || phone.length < 10) {
          results.push({ name: referral.referral_name || 'Sem nome', success: false, error: 'Nome ou telefone não preenchido' });
          continue;
        }
        if (referral.converted_lead_id) {
          results.push({ name: referral.referral_name, success: false, error: 'Já convertido' });
          continue;
        }

        try {
          await convertMutation.mutateAsync({ referral, agentId, referrerLeadId });
          results.push({ name: referral.referral_name, success: true });
        } catch (err: any) {
          results.push({ name: referral.referral_name, success: false, error: err.message });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
}
