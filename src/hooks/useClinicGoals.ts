import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

// Default healthy rates configuration (used when no DB values exist)
// MENSAL: 300 leads, 90 comparecimentos (30%), 23 fechamentos
// SEMANAL: 75 leads, 22-23 comparecimentos, 5-6 fechamentos  
// DIÁRIO: 15 leads, 4-5 comparecimentos, 1-2 fechamentos
export const DEFAULT_HEALTHY_RATES = {
  // Metas Mensais
  leads: { target: 300, rate: 100, label: 'Leads' },
  agendamentos: { target: 90, rate: 30, label: 'Agendamentos' }, // 30% de conversão
  comparecimentos: { target: 90, rate: 100, label: 'Comparecimentos' }, // 100% dos agendados
  fechamentos: { target: 23, rate: 26, label: 'Fechamentos' }, // ~26% de fechamento
  ticketMedio: { target: 12000, label: 'Ticket Médio' },
  faturamento: { target: 276000, label: 'Faturamento' }, // 23 vendas * R$12.000
  investimento: { target: 15700, label: 'Investimento' },
  roi: { target: 17.6, label: 'ROI' }, // 276000 / 15700
  
  // Metas Semanais (4 semanas)
  leads_semanal: { target: 75, label: 'Leads/Semana' },
  agendamentos_semanal: { target: 23, label: 'Agendamentos/Semana' },
  comparecimentos_semanal: { target: 23, label: 'Comparecimentos/Semana' },
  fechamentos_semanal: { target: 6, label: 'Fechamentos/Semana' },
  
  // Metas Diárias (20 dias úteis)
  leads_diario: { target: 15, label: 'Leads/Dia' },
  agendamentos_diario: { target: 5, label: 'Agendamentos/Dia' },
  comparecimentos_diario: { target: 5, label: 'Comparecimentos/Dia' },
  fechamentos_diario: { target: 1, label: 'Fechamentos/Dia' },
};

// For backwards compatibility
export const HEALTHY_RATES = DEFAULT_HEALTHY_RATES;

export interface HealthyRates {
  leads: { target: number; rate: number };
  agendamentos: { target: number; rate: number };
  comparecimentos: { target: number; rate: number };
  fechamentos: { target: number; rate: number };
  ticketMedio: { target: number };
  faturamento: { target: number };
  investimento: { target: number };
  roi: { target: number };
}

export interface ClinicGoal {
  key: string;
  label: string;
  target: number;
  current: number;
  rate?: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
  remaining: number;
  isEditable?: boolean;
}

export interface ClinicGoalsData {
  goals: ClinicGoal[];
  funnelData: Array<{ stage: string; value: number; rate: number; targetRate: number; color: string; key: string }>;
  healthyRates: HealthyRates;
}

export function useClinicGoals() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data, isLoading, error } = useQuery({
    queryKey: ['clinic-goals'],
    queryFn: async (): Promise<ClinicGoalsData> => {
      // Fetch meta_settings for targets
      const { data: settings } = await supabase
        .from('meta_settings')
        .select('*');

      const settingsMap: Record<string, number> = {};
      (settings || []).forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });

      // Get current values from database
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const { count: agendamentosCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString());

      const { count: comparecimentosCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .not('attended_at', 'is', null)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString());

      const { count: fechamentosCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fechado')
        .gte('closed_at', monthStart.toISOString())
        .lte('closed_at', monthEnd.toISOString());

      // Get real received revenue from payments table (net_value of paid payments)
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago')
        .gte('paid_at', monthStart.toISOString())
        .lte('paid_at', monthEnd.toISOString());

      const paymentsRevenue = (paidPayments || []).reduce((sum, p) => sum + (p.net_value || 0), 0);

      // Single source of truth: revenue comes ONLY from payments table
      const totalRevenue = paymentsRevenue;
      const ticketMedio = fechamentosCount && fechamentosCount > 0 
        ? Math.round(totalRevenue / fechamentosCount) 
        : 0;

      // Get targets from settings or use defaults
      const leadsTarget = settingsMap['meta_leads'] || HEALTHY_RATES.leads.target;
      const agendamentosTarget = settingsMap['meta_agendamentos'] || HEALTHY_RATES.agendamentos.target;
      const comparecimentosTarget = settingsMap['meta_comparecimentos'] || HEALTHY_RATES.comparecimentos.target;
      const fechamentosTarget = settingsMap['meta_fechamentos'] || HEALTHY_RATES.fechamentos.target;
      const ticketMedioTarget = settingsMap['meta_ticket_medio'] || HEALTHY_RATES.ticketMedio.target;
      const faturamentoTarget = settingsMap['meta_faturamento'] || HEALTHY_RATES.faturamento.target;
      const investimentoValue = settingsMap['investimento_marketing'] || HEALTHY_RATES.investimento.target;
      const roiTarget = settingsMap['meta_roi'] || HEALTHY_RATES.roi.target;

      // Get target rates from settings or use defaults
      const agendamentosTargetRate = settingsMap['taxa_agendamentos'] || HEALTHY_RATES.agendamentos.rate;
      const comparecimentosTargetRate = settingsMap['taxa_comparecimentos'] || HEALTHY_RATES.comparecimentos.rate;
      const fechamentosTargetRate = settingsMap['taxa_fechamentos'] || HEALTHY_RATES.fechamentos.rate;

      const currentROI = investimentoValue > 0 ? parseFloat((totalRevenue / investimentoValue).toFixed(1)) : 0;

      // Build healthy rates object from DB or defaults
      const healthyRates: HealthyRates = {
        leads: { target: leadsTarget, rate: 100 },
        agendamentos: { target: agendamentosTarget, rate: agendamentosTargetRate },
        comparecimentos: { target: comparecimentosTarget, rate: comparecimentosTargetRate },
        fechamentos: { target: fechamentosTarget, rate: fechamentosTargetRate },
        ticketMedio: { target: ticketMedioTarget },
        faturamento: { target: faturamentoTarget },
        investimento: { target: investimentoValue },
        roi: { target: roiTarget },
      };

      const calculateStatus = (current: number, target: number): 'healthy' | 'warning' | 'critical' => {
        const ratio = current / target;
        if (ratio >= 0.8) return 'healthy';
        if (ratio >= 0.5) return 'warning';
        return 'critical';
      };

      // Revenue is already calculated from payments (net received) above

      const goals: ClinicGoal[] = [
        {
          key: 'leads',
          label: 'Novos Leads',
          target: leadsTarget,
          current: leadsCount || 0,
          rate: 100,
          percentage: Math.min(100, Math.round(((leadsCount || 0) / leadsTarget) * 100)),
          status: calculateStatus(leadsCount || 0, leadsTarget),
          remaining: Math.max(0, leadsTarget - (leadsCount || 0)),
          isEditable: true,
        },
        {
          key: 'agendamentos',
          label: 'Agendado',
          target: agendamentosTarget,
          current: agendamentosCount || 0,
          rate: leadsCount ? Math.round(((agendamentosCount || 0) / leadsCount) * 100) : 0,
          percentage: Math.min(100, Math.round(((agendamentosCount || 0) / agendamentosTarget) * 100)),
          status: calculateStatus(agendamentosCount || 0, agendamentosTarget),
          remaining: Math.max(0, agendamentosTarget - (agendamentosCount || 0)),
          isEditable: true,
        },
        {
          key: 'comparecimentos',
          label: 'Compareceu',
          target: comparecimentosTarget,
          current: comparecimentosCount || 0,
          rate: agendamentosCount ? Math.round(((comparecimentosCount || 0) / agendamentosCount) * 100) : 0,
          percentage: Math.min(100, Math.round(((comparecimentosCount || 0) / comparecimentosTarget) * 100)),
          status: calculateStatus(comparecimentosCount || 0, comparecimentosTarget),
          remaining: Math.max(0, comparecimentosTarget - (comparecimentosCount || 0)),
          isEditable: true,
        },
        {
          key: 'fechamentos',
          label: 'Venda Realizada',
          target: fechamentosTarget,
          current: fechamentosCount || 0,
          rate: comparecimentosCount ? Math.round(((fechamentosCount || 0) / comparecimentosCount) * 100) : 0,
          percentage: Math.min(100, Math.round(((fechamentosCount || 0) / fechamentosTarget) * 100)),
          status: calculateStatus(fechamentosCount || 0, fechamentosTarget),
          remaining: Math.max(0, fechamentosTarget - (fechamentosCount || 0)),
          isEditable: true,
        },
        {
          key: 'ticket_medio',
          label: 'Ticket Médio',
          target: ticketMedioTarget,
          current: ticketMedio,
          percentage: Math.min(100, Math.round((ticketMedio / ticketMedioTarget) * 100)),
          status: calculateStatus(ticketMedio, ticketMedioTarget),
          remaining: Math.max(0, ticketMedioTarget - ticketMedio),
          isEditable: true,
        },
        {
          key: 'faturamento',
          label: 'Faturamento',
          target: faturamentoTarget,
          current: totalRevenue,
          percentage: Math.min(100, Math.round((totalRevenue / faturamentoTarget) * 100)),
          status: calculateStatus(totalRevenue, faturamentoTarget),
          remaining: Math.max(0, faturamentoTarget - totalRevenue),
          isEditable: true,
        },
        {
          key: 'investimento',
          label: 'Investimento',
          target: investimentoValue,
          current: investimentoValue,
          percentage: 100,
          status: 'healthy',
          remaining: 0,
          isEditable: true,
        },
        {
          key: 'roi',
          label: 'ROI',
          target: roiTarget,
          current: currentROI,
          percentage: Math.min(100, Math.round((currentROI / roiTarget) * 100)),
          status: calculateStatus(currentROI, roiTarget),
          remaining: Math.max(0, roiTarget - currentROI),
          isEditable: true,
        },
      ];

      // Funnel data for visualization
      const funnelData = [
        { stage: 'Novos Leads', value: leadsCount || 0, rate: 100, targetRate: 100, color: 'hsl(var(--primary))', key: 'leads' },
        { stage: 'Agendado', value: agendamentosCount || 0, rate: leadsCount ? Math.round(((agendamentosCount || 0) / leadsCount) * 100) : 0, targetRate: agendamentosTargetRate, color: 'hsl(var(--chart-1))', key: 'agendamentos' },
        { stage: 'Compareceu', value: comparecimentosCount || 0, rate: agendamentosCount ? Math.round(((comparecimentosCount || 0) / agendamentosCount) * 100) : 0, targetRate: comparecimentosTargetRate, color: 'hsl(var(--chart-2))', key: 'comparecimentos' },
        { stage: 'Venda Realizada', value: fechamentosCount || 0, rate: comparecimentosCount ? Math.round(((fechamentosCount || 0) / comparecimentosCount) * 100) : 0, targetRate: fechamentosTargetRate, color: 'hsl(var(--success))', key: 'fechamentos' },
      ];

      return { goals, funnelData, healthyRates };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const updateGoal = useMutation({
    mutationFn: async ({ key, value, rate }: { key: string; value: number; rate?: number }) => {
      // Map goal keys to setting keys
      const keyMap: Record<string, string> = {
        leads: 'meta_leads',
        agendamentos: 'meta_agendamentos',
        comparecimentos: 'meta_comparecimentos',
        fechamentos: 'meta_fechamentos',
        ticket_medio: 'meta_ticket_medio',
        faturamento: 'meta_faturamento',
        investimento: 'investimento_marketing',
        roi: 'meta_roi',
      };
      
      const settingKey = keyMap[key] || `meta_${key}`;
      
      // Upsert target value
      const { data: existing } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('meta_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', settingKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meta_settings')
          .insert({
            setting_key: settingKey,
            setting_value: value,
            description: `Meta mensal de ${key}`,
            created_by: user?.id,
          });
        if (error) throw error;
      }

      // If rate is provided, also update the rate
      if (rate !== undefined && ['agendamentos', 'comparecimentos', 'fechamentos'].includes(key)) {
        const rateKey = `taxa_${key}`;
        const { data: existingRate } = await supabase
          .from('meta_settings')
          .select('id')
          .eq('setting_key', rateKey)
          .maybeSingle();

        if (existingRate) {
          const { error } = await supabase
            .from('meta_settings')
            .update({ setting_value: rate, updated_at: new Date().toISOString() })
            .eq('setting_key', rateKey);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('meta_settings')
            .insert({
              setting_key: rateKey,
              setting_value: rate,
              description: `Taxa de conversão de ${key}`,
              created_by: user?.id,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
    },
  });

  const updateRate = useMutation({
    mutationFn: async ({ key, rate }: { key: string; rate: number }) => {
      const rateKey = `taxa_${key}`;
      
      const { data: existing } = await supabase
        .from('meta_settings')
        .select('id')
        .eq('setting_key', rateKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('meta_settings')
          .update({ setting_value: rate, updated_at: new Date().toISOString() })
          .eq('setting_key', rateKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meta_settings')
          .insert({
            setting_key: rateKey,
            setting_value: rate,
            description: `Taxa de conversão de ${key}`,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-goals'] });
    },
  });

  return {
    data,
    isLoading,
    error,
    updateGoal,
    updateRate,
    isAdmin,
  };
}
