import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDaysInStage, FUNNEL_STAGES } from '@/types/crm';

export type SmartAlertLevel = 'critical' | 'attention' | 'opportunity';
export type SmartAlertType = 
  | 'lead_stagnant'
  | 'no_payment_after_attendance'
  | 'no_show_not_rescued'
  | 'followup_stalled'
  | 'task_overdue'
  | 'ready_to_close';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  level: SmartAlertLevel;
  title: string;
  description: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: string;
  daysInStage?: number;
  createdAt: Date;
}

const STAGNANT_DAYS = 3;
const ATTENDANCE_NO_PAYMENT_DAYS = 2;

function getStageLabel(status: string): string {
  return FUNNEL_STAGES.find(s => s.key === status)?.label || status;
}

export function useSmartAlerts() {
  const { user } = useAuth();

  const { data: leads } = useQuery({
    queryKey: ['smart-alerts-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, status, stage_entered_at, treatment_value, budget_value, no_show_count, rescued_at')
        .not('status', 'in', '(concluido,pos_venda,descartados,sem_interesse)');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: pendingTasks } = useQuery({
    queryKey: ['smart-alerts-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, lead_id, title, scheduled_at')
        .eq('status', 'pendente')
        .lt('scheduled_at', new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: payments } = useQuery({
    queryKey: ['smart-alerts-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('lead_id')
        .in('status', ['confirmado', 'pendente']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const alerts = useMemo<SmartAlert[]>(() => {
    if (!leads) return [];

    const result: SmartAlert[] = [];
    const paidLeadIds = new Set(payments?.map(p => p.lead_id) || []);
    const overdueTasksByLead = new Map<string, typeof pendingTasks>();

    pendingTasks?.forEach(t => {
      if (t.lead_id) {
        if (!overdueTasksByLead.has(t.lead_id)) overdueTasksByLead.set(t.lead_id, []);
        overdueTasksByLead.get(t.lead_id)!.push(t);
      }
    });

    for (const lead of leads) {
      const days = getDaysInStage(lead.stage_entered_at);

      // 🟢 Ready to close - compareceu + has budget + no payment
      if (lead.status === 'compareceu' && !paidLeadIds.has(lead.id) && (lead.treatment_value || lead.budget_value)) {
        result.push({
          id: `ready-${lead.id}`,
          type: 'ready_to_close',
          level: 'opportunity',
          title: 'Lead quente — pronto para fechamento',
          description: `${lead.name} compareceu e tem orçamento de R$ ${((lead.treatment_value || lead.budget_value || 0)).toLocaleString('pt-BR')}. Sem pagamento registrado.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          daysInStage: days,
          createdAt: new Date(),
        });
      }

      // 🔴 Stagnant lead
      if (days >= STAGNANT_DAYS && !['fechado', 'concluido'].includes(lead.status)) {
        result.push({
          id: `stagnant-${lead.id}`,
          type: 'lead_stagnant',
          level: days >= 7 ? 'critical' : 'attention',
          title: `Lead parado há ${days} dias`,
          description: `${lead.name} está na etapa "${getStageLabel(lead.status)}" há ${days} dias sem movimentação.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          daysInStage: days,
          createdAt: new Date(),
        });
      }

      // 🟠 Attended but no payment
      if (lead.status === 'compareceu' && !paidLeadIds.has(lead.id) && days >= ATTENDANCE_NO_PAYMENT_DAYS) {
        result.push({
          id: `no-payment-${lead.id}`,
          type: 'no_payment_after_attendance',
          level: 'attention',
          title: 'Paciente orçado e não fechou',
          description: `${lead.name} compareceu há ${days} dias e ainda não tem pagamento registrado.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          daysInStage: days,
          createdAt: new Date(),
        });
      }

      // 🔵 No-show not rescued
      if (lead.status === 'faltou' && !lead.rescued_at) {
        result.push({
          id: `no-show-${lead.id}`,
          type: 'no_show_not_rescued',
          level: days >= 3 ? 'critical' : 'attention',
          title: 'Paciente faltou e não foi recuperado',
          description: `${lead.name} faltou${lead.no_show_count > 1 ? ` (${lead.no_show_count} faltas)` : ''} e não foi resgatado.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          daysInStage: days,
          createdAt: new Date(),
        });
      }

      // 🟣 Follow-up stalled
      if (['followup_1', 'followup_2', 'followup_3', 'followup_4'].includes(lead.status) && days >= 2) {
        result.push({
          id: `followup-${lead.id}`,
          type: 'followup_stalled',
          level: days >= 5 ? 'critical' : 'attention',
          title: 'Follow-up sem ação',
          description: `${lead.name} está em ${getStageLabel(lead.status)} há ${days} dias sem atualização.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          daysInStage: days,
          createdAt: new Date(),
        });
      }

      // 🟡 Overdue tasks
      const overdue = overdueTasksByLead.get(lead.id);
      if (overdue && overdue.length > 0) {
        result.push({
          id: `task-${lead.id}`,
          type: 'task_overdue',
          level: 'attention',
          title: `${overdue.length} tarefa${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}`,
          description: `${lead.name} tem tarefas pendentes não concluídas.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          createdAt: new Date(),
        });
      }
    }

    // Sort: critical first, then attention, then opportunity
    const levelOrder: Record<SmartAlertLevel, number> = { critical: 0, attention: 1, opportunity: 2 };
    return result.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  }, [leads, pendingTasks, payments]);

  const counts = useMemo(() => ({
    critical: alerts.filter(a => a.level === 'critical').length,
    attention: alerts.filter(a => a.level === 'attention').length,
    opportunity: alerts.filter(a => a.level === 'opportunity').length,
    total: alerts.length,
  }), [alerts]);

  return { alerts, counts };
}
