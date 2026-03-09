import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Referral {
  id: string;
  referrer_lead_id: string;
  referred_lead_id: string;
  reward_type: 'dinheiro' | 'credito';
  reward_value: number;
  discount_type: 'percentual' | 'fixo';
  discount_value: number;
  attendance_discount_eligible: boolean;
  attendance_discount_applied: boolean;
  created_at: string;
  updated_at: string;
  referrer?: { name: string; phone: string } | null;
  referred?: { name: string; phone: string; status: string } | null;
}

export function useReferralsByLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ['referrals', leadId],
    queryFn: async (): Promise<{ asReferrer: Referral[]; asReferred: Referral | null }> => {
      if (!leadId) return { asReferrer: [], asReferred: null };

      const { data: referrerData, error: err1 } = await supabase
        .from('referrals').select('*').eq('referrer_lead_id', leadId);
      if (err1) throw err1;

      const { data: referredData, error: err2 } = await supabase
        .from('referrals').select('*').eq('referred_lead_id', leadId).maybeSingle();
      if (err2) throw err2;

      const allLeadIds = [
        ...((referrerData || []).map(r => r.referred_lead_id)),
        ...(referredData ? [referredData.referrer_lead_id] : []),
      ];

      let leadMap: Record<string, { name: string; phone: string; status: string; treatment_value: number }> = {};
      if (allLeadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads').select('id, name, phone, status, treatment_value, interest_product').in('id', allLeadIds);
        if (leads) {
          leadMap = Object.fromEntries(leads.map(l => [l.id, { name: l.name, phone: l.phone, status: l.status, treatment_value: Number(l.treatment_value || 0), interest_product: l.interest_product }]));
        }
      }

      return {
        asReferrer: (referrerData || []).map(r => ({
          ...r,
          reward_type: r.reward_type as 'dinheiro' | 'credito',
          discount_type: r.discount_type as 'percentual' | 'fixo',
          referred: leadMap[r.referred_lead_id] || null,
        })),
        asReferred: referredData ? {
          ...referredData,
          reward_type: referredData.reward_type as 'dinheiro' | 'credito',
          discount_type: referredData.discount_type as 'percentual' | 'fixo',
          referrer: leadMap[referredData.referrer_lead_id] || null,
        } : null,
      };
    },
    enabled: !!leadId,
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      referrer_lead_id: string; referred_lead_id: string;
      reward_type: string; reward_value: number;
      discount_type: string; discount_value: number;
    }) => {
      const { error } = await supabase.from('referrals').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['referral-tags'] });
      queryClient.invalidateQueries({ queryKey: ['referral-ranking'] });
      toast.success('Indicação registrada!');
    },
    onError: (err: any) => {
      toast.error(err?.message?.includes('duplicate') ? 'Esta indicação já foi registrada' : 'Erro ao registrar indicação');
    },
  });
}

export function useUpdateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Referral> }) => {
      const { error } = await supabase.from('referrals').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('Indicação atualizada!');
    },
    onError: () => { toast.error('Erro ao atualizar indicação'); },
  });
}

export function useReferralDashboard() {
  return useQuery({
    queryKey: ['referral-dashboard'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: allReferrals, error } = await supabase.from('referrals').select('*');
      if (error) throw error;

      const monthReferrals = (allReferrals || []).filter(r => new Date(r.created_at) >= new Date(startOfMonth));
      const referredIds = (allReferrals || []).map(r => r.referred_lead_id);
      let convertedCount = 0;
      let revenueFromReferrals = 0;

      if (referredIds.length > 0) {
        const { data: referredLeads } = await supabase
          .from('leads').select('id, status, treatment_value').in('id', referredIds);
        if (referredLeads) {
          referredLeads.forEach(l => {
            if (l.status === 'fechado') { convertedCount++; revenueFromReferrals += Number(l.treatment_value || 0); }
          });
        }
      }

      return {
        totalReferralsMonth: monthReferrals.length,
        totalReferralsAll: (allReferrals || []).length,
        convertedByReferral: convertedCount,
        totalRewardsPaid: (allReferrals || []).reduce((sum, r) => sum + Number(r.reward_value), 0),
        revenueFromReferrals,
      };
    },
  });
}

export function useLeadReferralTags(leadId: string | undefined) {
  return useQuery({
    queryKey: ['referral-tags', leadId],
    queryFn: async () => {
      if (!leadId) return { isReferred: false, isReferrer: false, hasDiscount: false, referralCount: 0, referrerName: undefined };

      const [{ data: asReferred }, { data: asReferrer }] = await Promise.all([
        supabase.from('referrals').select('id, discount_value, attendance_discount_applied, referrer_lead_id').eq('referred_lead_id', leadId).maybeSingle(),
        supabase.from('referrals').select('id').eq('referrer_lead_id', leadId),
      ]);

      let referrerName: string | undefined;
      if (asReferred) {
        const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', asReferred.referrer_lead_id).maybeSingle();
        referrerName = referrerLead?.name;
      }

      return {
        isReferred: !!asReferred,
        hasDiscount: asReferred ? (Number(asReferred.discount_value) > 0) : false,
        attendanceDiscountApplied: asReferred?.attendance_discount_applied || false,
        isReferrer: (asReferrer || []).length > 0,
        referralCount: (asReferrer || []).length,
        referrerName,
      };
    },
    enabled: !!leadId,
  });
}

// Ranking data
export interface ReferrerRanking {
  leadId: string;
  name: string;
  phone: string;
  totalReferrals: number;
  attended: number;
  converted: number;
  revenue: number;
}

export function useReferralRanking(periodDays?: number) {
  return useQuery({
    queryKey: ['referral-ranking', periodDays],
    queryFn: async (): Promise<ReferrerRanking[]> => {
      let query = supabase.from('referrals').select('*');
      
      if (periodDays) {
        const since = new Date();
        since.setDate(since.getDate() - periodDays);
        query = query.gte('created_at', since.toISOString());
      }

      const { data: referrals, error } = await query;
      if (error) throw error;
      if (!referrals?.length) return [];

      // Group by referrer
      const referrerMap: Record<string, string[]> = {};
      for (const r of referrals) {
        if (!referrerMap[r.referrer_lead_id]) referrerMap[r.referrer_lead_id] = [];
        referrerMap[r.referrer_lead_id].push(r.referred_lead_id);
      }

      const allReferrerIds = Object.keys(referrerMap);
      const allReferredIds = referrals.map(r => r.referred_lead_id);
      const allIds = [...new Set([...allReferrerIds, ...allReferredIds])];

      const { data: leads } = await supabase
        .from('leads').select('id, name, phone, status, treatment_value').in('id', allIds);

      const leadMap = Object.fromEntries((leads || []).map(l => [l.id, l]));

      const ranking: ReferrerRanking[] = allReferrerIds.map(referrerId => {
        const referrer = leadMap[referrerId];
        const referredIds = referrerMap[referrerId];
        let attended = 0, converted = 0, revenue = 0;

        for (const rid of referredIds) {
          const referred = leadMap[rid];
          if (referred) {
            if (referred.status === 'compareceu' || referred.status === 'fechado') attended++;
            if (referred.status === 'fechado') { converted++; revenue += Number(referred.treatment_value || 0); }
          }
        }

        return {
          leadId: referrerId,
          name: referrer?.name || 'Desconhecido',
          phone: referrer?.phone || '',
          totalReferrals: referredIds.length,
          attended,
          converted,
          revenue,
        };
      });

      return ranking.sort((a, b) => b.totalReferrals - a.totalReferrals);
    },
  });
}
