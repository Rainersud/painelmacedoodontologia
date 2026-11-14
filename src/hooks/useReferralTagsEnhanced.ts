import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralTags {
  isReferred: boolean;
  isReferrer: boolean;
  hasDiscount: boolean;
  referralCount: number;
  convertedCount: number;
  referrerName: string | undefined;
  discountValue: number;
  discountType: string;
  rewardValue: number;
  rewardType: string;
  attendanceDiscountApplied: boolean;
  pendingBonuses: { referredName: string; rewardValue: number; referralId: string }[];
}

const EMPTY_TAGS: ReferralTags = {
  isReferred: false, isReferrer: false, hasDiscount: false,
  referralCount: 0, convertedCount: 0, referrerName: undefined,
  discountValue: 0, discountType: 'percentual',
  rewardValue: 0, rewardType: 'dinheiro',
  attendanceDiscountApplied: false,
  pendingBonuses: [],
};

const CONVERTED = new Set(['fechado', 'tratamento_andamento', 'concluido']);

/**
 * Etiquetas de indicação de todos os leads numa única busca. Antes cada card do funil
 * fazia 2 a 4 buscas próprias (milhares de uma vez), o que travava a tela.
 */
function useAllReferralTags() {
  return useQuery({
    queryKey: ['referral-tags-enhanced', 'all'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: refs, error } = await supabase
        .from('referrals')
        .select('id, referrer_lead_id, referred_lead_id, discount_value, discount_type, attendance_discount_applied, reward_value, reward_type, bonus_status');
      if (error) throw error;
      const rows = refs || [];
      const ids = [...new Set(rows.flatMap(r => [r.referrer_lead_id, r.referred_lead_id]))];
      const people = new Map<string, { name: string; status: string }>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from('leads').select('id, name, status').in('id', ids.slice(i, i + 200));
        for (const l of data || []) people.set(l.id, { name: l.name, status: l.status });
      }
      const map = new Map<string, ReferralTags>();
      const get = (id: string) => {
        let t = map.get(id);
        if (!t) { t = { ...EMPTY_TAGS, pendingBonuses: [] }; map.set(id, t); }
        return t;
      };
      for (const r of rows) {
        const referred = get(r.referred_lead_id);
        referred.isReferred = true;
        referred.discountValue = Number(r.discount_value) || 0;
        referred.hasDiscount = referred.discountValue > 0;
        referred.discountType = r.discount_type || 'percentual';
        referred.attendanceDiscountApplied = !!r.attendance_discount_applied;
        referred.referrerName = people.get(r.referrer_lead_id)?.name;

        const referrer = get(r.referrer_lead_id);
        if (!referrer.isReferrer) referrer.rewardType = r.reward_type || 'dinheiro';
        referrer.isReferrer = true;
        referrer.referralCount += 1;
        referrer.rewardValue += Number(r.reward_value || 0);
        const target = people.get(r.referred_lead_id);
        if (target && CONVERTED.has(target.status)) {
          referrer.convertedCount += 1;
          if (r.bonus_status !== 'pago' && Number(r.reward_value) > 0) {
            referrer.pendingBonuses.push({ referredName: target.name || 'Desconhecido', rewardValue: Number(r.reward_value), referralId: r.id });
          }
        }
      }
      return map;
    },
  });
}

export function useLeadReferralTagsEnhanced(leadId: string | undefined) {
  const q = useAllReferralTags();
  return { ...q, data: q.data ? (leadId && q.data.get(leadId)) || EMPTY_TAGS : undefined };
}
