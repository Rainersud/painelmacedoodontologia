import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDaysInStage, FUNNEL_STAGES, type Lead } from '@/types/crm';
import type { SmartAlertLevel, SmartAlertType } from './useSmartAlerts';

export interface LeadAlert {
  type: SmartAlertType;
  level: SmartAlertLevel;
  title: string;
  shortLabel: string;
}

function getStageLabel(status: string): string {
  return FUNNEL_STAGES.find(s => s.key === status)?.label || status;
}

/**
 * Lightweight per-lead alert detection. 
 * Accepts lead data directly to avoid extra queries for cards.
 */
export function useLeadAlerts(lead: Lead | null) {
  const { data: payments } = useQuery({
    queryKey: ['lead-alerts-payments', lead?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id')
        .eq('lead_id', lead!.id)
        .in('status', ['confirmado', 'pendente'])
        .limit(1);
      return data || [];
    },
    enabled: !!lead?.id,
    staleTime: 60000,
  });

  const { data: overdueTasks } = useQuery({
    queryKey: ['lead-alerts-tasks', lead?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id')
        .eq('lead_id', lead!.id)
        .eq('status', 'pendente')
        .lt('scheduled_at', new Date().toISOString())
        .limit(1);
      return data || [];
    },
    enabled: !!lead?.id,
    staleTime: 60000,
  });

  return useMemo<LeadAlert[]>(() => {
    if (!lead) return [];
    const alerts: LeadAlert[] = [];
    const days = getDaysInStage(lead.stage_entered_at);
    const hasPay = (payments?.length || 0) > 0;
    const hasOverdue = (overdueTasks?.length || 0) > 0;

    // Ready to close
    if (lead.status === 'compareceu' && !hasPay && (lead.treatment_value || lead.budget_value)) {
      alerts.push({ type: 'ready_to_close', level: 'opportunity', title: 'Lead quente — pronto para fechamento', shortLabel: '🟢 Fechar' });
    }

    // No payment after attendance
    if (lead.status === 'compareceu' && !hasPay && days >= 2) {
      alerts.push({ type: 'no_payment_after_attendance', level: 'attention', title: 'Paciente orçado e não fechou', shortLabel: '🟠 Orçado' });
    }

    // No-show not rescued
    if (lead.status === 'faltou' && !lead.rescued_at) {
      alerts.push({ type: 'no_show_not_rescued', level: days >= 3 ? 'critical' : 'attention', title: 'Faltou e não foi recuperado', shortLabel: '🔴 Resgatar' });
    }

    // Follow-up stalled
    if (['followup_1', 'followup_2', 'followup_3', 'followup_4'].includes(lead.status) && days >= 2) {
      alerts.push({ type: 'followup_stalled', level: days >= 5 ? 'critical' : 'attention', title: 'Follow-up sem ação', shortLabel: '🟣 Follow-up' });
    }

    // Stagnant
    if (days >= 3 && !['fechado', 'concluido'].includes(lead.status)) {
      alerts.push({ type: 'lead_stagnant', level: days >= 7 ? 'critical' : 'attention', title: `Lead parado há ${days} dias`, shortLabel: days >= 7 ? '🔴 Esquecido' : '🟠 Parado' });
    }

    // Overdue tasks
    if (hasOverdue) {
      alerts.push({ type: 'task_overdue', level: 'attention', title: 'Tarefa atrasada', shortLabel: '🟡 Tarefa' });
    }

    return alerts;
  }, [lead, payments, overdueTasks]);
}
