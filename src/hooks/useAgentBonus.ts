import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { attendances, bookedAppointments, buildPeriod, fetchMetricsData, newLeads, sales } from '@/lib/metrics';
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

// ---------- Cálculo compartilhado (camada única de indicadores) ----------

function bonusRange(p: 'diario' | 'semanal' | 'mensal') {
  return buildPeriod(p === 'diario' ? 'hoje' : p === 'semanal' ? 'semana' : 'mes');
}

async function loadBonusTargets(): Promise<BonusTarget[]> {
  const { data: settings } = await supabase
    .from('meta_settings')
    .select('*')
    .like('setting_key', 'bonus_%');
  if (!settings || settings.length === 0) return DEFAULT_TARGETS;
  return DEFAULT_TARGETS.map(def => ({
    type: def.type,
    target: settings.find(s => s.setting_key === `bonus_${def.type}_target`)?.setting_value || def.target,
    bonusValue: settings.find(s => s.setting_key === `bonus_${def.type}_value`)?.setting_value || def.bonusValue,
  }));
}

/** Valores do atendente pelas regras únicas: agendamento = data de marcação. */
async function loadBonusValues(range: { start: Date; end: Date }) {
  const [data, { data: rescued }] = await Promise.all([
    fetchMetricsData(range),
    supabase.from('leads').select('id, assigned_agent_id')
      .eq('status', 'resgatado')
      .gte('rescued_at', range.start.toISOString())
      .lte('rescued_at', range.end.toISOString()),
  ]);
  return (agentId: string): Record<string, number> => ({
    novos_leads: newLeads(data.leads, range, agentId).length,
    agendamentos: bookedAppointments(data.appointments, range, agentId).length,
    comparecimentos: attendances(data.appointments, range, agentId).length,
    resgatados: (rescued ?? []).filter(l => l.assigned_agent_id === agentId).length,
    fechados: sales(data.leads, range, agentId).length,
  });
}

function buildBonusMetrics(targets: BonusTarget[], values: Record<string, number>): AgentBonusMetric[] {
  return targets.map(t => {
    const current = values[t.type] || 0;
    return {
      type: t.type as AgentBonusMetric['type'],
      label: metricLabels[t.type],
      target: t.target,
      current,
      percentage: t.target > 0 ? Math.min(100, Math.round((current / t.target) * 100)) : 0,
      completed: current >= t.target,
      bonusValue: t.bonusValue,
    };
  });
}

export function useAgentBonus(
  agentId?: string,
  period: 'diario' | 'semanal' | 'mensal' = 'diario'
) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const targetAgentId = agentId || user?.id;

  const { data: bonusTargets } = useQuery({
    queryKey: ['bonus-targets'],
    queryFn: loadBonusTargets,
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

      const range = bonusRange(period);
      const targets = bonusTargets || DEFAULT_TARGETS;
      const valuesFor = await loadBonusValues(range);
      const metrics = buildBonusMetrics(targets, valuesFor(targetAgentId));

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

      // Mesmas metas configuradas e mesmo cálculo da tela individual
      const [targets, valuesFor] = await Promise.all([loadBonusTargets(), loadBonusValues(bonusRange(period))]);
      const agentsData: AgentBonusData[] = profiles.map(profile => {
        const metrics = buildBonusMetrics(targets, valuesFor(profile.user_id));
        return {
          agent: {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
          metrics,
          totalBonus: metrics.reduce((sum, m) => sum + m.bonusValue, 0),
          earnedBonus: metrics.filter(m => m.completed).reduce((sum, m) => sum + m.bonusValue, 0),
          funnelData: [],
          history: [],
        };
      });

      return agentsData;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });
}
