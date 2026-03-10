import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLeadReferralTagsEnhanced(leadId: string | undefined) {
  return useQuery({
    queryKey: ['referral-tags-enhanced', leadId],
    queryFn: async () => {
      if (!leadId) return { isReferred: false, isReferrer: false, hasDiscount: false, referralCount: 0, referrerName: undefined, discountValue: 0, rewardValue: 0, rewardType: 'dinheiro' };

      const [{ data: asReferred }, { data: asReferrer }] = await Promise.all([
        supabase.from('referrals').select('id, discount_value, discount_type, attendance_discount_applied, referrer_lead_id').eq('referred_lead_id', leadId).maybeSingle(),
        supabase.from('referrals').select('id, reward_value, reward_type').eq('referrer_lead_id', leadId),
      ]);

      let referrerName: string | undefined;
      if (asReferred) {
        const { data: referrerLead } = await supabase.from('leads').select('name').eq('id', asReferred.referrer_lead_id).maybeSingle();
        referrerName = referrerLead?.name;
      }

      // Sum total rewards for referrer
      const totalRewardValue = (asReferrer || []).reduce((sum, r) => sum + Number(r.reward_value || 0), 0);
      const rewardType = (asReferrer || [])[0]?.reward_type || 'dinheiro';

      return {
        isReferred: !!asReferred,
        hasDiscount: asReferred ? (Number(asReferred.discount_value) > 0) : false,
        discountValue: asReferred ? Number(asReferred.discount_value) : 0,
        attendanceDiscountApplied: asReferred?.attendance_discount_applied || false,
        isReferrer: (asReferrer || []).length > 0,
        referralCount: (asReferrer || []).length,
        referrerName,
        rewardValue: totalRewardValue,
        rewardType,
      };
    },
    enabled: !!leadId,
  });
}
