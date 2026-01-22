import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type GoalType = 'leads_atendidos' | 'consultas_agendadas' | 'taxa_conversao' | 'taxa_comparecimento' | 'receita' | 'resgatados' | 'fechados';

export interface GoalProgress {
  type: GoalType;
  period: 'diario' | 'semanal' | 'mensal';
  target: number;
  current: number;
  remaining: number;
  percentage: number;
  status: 'green' | 'yellow' | 'red';
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
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const expectedPercentage = (elapsedDays / totalDays) * 100;

  if (percentage >= expectedPercentage * 0.9) return 'green';
  if (percentage >= expectedPercentage * 0.6) return 'yellow';
  return 'red';
};

export function useGoalsProgress() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['goals-progress', user?.id],
    queryFn: async (): Promise<GoalProgress[]> => {
      if (!user) return [];

      // Fetch goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (goalsError) throw goalsError;
      if (!goals || goals.length === 0) return [];

      const progress: GoalProgress[] = [];

      for (const goal of goals) {
        const { start, end } = getDateRange(goal.period);
        let current = 0;

        switch (goal.type) {
          case 'leads_atendidos': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .neq('status', 'novo_lead')
              .gte('updated_at', start.toISOString())
              .lte('updated_at', end.toISOString());
            current = count || 0;
            break;
          }
          case 'consultas_agendadas': {
            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .gte('scheduled_at', start.toISOString())
              .lte('scheduled_at', end.toISOString());
            current = count || 0;
            break;
          }
          case 'taxa_conversao': {
            const { count: totalLeads } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString());
            
            const { count: converted } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .in('status', ['consulta_agendada', 'confirmado', 'compareceu'])
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString());
            
            current = totalLeads ? Math.round((converted || 0) / totalLeads * 100) : 0;
            break;
          }
          case 'taxa_comparecimento': {
            const { count: scheduled } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .gte('scheduled_at', start.toISOString())
              .lte('scheduled_at', end.toISOString());
            
            const { count: attended } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .not('attended_at', 'is', null)
              .gte('scheduled_at', start.toISOString())
              .lte('scheduled_at', end.toISOString());
            
            current = scheduled ? Math.round((attended || 0) / scheduled * 100) : 0;
            break;
          }
          case 'receita': {
            const { data: appointments } = await supabase
              .from('appointments')
              .select('revenue')
              .not('attended_at', 'is', null)
              .not('revenue', 'is', null)
              .gte('attended_at', start.toISOString())
              .lte('attended_at', end.toISOString());
            
            current = appointments?.reduce((sum, app) => sum + (app.revenue || 0), 0) || 0;
            break;
          }
          case 'resgatados': {
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
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
              .eq('status', 'fechado')
              .gte('closed_at', start.toISOString())
              .lte('closed_at', end.toISOString());
            current = count || 0;
            break;
          }
        }

        const percentage = goal.target_value > 0 ? Math.min(100, Math.round((current / goal.target_value) * 100)) : 0;
        const remaining = Math.max(0, goal.target_value - current);

        progress.push({
          type: goal.type,
          period: goal.period,
          target: goal.target_value,
          current,
          remaining,
          percentage,
          status: calculateStatus(percentage, goal.period),
        });
      }

      return progress;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
