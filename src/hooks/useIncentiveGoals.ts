import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
} from 'date-fns';

export type IncentivePeriod = 'diario' | 'semanal' | 'mensal';
export type IncentiveTargetType = 'agendamentos' | 'comparecimentos' | 'indicacoes' | 'fechados' | 'resgatados';

export interface IncentivePlan {
  id: string;
  name: string;
  period: IncentivePeriod;
  target_type: IncentiveTargetType;
  target_value: number;
  bonus_value: number;
  is_active: boolean;
}

export interface GoalWithIncentive {
  id: string;
  name: string;
  type: IncentiveTargetType;
  period: IncentivePeriod;
  target: number;
  current: number;
  remaining: number;
  percentage: number;
  /** Ritmo esperado (% baseado no tempo decorrido) */
  expectedPercentage: number;
  /** azul=saudável, verde=atenção, vermelho=crítico */
  status: 'azul' | 'verde' | 'vermelho';
  bonusValue: number;
  bonusEarned: boolean;
  /** Projeção: se mantiver ritmo, atinge quanto até o fim do período */
  projectedFinal: number;
}

export interface IncentiveSummary {
  totalBonus: number;
  earnedBonus: number;
  potentialBonus: number;
  goalsCompleted: number;
  totalGoals: number;
  allGoalsMet: boolean;
}

const getDateRange = (period: IncentivePeriod) => {
  const now = new Date();
  switch (period) {
    case 'diario': return { start: startOfDay(now), end: endOfDay(now) };
    case 'semanal': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'mensal': return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

const colorFor = (pct: number, expected: number): 'azul' | 'verde' | 'vermelho' => {
  if (pct >= expected * 0.95) return 'azul';
  if (pct >= expected * 0.65) return 'verde';
  return 'vermelho';
};

export function useIncentiveGoals(agentId?: string) {
  const { user } = useAuth();
  const targetAgentId = agentId || user?.id;

  return useQuery({
    queryKey: ['incentive-goals-v2', targetAgentId],
    queryFn: async (): Promise<{ goals: GoalWithIncentive[]; summary: IncentiveSummary }> => {
      if (!targetAgentId) {
        return {
          goals: [],
          summary: { totalBonus: 0, earnedBonus: 0, potentialBonus: 0, goalsCompleted: 0, totalGoals: 0, allGoalsMet: false },
        };
      }

      const { data: plans } = await supabase
        .from('incentive_plans')
        .select('*')
        .eq('is_active', true);

      const goals: GoalWithIncentive[] = [];
      let earnedBonus = 0;
      let potentialBonus = 0;
      let goalsCompleted = 0;

      for (const plan of (plans ?? []) as IncentivePlan[]) {
        const { start, end } = getDateRange(plan.period);
        const startISO = start.toISOString();
        const endISO = end.toISOString();
        let current = 0;

        switch (plan.target_type) {
          case 'agendamentos': {
            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', targetAgentId)
              .gte('created_at', startISO)
              .lte('created_at', endISO);
            current = count || 0;
            break;
          }
          case 'comparecimentos': {
            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', targetAgentId)
              .not('attended_at', 'is', null)
              .gte('attended_at', startISO)
              .lte('attended_at', endISO);
            current = count || 0;
            break;
          }
          case 'fechados': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_agent_id', targetAgentId)
              .eq('status', 'fechado')
              .gte('closed_at', startISO)
              .lte('closed_at', endISO);
            current = count || 0;
            break;
          }
          case 'indicacoes': {
            // referrals criadas no período cujo referrer_lead pertence ao agente
            const { data: refs } = await supabase
              .from('referrals')
              .select('referrer_lead_id, created_at')
              .gte('created_at', startISO)
              .lte('created_at', endISO);
            const ids = Array.from(new Set((refs ?? []).map(r => r.referrer_lead_id)));
            if (ids.length) {
              const { data: refLeads } = await supabase
                .from('leads')
                .select('id, assigned_agent_id')
                .in('id', ids)
                .eq('assigned_agent_id', targetAgentId);
              const owned = new Set((refLeads ?? []).map(l => l.id));
              current = (refs ?? []).filter(r => owned.has(r.referrer_lead_id)).length;
            } else {
              current = 0;
            }
            break;
          }
          case 'resgatados': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_agent_id', targetAgentId)
              .eq('status', 'resgatado')
              .gte('rescued_at', startISO)
              .lte('rescued_at', endISO);
            current = count || 0;
            break;
          }
        }

        const percentage = plan.target_value > 0 ? Math.min(999, Math.round((current / plan.target_value) * 100)) : 0;
        const remaining = Math.max(0, plan.target_value - current);
        const bonusEarned = current >= plan.target_value;

        const total = end.getTime() - start.getTime();
        const elapsed = Math.max(0, Math.min(total, Date.now() - start.getTime()));
        const elapsedFraction = total > 0 ? elapsed / total : 1;
        const expectedPercentage = Math.round(elapsedFraction * 100);
        const projectedFinal = elapsedFraction > 0 ? Math.round(current / elapsedFraction) : current;

        goals.push({
          id: plan.id,
          name: plan.name,
          type: plan.target_type,
          period: plan.period,
          target: plan.target_value,
          current,
          remaining,
          percentage,
          expectedPercentage,
          status: colorFor(percentage, Math.max(expectedPercentage, 1)),
          bonusValue: plan.bonus_value,
          bonusEarned,
          projectedFinal,
        });

        potentialBonus += plan.bonus_value;
        if (bonusEarned) {
          earnedBonus += plan.bonus_value;
          goalsCompleted += 1;
        }
      }

      return {
        goals,
        summary: {
          totalBonus: potentialBonus,
          earnedBonus,
          potentialBonus,
          goalsCompleted,
          totalGoals: goals.length,
          allGoalsMet: goals.length > 0 && goalsCompleted === goals.length,
        },
      };
    },
    enabled: !!targetAgentId,
    refetchInterval: 30000,
  });
}
