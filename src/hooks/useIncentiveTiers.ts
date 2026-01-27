import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface IncentiveTier {
  id: string;
  name: string;
  percentage: number;
  targetRevenue: number;
  bonusAmount: number;
  isAchieved: boolean;
  progress: number;
  remaining: number;
}

export interface AgentIncentiveData {
  agentId: string;
  agentName: string;
  currentRevenue: number;
  tiers: IncentiveTier[];
  currentTier: IncentiveTier | null;
  nextTier: IncentiveTier | null;
  totalEarned: number;
}

// Default incentive tiers
const DEFAULT_TIERS = [
  { name: 'Meta 1', percentage: 1.5 },
  { name: 'Meta 2', percentage: 2.0 },
  { name: 'Meta 3', percentage: 2.5 },
  { name: 'Super Meta', percentage: 3.0 },
];

export function useIncentiveTiers(agentId?: string) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const targetAgentId = agentId || user?.id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data, isLoading } = useQuery({
    queryKey: ['incentive-tiers', targetAgentId],
    queryFn: async (): Promise<AgentIncentiveData | null> => {
      if (!targetAgentId) return null;

      // Get agent profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetAgentId)
        .maybeSingle();

      // Get tier settings from meta_settings
      const { data: settings } = await supabase
        .from('meta_settings')
        .select('*')
        .like('setting_key', 'incentive_tier_%');

      const tierPercentages: Record<string, number> = {};
      const tierTargetRevenues: Record<string, number> = {};
      (settings || []).forEach(s => {
        const percentMatch = s.setting_key.match(/incentive_tier_(\d+)_percentage/);
        if (percentMatch) {
          tierPercentages[percentMatch[1]] = s.setting_value;
        }
        const targetMatch = s.setting_key.match(/incentive_tier_(\d+)_target/);
        if (targetMatch) {
          tierTargetRevenues[targetMatch[1]] = s.setting_value;
        }
      });

      // Get base target revenue from meta_settings
      const { data: revenueSetting } = await supabase
        .from('meta_settings')
        .select('setting_value')
        .eq('setting_key', 'meta_faturamento')
        .maybeSingle();

      const baseTargetRevenue = revenueSetting?.setting_value || 168000;

      // Get agent's current revenue
      const { data: revenueData } = await supabase
        .from('appointments')
        .select('revenue')
        .eq('agent_id', targetAgentId)
        .not('attended_at', 'is', null)
        .not('revenue', 'is', null)
        .gte('attended_at', monthStart.toISOString())
        .lte('attended_at', monthEnd.toISOString());

      const currentRevenue = (revenueData || []).reduce((sum, a) => sum + (a.revenue || 0), 0);

      // Default tier targets (70%, 80%, 90%, 100% of base)
      const defaultTierTargets = [
        baseTargetRevenue * 0.7,  // Meta 1: 70%
        baseTargetRevenue * 0.8,  // Meta 2: 80%
        baseTargetRevenue * 0.9,  // Meta 3: 90%
        baseTargetRevenue,        // Super Meta: 100%
      ];

      // Build tiers
      const tiers: IncentiveTier[] = DEFAULT_TIERS.map((tier, index) => {
        const percentage = tierPercentages[String(index + 1)] || tier.percentage;
        const tierTargetRevenue = tierTargetRevenues[String(index + 1)] || defaultTierTargets[index];
        const bonusAmount = currentRevenue * (percentage / 100);
        const isAchieved = currentRevenue >= tierTargetRevenue;
        const progress = Math.min(100, Math.round((currentRevenue / tierTargetRevenue) * 100));
        const remaining = Math.max(0, tierTargetRevenue - currentRevenue);

        return {
          id: `tier-${index + 1}`,
          name: tier.name,
          percentage,
          targetRevenue: tierTargetRevenue,
          bonusAmount,
          isAchieved,
          progress,
          remaining,
        };
      });

      // Find current and next tier
      const achievedTiers = tiers.filter(t => t.isAchieved);
      const currentTier = achievedTiers.length > 0 ? achievedTiers[achievedTiers.length - 1] : null;
      const notAchievedTiers = tiers.filter(t => !t.isAchieved);
      const nextTier = notAchievedTiers.length > 0 ? notAchievedTiers[0] : null;

      const totalEarned = currentTier ? currentTier.bonusAmount : 0;

      return {
        agentId: targetAgentId,
        agentName: profile?.full_name || 'Usuário',
        currentRevenue,
        tiers,
        currentTier,
        nextTier,
        totalEarned,
      };
    },
    enabled: !!targetAgentId,
    refetchInterval: 30000,
  });

  const updateTierPercentage = useMutation({
    mutationFn: async ({ tierIndex, percentage }: { tierIndex: number; percentage: number }) => {
      const settingKey = `incentive_tier_${tierIndex}_percentage`;
      
      const { data: existing } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('meta_settings')
          .update({ setting_value: percentage, updated_at: new Date().toISOString() })
          .eq('setting_key', settingKey);
      } else {
        await supabase
          .from('meta_settings')
          .insert({
            setting_key: settingKey,
            setting_value: percentage,
            description: `Percentual da ${DEFAULT_TIERS[tierIndex - 1]?.name || 'Meta'}`,
            created_by: user?.id,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-tiers'] });
    },
  });

  const updateTierTarget = useMutation({
    mutationFn: async ({ tierIndex, targetRevenue }: { tierIndex: number; targetRevenue: number }) => {
      const settingKey = `incentive_tier_${tierIndex}_target`;
      
      const { data: existing } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('meta_settings')
          .update({ setting_value: targetRevenue, updated_at: new Date().toISOString() })
          .eq('setting_key', settingKey);
      } else {
        await supabase
          .from('meta_settings')
          .insert({
            setting_key: settingKey,
            setting_value: targetRevenue,
            description: `Meta de faturamento da ${DEFAULT_TIERS[tierIndex - 1]?.name || 'Meta'}`,
            created_by: user?.id,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-tiers'] });
    },
  });

  return {
    data,
    isLoading,
    updateTierPercentage,
    updateTierTarget,
    isAdmin,
  };
}

export function useAllAgentsIncentives() {
  const { isAdmin } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return useQuery({
    queryKey: ['all-agents-incentives'],
    queryFn: async (): Promise<AgentIncentiveData[]> => {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      if (!profiles) return [];

      // Get target revenue
      const { data: revenueSetting } = await supabase
        .from('meta_settings')
        .select('setting_value')
        .eq('setting_key', 'meta_faturamento')
        .maybeSingle();

      const targetRevenue = revenueSetting?.setting_value || 168000;

      const agentsData: AgentIncentiveData[] = [];

      for (const profile of profiles) {
        const { data: revenueData } = await supabase
          .from('appointments')
          .select('revenue')
          .eq('agent_id', profile.user_id)
          .not('attended_at', 'is', null)
          .not('revenue', 'is', null)
          .gte('attended_at', monthStart.toISOString())
          .lte('attended_at', monthEnd.toISOString());

        const currentRevenue = (revenueData || []).reduce((sum, a) => sum + (a.revenue || 0), 0);

        const tiers: IncentiveTier[] = DEFAULT_TIERS.map((tier, index) => {
          const tierTargetRevenue = targetRevenue * (0.7 + index * 0.1);
          const bonusAmount = currentRevenue * (tier.percentage / 100);
          const isAchieved = currentRevenue >= tierTargetRevenue;
          const progress = Math.min(100, Math.round((currentRevenue / tierTargetRevenue) * 100));
          const remaining = Math.max(0, tierTargetRevenue - currentRevenue);

          return {
            id: `tier-${index + 1}`,
            name: tier.name,
            percentage: tier.percentage,
            targetRevenue: tierTargetRevenue,
            bonusAmount,
            isAchieved,
            progress,
            remaining,
          };
        });

        const achievedTiers = tiers.filter(t => t.isAchieved);
        const currentTier = achievedTiers.length > 0 ? achievedTiers[achievedTiers.length - 1] : null;
        const notAchievedTiers = tiers.filter(t => !t.isAchieved);
        const nextTier = notAchievedTiers.length > 0 ? notAchievedTiers[0] : null;

        agentsData.push({
          agentId: profile.user_id,
          agentName: profile.full_name,
          currentRevenue,
          tiers,
          currentTier,
          nextTier,
          totalEarned: currentTier ? currentTier.bonusAmount : 0,
        });
      }

      return agentsData;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });
}
