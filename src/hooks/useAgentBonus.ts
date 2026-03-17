import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgentProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface AgentBonusMetric {
  type: 'novos_leads' | 'agendamentos' | 'comparecimentos' | 'resgatados' | 'fechados';
  label: string;
  target: number;
  current: number;
  percentage: number;
  completed: boolean;
  bonusValue: number;
}

export interface AgentBonusData {
  agent: AgentProfile;
  metrics: AgentBonusMetric[];
  totalBonus: number;
  earnedBonus: number;
  funnelData: Array<{ stage: string; value: number; color: string }>;
  history: Array<{
    date: string;
    metricsCompleted: number;
    totalMetrics: number;
    bonusEarned: number;
  }>;
}

export interface BonusTarget {
  type: string;
  target: number;
  bonusValue: number;
}

const metricLabels: Record<string, string> = {
  novos_leads: 'Novos Leads',
  agendamentos: 'Agendado',
  comparecimentos: 'Compareceu',
  resgatados: 'Resgatados',
  fechados: 'Venda Realizada',
};

const metricColors: Record<string, string> = {
  novos_leads: 'hsl(var(--primary))',
  agendamentos: 'hsl(var(--chart-1))',
  comparecimentos: 'hsl(var(--chart-2))',
  resgatados: 'hsl(var(--warning))',
  fechados: 'hsl(var(--success))',
};

// Default bonus targets
const DEFAULT_TARGETS: BonusTarget[] = [
  { type: 'novos_leads', target: 36, bonusValue: 10 },
  { type: 'agendamentos', target: 9, bonusValue: 15 },
  { type: 'comparecimentos', target: 5, bonusValue: 20 },
  { type: 'resgatados', target: 3, bonusValue: 25 },
  { type: 'fechados', target: 1, bonusValue: 50 },
];

export function useAgentBonus(
  agentId?: string,
  period: 'diario' | 'semanal' | 'mensal' = 'diario'
) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const targetAgentId = agentId || user?.id;

  const getDateRange = (p: typeof period) => {
    const now = new Date();
    switch (p) {
      case 'diario':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'semanal':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'mensal':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { data: bonusTargets } = useQuery({
    queryKey: ['bonus-targets'],
    queryFn: async (): Promise<BonusTarget[]> => {
      const { data: settings } = await supabase
        .from('meta_settings')
        .select('*')
        .like('setting_key', 'bonus_%');

      if (!settings || settings.length === 0) return DEFAULT_TARGETS;

      const targets: BonusTarget[] = [];
      const types = ['novos_leads', 'agendamentos', 'comparecimentos', 'resgatados', 'fechados'];
      
      types.forEach(type => {
        const targetSetting = settings.find(s => s.setting_key === `bonus_${type}_target`);
        const valueSetting = settings.find(s => s.setting_key === `bonus_${type}_value`);
        const defaultTarget = DEFAULT_TARGETS.find(t => t.type === type)!;
        
        targets.push({
          type,
          target: targetSetting?.setting_value || defaultTarget.target,
          bonusValue: valueSetting?.setting_value || defaultTarget.bonusValue,
        });
      });

      return targets;
    },
  });

  const { data: agentData, isLoading } = useQuery({
    queryKey: ['agent-bonus', targetAgentId, period],
    queryFn: async (): Promise<AgentBonusData | null> => {
      if (!targetAgentId) return null;

      // Get agent profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetAgentId)
        .single();

      if (!profile) return null;

      const { start, end } = getDateRange(period);
      const targets = bonusTargets || DEFAULT_TARGETS;

      // Calculate current values for each metric
      const { count: novosLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', targetAgentId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const { count: agendamentos } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', targetAgentId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const { count: comparecimentos } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', targetAgentId)
        .not('attended_at', 'is', null)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString());

      const { count: resgatados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', targetAgentId)
        .eq('status', 'resgatado')
        .gte('rescued_at', start.toISOString())
        .lte('rescued_at', end.toISOString());

      const { count: fechados } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', targetAgentId)
        .eq('status', 'fechado')
        .gte('closed_at', start.toISOString())
        .lte('closed_at', end.toISOString());

      const currentValues: Record<string, number> = {
        novos_leads: novosLeads || 0,
        agendamentos: agendamentos || 0,
        comparecimentos: comparecimentos || 0,
        resgatados: resgatados || 0,
        fechados: fechados || 0,
      };

      const metrics: AgentBonusMetric[] = targets.map(t => {
        const current = currentValues[t.type] || 0;
        const percentage = t.target > 0 ? Math.min(100, Math.round((current / t.target) * 100)) : 0;
        return {
          type: t.type as AgentBonusMetric['type'],
          label: metricLabels[t.type],
          target: t.target,
          current,
          percentage,
          completed: current >= t.target,
          bonusValue: t.bonusValue,
        };
      });

      const totalBonus = metrics.reduce((sum, m) => sum + m.bonusValue, 0);
      const earnedBonus = metrics.filter(m => m.completed).reduce((sum, m) => sum + m.bonusValue, 0);

      const funnelData = metrics.map(m => ({
        stage: m.label,
        value: m.current,
        color: metricColors[m.type],
      }));

      // Get history for last 7 days
      const history: AgentBonusData['history'] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        // Simplified history - count completed metrics per day
        const { count: dayLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', targetAgentId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const { count: dayAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', targetAgentId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        let completedMetrics = 0;
        if ((dayLeads || 0) >= targets.find(t => t.type === 'novos_leads')!.target) completedMetrics++;
        if ((dayAppointments || 0) >= targets.find(t => t.type === 'agendamentos')!.target) completedMetrics++;

        history.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          metricsCompleted: completedMetrics,
          totalMetrics: 5,
          bonusEarned: completedMetrics * 20, // Simplified calculation
        });
      }

      return {
        agent: {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
        metrics,
        totalBonus,
        earnedBonus,
        funnelData,
        history,
      };
    },
    enabled: !!targetAgentId && !!bonusTargets,
    refetchInterval: 30000,
  });

  const updateBonusTarget = useMutation({
    mutationFn: async ({ type, target, bonusValue }: { type: string; target: number; bonusValue: number }) => {
      // Update target
      const { data: existingTarget } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', `bonus_${type}_target`)
        .single();

      if (existingTarget) {
        await supabase
          .from('meta_settings')
          .update({ setting_value: target })
          .eq('setting_key', `bonus_${type}_target`);
      } else {
        await supabase
          .from('meta_settings')
          .insert({
            setting_key: `bonus_${type}_target`,
            setting_value: target,
            description: `Meta diária de ${metricLabels[type]}`,
            created_by: user?.id,
          });
      }

      // Update bonus value
      const { data: existingValue } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', `bonus_${type}_value`)
        .single();

      if (existingValue) {
        await supabase
          .from('meta_settings')
          .update({ setting_value: bonusValue })
          .eq('setting_key', `bonus_${type}_value`);
      } else {
        await supabase
          .from('meta_settings')
          .insert({
            setting_key: `bonus_${type}_value`,
            setting_value: bonusValue,
            description: `Valor do bônus por ${metricLabels[type]}`,
            created_by: user?.id,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-targets'] });
      queryClient.invalidateQueries({ queryKey: ['agent-bonus'] });
    },
  });

  return {
    agentData,
    bonusTargets: bonusTargets || DEFAULT_TARGETS,
    isLoading,
    updateBonusTarget,
    isAdmin,
  };
}

export function useAllAgentsBonus(period: 'diario' | 'semanal' | 'mensal' = 'diario') {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-agents-bonus', period],
    queryFn: async (): Promise<AgentBonusData[]> => {
      // Get all agents
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      if (!profiles) return [];

      const agentsData: AgentBonusData[] = [];
      
      for (const profile of profiles) {
        // This is a simplified version - in production, you'd optimize with batch queries
        const getDateRange = (p: typeof period) => {
          const now = new Date();
          switch (p) {
            case 'diario':
              return { start: startOfDay(now), end: endOfDay(now) };
            case 'semanal':
              return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'mensal':
              return { start: startOfMonth(now), end: endOfMonth(now) };
          }
        };

        const { start, end } = getDateRange(period);

        const { count: novosLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        const { count: agendamentos } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        const targets = DEFAULT_TARGETS;
        const metrics: AgentBonusMetric[] = [
          {
            type: 'novos_leads',
            label: 'Novos Leads',
            target: targets[0].target,
            current: novosLeads || 0,
            percentage: Math.min(100, Math.round(((novosLeads || 0) / targets[0].target) * 100)),
            completed: (novosLeads || 0) >= targets[0].target,
            bonusValue: targets[0].bonusValue,
          },
          {
            type: 'agendamentos',
            label: 'Agendamentos',
            target: targets[1].target,
            current: agendamentos || 0,
            percentage: Math.min(100, Math.round(((agendamentos || 0) / targets[1].target) * 100)),
            completed: (agendamentos || 0) >= targets[1].target,
            bonusValue: targets[1].bonusValue,
          },
        ];

        agentsData.push({
          agent: {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
          metrics,
          totalBonus: targets.reduce((s, t) => s + t.bonusValue, 0),
          earnedBonus: metrics.filter(m => m.completed).reduce((s, m) => s + m.bonusValue, 0),
          funnelData: [],
          history: [],
        });
      }

      return agentsData;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });
}
