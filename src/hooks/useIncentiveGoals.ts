import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface IncentivePlan {
  id: string;
  name: string;
  period: 'diario' | 'semanal' | 'mensal';
  target_type: 'agendamentos' | 'comparecimentos' | 'resgatados' | 'fechados';
  target_value: number;
  bonus_value: number;
  is_active: boolean;
}

export interface GoalWithIncentive {
  type: string;
  period: 'diario' | 'semanal' | 'mensal';
  target: number;
  current: number;
  remaining: number;
  percentage: number;
  status: 'green' | 'yellow' | 'red';
  bonusValue: number;
  bonusEarned: boolean;
}

export interface WeeklyIncentiveSummary {
  totalBonus: number;
  earnedBonus: number;
  goalsCompleted: number;
  totalGoals: number;
  allGoalsMet: boolean;
}

const getDateRange = (period: 'diario' | 'semanal' | 'mensal') => {
  const now = new Date();
  switch (period) {
    case 'diario':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'semanal':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'mensal':
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

const calculateStatus = (percentage: number, period: 'diario' | 'semanal' | 'mensal'): 'green' | 'yellow' | 'red' => {
  const now = new Date();
  const { start, end } = getDateRange(period);
  const totalTime = end.getTime() - start.getTime();
  const elapsedTime = now.getTime() - start.getTime();
  const expectedPercentage = (elapsedTime / totalTime) * 100;

  if (percentage >= expectedPercentage * 0.9) return 'green';
  if (percentage >= expectedPercentage * 0.6) return 'yellow';
  return 'red';
};

export function useIncentiveGoals(agentId?: string) {
  const { user } = useAuth();
  const targetAgentId = agentId || user?.id;

  return useQuery({
    queryKey: ['incentive-goals', targetAgentId],
    queryFn: async (): Promise<{ goals: GoalWithIncentive[]; weeklySummary: WeeklyIncentiveSummary }> => {
      if (!targetAgentId) return { goals: [], weeklySummary: { totalBonus: 0, earnedBonus: 0, goalsCompleted: 0, totalGoals: 0, allGoalsMet: false } };

      // Fetch incentive plans
      const { data: plans, error: plansError } = await supabase
        .from('incentive_plans')
        .select('*')
        .eq('is_active', true);

      if (plansError) throw plansError;

      const goals: GoalWithIncentive[] = [];
      let weeklySummary: WeeklyIncentiveSummary = {
        totalBonus: 0,
        earnedBonus: 0,
        goalsCompleted: 0,
        totalGoals: 0,
        allGoalsMet: true,
      };

      for (const plan of (plans || [])) {
        const { start, end } = getDateRange(plan.period);
        let current = 0;

        switch (plan.target_type) {
          case 'agendamentos': {
            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', targetAgentId)
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString());
            current = count || 0;
            break;
          }
          case 'comparecimentos': {
            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', targetAgentId)
              .not('attended_at', 'is', null)
              .gte('scheduled_at', start.toISOString())
              .lte('scheduled_at', end.toISOString());
            current = count || 0;
            break;
          }
          case 'resgatados': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_agent_id', targetAgentId)
              .eq('status', 'resgatado')
              .gte('rescued_at', start.toISOString())
              .lte('rescued_at', end.toISOString());
            current = count || 0;
            break;
          }
          case 'fechados': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_agent_id', targetAgentId)
              .eq('status', 'fechado')
              .gte('closed_at', start.toISOString())
              .lte('closed_at', end.toISOString());
            current = count || 0;
            break;
          }
        }

        const percentage = plan.target_value > 0 ? Math.min(100, Math.round((current / plan.target_value) * 100)) : 0;
        const remaining = Math.max(0, plan.target_value - current);
        const bonusEarned = current >= plan.target_value;

        goals.push({
          type: plan.target_type,
          period: plan.period,
          target: plan.target_value,
          current,
          remaining,
          percentage,
          status: calculateStatus(percentage, plan.period),
          bonusValue: plan.bonus_value,
          bonusEarned,
        });

        // Calculate weekly summary for daily goals
        if (plan.period === 'diario') {
          weeklySummary.totalBonus += plan.bonus_value * 7; // 7 days in a week
          weeklySummary.totalGoals += 1;
          if (bonusEarned) {
            weeklySummary.earnedBonus += plan.bonus_value;
            weeklySummary.goalsCompleted += 1;
          } else {
            weeklySummary.allGoalsMet = false;
          }
        }
      }

      return { goals, weeklySummary };
    },
    enabled: !!targetAgentId,
    refetchInterval: 30000,
  });
}
