import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  leadsReceived: number;
  leadsAttended: number;
  callsMade: number;
  callsAnswered: number;
  appointmentsScheduled: number;
  appointmentsConfirmed: number;
  attendedAppointments: number;
  noShows: number;
  rescued: number;
  closed: number;
  revenue: number;
  conversionRate: number;
  attendanceRate: number;
  avgResponseTime: number;
}

export interface AgentRanking {
  rank: number;
  agentId: string;
  agentName: string;
  value: number;
  metric: 'appointments' | 'revenue' | 'conversion';
}

export function useAgentMetrics(period: 'diario' | 'semanal' | 'mensal' = 'diario', agentId?: string) {
  const { user, isAdmin } = useAuth();

  const getDateRange = () => {
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

  return useQuery({
    queryKey: ['agent-metrics', period, agentId],
    queryFn: async (): Promise<AgentMetrics[]> => {
      const { start, end } = getDateRange();

      // Get all agents (profiles)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      
      if (profilesError) throw profilesError;

      const metrics: AgentMetrics[] = [];

      for (const profile of (profiles || [])) {
        if (agentId && profile.user_id !== agentId) continue;

        // Leads received
        const { count: leadsReceived } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        // Leads attended (not novo_lead)
        const { count: leadsAttended } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .neq('status', 'novo_lead')
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString());

        // Calls made
        const { count: callsMade } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .eq('call_type', 'outbound')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        // Calls answered
        const { count: callsAnswered } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .eq('result', 'atendida')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        // Appointments scheduled
        const { count: appointmentsScheduled } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        // Confirmed
        const { count: appointmentsConfirmed } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .not('confirmed_at', 'is', null)
          .gte('scheduled_at', start.toISOString())
          .lte('scheduled_at', end.toISOString());

        // Attended
        const { count: attendedAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', profile.user_id)
          .not('attended_at', 'is', null)
          .gte('scheduled_at', start.toISOString())
          .lte('scheduled_at', end.toISOString());

        // No shows
        const { count: noShows } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .eq('status', 'nao_compareceu')
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString());

        // Rescued
        const { count: rescued } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .eq('status', 'resgatado')
          .gte('rescued_at', start.toISOString())
          .lte('rescued_at', end.toISOString());

        // Closed
        const { count: closed } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', profile.user_id)
          .eq('status', 'fechado')
          .gte('closed_at', start.toISOString())
          .lte('closed_at', end.toISOString());

        // Revenue
        const { data: revenueData } = await supabase
          .from('appointments')
          .select('revenue')
          .eq('agent_id', profile.user_id)
          .not('attended_at', 'is', null)
          .gte('attended_at', start.toISOString())
          .lte('attended_at', end.toISOString());

        const revenue = revenueData?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0;

        const conversionRate = (leadsReceived || 0) > 0 
          ? Math.round(((appointmentsScheduled || 0) / (leadsReceived || 1)) * 100) 
          : 0;

        const attendanceRate = (appointmentsScheduled || 0) > 0
          ? Math.round(((attendedAppointments || 0) / (appointmentsScheduled || 1)) * 100)
          : 0;

        metrics.push({
          agentId: profile.user_id,
          agentName: profile.full_name,
          leadsReceived: leadsReceived || 0,
          leadsAttended: leadsAttended || 0,
          callsMade: callsMade || 0,
          callsAnswered: callsAnswered || 0,
          appointmentsScheduled: appointmentsScheduled || 0,
          appointmentsConfirmed: appointmentsConfirmed || 0,
          attendedAppointments: attendedAppointments || 0,
          noShows: noShows || 0,
          rescued: rescued || 0,
          closed: closed || 0,
          revenue,
          conversionRate,
          attendanceRate,
          avgResponseTime: 0,
        });
      }

      return metrics;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useAgentRankings(period: 'diario' | 'semanal' | 'mensal' = 'mensal') {
  const { data: metrics } = useAgentMetrics(period);

  const byAppointments: AgentRanking[] = (metrics || [])
    .sort((a, b) => b.appointmentsScheduled - a.appointmentsScheduled)
    .map((m, idx) => ({
      rank: idx + 1,
      agentId: m.agentId,
      agentName: m.agentName,
      value: m.appointmentsScheduled,
      metric: 'appointments' as const,
    }));

  const byRevenue: AgentRanking[] = (metrics || [])
    .sort((a, b) => b.revenue - a.revenue)
    .map((m, idx) => ({
      rank: idx + 1,
      agentId: m.agentId,
      agentName: m.agentName,
      value: m.revenue,
      metric: 'revenue' as const,
    }));

  const byConversion: AgentRanking[] = (metrics || [])
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .map((m, idx) => ({
      rank: idx + 1,
      agentId: m.agentId,
      agentName: m.agentName,
      value: m.conversionRate,
      metric: 'conversion' as const,
    }));

  return { byAppointments, byRevenue, byConversion };
}
