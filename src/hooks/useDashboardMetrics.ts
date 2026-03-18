import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, differenceInSeconds } from 'date-fns';

export interface DashboardMetrics {
  // KPIs principais
  newLeads: number;
  attendedLeads: number;
  scheduledAppointments: number;
  conversionRate: number;
  revenue: number;
  attendanceRate: number;
  avgResponseTime: number; // in minutes
  marketingROI: number;
  
  // Comparação com período anterior
  newLeadsChange: number;
  attendedLeadsChange: number;
  scheduledAppointmentsChange: number;
  conversionRateChange: number;
  revenueChange: number;
  attendanceRateChange: number;
  avgResponseTimeChange: number;
  marketingROIChange: number;
  
  // Dados para gráficos
  leadsOverTime: Array<{ name: string; leads: number; consultas: number }>;
  conversionByMonth: Array<{ name: string; taxa: number }>;
  leadsBySource: Array<{ name: string; value: number; color: string }>;
  recentLeads: Array<{
    id: string;
    name: string;
    source: string;
    time: string;
    status: string;
  }>;
}

const sourceLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  site: 'Site',
  indicacao: 'Indicação',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  outro: 'Outro',
};

const sourceColors: Record<string, string> = {
  whatsapp: 'hsl(142, 70%, 45%)',
  telefone: 'hsl(199, 89%, 48%)',
  instagram: 'hsl(340, 75%, 55%)',
  google_ads: 'hsl(38, 92%, 50%)',
  facebook: 'hsl(221, 44%, 41%)',
  indicacao: 'hsl(262, 80%, 55%)',
  site: 'hsl(180, 70%, 45%)',
  outro: 'hsl(0, 0%, 50%)',
};

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMinutes = differenceInMinutes(now, date);
  
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hora${Math.floor(diffMinutes / 60) > 1 ? 's' : ''}`;
  return `${Math.floor(diffMinutes / 1440)} dia${Math.floor(diffMinutes / 1440) > 1 ? 's' : ''}`;
}

export function useDashboardMetrics(period: 'diario' | 'semanal' | 'mensal' = 'mensal') {
  return useQuery({
    queryKey: ['dashboard-metrics', period],
    queryFn: async (): Promise<DashboardMetrics> => {
      const now = new Date();
      
      // Current period range
      let start: Date, end: Date;
      let prevStart: Date, prevEnd: Date;
      
      switch (period) {
        case 'diario':
          start = startOfDay(now);
          end = endOfDay(now);
          prevStart = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
          prevEnd = endOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
          break;
        case 'semanal':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          prevStart = startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
          prevEnd = endOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
          break;
        case 'mensal':
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevStart = startOfMonth(prevMonth);
          prevEnd = endOfMonth(prevMonth);
          break;
      }

      // Fetch all leads for current period
      const { data: currentLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      if (leadsError) throw leadsError;

      // Fetch leads for previous period
      const { data: previousLeads } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString());

      // Fetch appointments for current period
      const { data: currentAppointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString());

      // Fetch appointments for previous period
      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_at', prevStart.toISOString())
        .lte('scheduled_at', prevEnd.toISOString());

      // Fetch marketing investment from meta_settings
      const { data: investmentSetting } = await supabase
        .from('meta_settings')
        .select('setting_value')
        .eq('setting_key', 'investimento_marketing')
        .single();

      const marketingInvestment = investmentSetting?.setting_value || 10000;

      // Calculate current metrics
      const leads = currentLeads || [];
      const prevLeadsArr = previousLeads || [];
      const appointments = currentAppointments || [];
      const prevAppointmentsArr = previousAppointments || [];

      const newLeads = leads.length;
      const attendedLeads = leads.filter(l => l.status !== 'novo_lead').length;
      const scheduledAppointments = appointments.length;
      const attendedAppointments = appointments.filter(a => a.attended_at).length;
      // Revenue from PAYMENTS table only (single source of truth)
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago')
        .gte('paid_at', start.toISOString())
        .lte('paid_at', end.toISOString());
      const revenue = (paidPayments || []).reduce((sum, p) => sum + (p.net_value || 0), 0);
      
      const conversionRate = newLeads > 0 ? Math.round((scheduledAppointments / newLeads) * 100) : 0;
      const attendanceRate = scheduledAppointments > 0 ? Math.round((attendedAppointments / scheduledAppointments) * 100) : 0;
      const marketingROI = marketingInvestment > 0 ? parseFloat((revenue / marketingInvestment).toFixed(1)) : 0;

      // Calculate average response time
      const leadsWithResponse = leads.filter(l => l.first_response_at && l.created_at);
      const avgResponseTime = leadsWithResponse.length > 0
        ? Math.round(leadsWithResponse.reduce((sum, l) => {
            const responseSeconds = differenceInSeconds(new Date(l.first_response_at!), new Date(l.created_at));
            return sum + responseSeconds;
          }, 0) / leadsWithResponse.length / 60)
        : 0;

      // Calculate previous period metrics for comparison
      const prevNewLeads = prevLeadsArr.length;
      const prevAttendedLeads = prevLeadsArr.filter(l => l.status !== 'novo_lead').length;
      const prevScheduledAppointments = prevAppointmentsArr.length;
      const prevAttendedAppointments = prevAppointmentsArr.filter(a => a.attended_at).length;
      const prevRevenue = prevAppointmentsArr.filter(a => a.attended_at && a.revenue).reduce((sum, a) => sum + (a.revenue || 0), 0);
      const prevConversionRate = prevNewLeads > 0 ? Math.round((prevScheduledAppointments / prevNewLeads) * 100) : 0;
      const prevAttendanceRate = prevScheduledAppointments > 0 ? Math.round((prevAttendedAppointments / prevScheduledAppointments) * 100) : 0;

      // Calculate changes
      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Leads over time (last 7 days)
      const leadsOverTime: Array<{ name: string; leads: number; consultas: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const { count: dayLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const { count: dayAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_at', dayStart.toISOString())
          .lte('scheduled_at', dayEnd.toISOString());

        leadsOverTime.push({
          name: dayNames[date.getDay()],
          leads: dayLeads || 0,
          consultas: dayAppointments || 0,
        });
      }

      // Conversion by month (last 6 months)
      const conversionByMonth: Array<{ name: string; taxa: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const { count: monthLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { count: monthAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_at', monthStart.toISOString())
          .lte('scheduled_at', monthEnd.toISOString());

        const rate = monthLeads && monthLeads > 0 ? Math.round((monthAppointments || 0) / monthLeads * 100) : 0;
        conversionByMonth.push({
          name: monthNames[monthDate.getMonth()],
          taxa: rate,
        });
      }

      // Leads by source
      const sourceCounts: Record<string, number> = {};
      leads.forEach(lead => {
        const source = lead.source || 'outro';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const totalLeads = leads.length || 1;
      const leadsBySource = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          name: sourceLabels[source] || source,
          value: Math.round((count / totalLeads) * 100),
          color: sourceColors[source] || sourceColors.outro,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Recent leads
      const { data: recentLeadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentLeads = (recentLeadsData || []).map(lead => ({
        id: lead.id,
        name: lead.name,
        source: sourceLabels[lead.source] || lead.source,
        time: formatTimeAgo(new Date(lead.created_at)),
        status: lead.status,
      }));

      return {
        newLeads,
        attendedLeads,
        scheduledAppointments,
        conversionRate,
        revenue,
        attendanceRate,
        avgResponseTime,
        marketingROI,
        
        newLeadsChange: calcChange(newLeads, prevNewLeads),
        attendedLeadsChange: calcChange(attendedLeads, prevAttendedLeads),
        scheduledAppointmentsChange: calcChange(scheduledAppointments, prevScheduledAppointments),
        conversionRateChange: calcChange(conversionRate, prevConversionRate),
        revenueChange: calcChange(revenue, prevRevenue),
        attendanceRateChange: calcChange(attendanceRate, prevAttendanceRate),
        avgResponseTimeChange: calcChange(avgResponseTime, 5), // Compare to SLA of 5 min
        marketingROIChange: calcChange(marketingROI, marketingROI * 0.85), // Previous ROI estimate
        
        leadsOverTime,
        conversionByMonth,
        leadsBySource,
        recentLeads,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
