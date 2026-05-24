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
  | 'ready_to_close'
  | 'credit_liberado'
  | 'no_response'
  | 'lost_interest'
  | 'budget_stalled';

export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  level: SmartAlertLevel;
  priority: AlertPriority;
  title: string;
  description: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: string;
  leadStatusLabel: string;
  daysInStage: number;
  potentialValue: number;
  lastInteractionAt: Date | null;
  createdAt: Date;
}

const STAGNANT_DAYS = 3;
const ATTENDANCE_NO_PAYMENT_DAYS = 2;

function getStageLabel(status: string): string {
  return FUNNEL_STAGES.find((s) => s.key === status)?.label || status;
}

export function useSmartAlerts() {
  const { user } = useAuth();

  const { data: leads } = useQuery({
    queryKey: ['smart-alerts-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, name, phone, status, stage_entered_at, treatment_value, budget_value, no_show_count, rescued_at, last_interaction_at'
        )
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

  const { data: creditApproved } = useQuery({
    queryKey: ['smart-alerts-credit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_triage')
        .select('lead_id')
        .eq('credit_status', 'aprovado');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const alerts = useMemo<SmartAlert[]>(() => {
    if (!leads) return [];

    const paidLeadIds = new Set(payments?.map((p) => p.lead_id) || []);
    const creditApprovedIds = new Set(creditApproved?.map((c) => c.lead_id) || []);
    const overdueTasksByLead = new Map<string, number>();
    pendingTasks?.forEach((t) => {
      if (t.lead_id) {
        overdueTasksByLead.set(t.lead_id, (overdueTasksByLead.get(t.lead_id) || 0) + 1);
      }
    });

    const result: SmartAlert[] = [];
    const ATTENDED_STAGES = ['compareceu', 'quase_cliente', 'potencial', 'nao_cliente', 'fechado'];

    for (const lead of leads) {
      const days = getDaysInStage(lead.stage_entered_at);
      const potentialValue = Number(lead.treatment_value || lead.budget_value || 0);
      const lastInteractionAt = lead.last_interaction_at ? new Date(lead.last_interaction_at) : null;
      const overdueCount = overdueTasksByLead.get(lead.id) || 0;
      const attended = ATTENDED_STAGES.includes(lead.status);
      const hasCreditApproved = creditApprovedIds.has(lead.id);

      // === OPPORTUNITY: must have attended AND be in quase_cliente OR credito_liberado ===
      const isQuaseCliente = lead.status === 'quase_cliente';
      const isCreditoLiberado = hasCreditApproved && attended;

      if (isQuaseCliente || isCreditoLiberado) {
        if (!paidLeadIds.has(lead.id) && potentialValue > 0) {
          let title = 'Pronto para fechamento';
          let type: SmartAlertType = 'ready_to_close';
          if (isCreditoLiberado && !isQuaseCliente) {
            title = 'Crédito liberado — fechar agora';
            type = 'credit_liberado';
          } else if (isQuaseCliente) {
            title = 'Quase Cliente — última milha';
          }
          result.push({
            id: `opp-${lead.id}`,
            type,
            level: 'opportunity',
            priority: potentialValue >= 5000 ? 'urgent' : 'high',
            title,
            description: `Orçamento de R$ ${potentialValue.toLocaleString('pt-BR')} sem pagamento.`,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            leadStatus: lead.status,
            leadStatusLabel: getStageLabel(lead.status),
            daysInStage: days,
            potentialValue,
            lastInteractionAt,
            createdAt: new Date(),
          });
          continue;
        }
      }

      // === CRITICAL signals ===
      // No-show not rescued
      if (lead.status === 'faltou' && !lead.rescued_at) {
        result.push({
          id: `crit-${lead.id}`,
          type: 'no_show_not_rescued',
          level: 'critical',
          priority: 'urgent',
          title: 'Faltou e não foi resgatado',
          description: `${lead.no_show_count > 1 ? `${lead.no_show_count} faltas` : 'Faltou consulta'} — recuperar urgente.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Não respondeu ou Não Cliente
      if (lead.status === 'nao_respondeu') {
        result.push({
          id: `crit-${lead.id}`,
          type: 'no_response',
          level: 'critical',
          priority: days >= 5 ? 'urgent' : 'high',
          title: `Sem resposta há ${days}d`,
          description: 'Paciente não responde — risco de perda total.',
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      if (lead.status === 'nao_cliente') {
        result.push({
          id: `crit-${lead.id}`,
          type: 'lost_interest',
          level: 'critical',
          priority: 'high',
          title: 'Perdeu interesse',
          description: 'Avaliação cancelada ou interesse perdido.',
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Stagnant high — critical
      if (days >= 7 && !['fechado', 'concluido'].includes(lead.status)) {
        result.push({
          id: `crit-${lead.id}`,
          type: 'lead_stagnant',
          level: 'critical',
          priority: days >= 14 ? 'urgent' : 'high',
          title: `Travado há ${days} dias`,
          description: `Sem movimentação em "${getStageLabel(lead.status)}".`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Orçamento parado (compareceu sem pagamento) > 5 dias = critical
      if (lead.status === 'compareceu' && !paidLeadIds.has(lead.id) && days >= 5 && potentialValue > 0) {
        result.push({
          id: `crit-${lead.id}`,
          type: 'budget_stalled',
          level: 'critical',
          priority: 'urgent',
          title: 'Orçamento parado',
          description: `R$ ${potentialValue.toLocaleString('pt-BR')} sem retorno há ${days}d.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Follow-up stalled critical (>=5 days)
      if (
        lead.status.startsWith('followup_') &&
        days >= 5
      ) {
        result.push({
          id: `crit-${lead.id}`,
          type: 'followup_stalled',
          level: 'critical',
          priority: 'high',
          title: 'Follow-up travado',
          description: `${getStageLabel(lead.status)} há ${days}d.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // === ATTENTION signals ===
      // Compareceu sem pagamento (recente)
      if (lead.status === 'compareceu' && !paidLeadIds.has(lead.id) && days >= ATTENDANCE_NO_PAYMENT_DAYS) {
        result.push({
          id: `att-${lead.id}`,
          type: 'no_payment_after_attendance',
          level: 'attention',
          priority: 'medium',
          title: 'Aguardando decisão',
          description: `Compareceu há ${days}d, sem pagamento.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Potencial — em negociação
      if (lead.status === 'potencial') {
        result.push({
          id: `att-${lead.id}`,
          type: 'no_payment_after_attendance',
          level: 'attention',
          priority: 'medium',
          title: 'Em negociação',
          description: `Aguardando retorno há ${days}d.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Follow-up morno
      if (lead.status.startsWith('followup_') && days >= 2) {
        result.push({
          id: `att-${lead.id}`,
          type: 'followup_stalled',
          level: 'attention',
          priority: 'medium',
          title: 'Follow-up sem ação',
          description: `${getStageLabel(lead.status)} há ${days}d.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Em contato sem avanço
      if (lead.status === 'em_contato' && days >= STAGNANT_DAYS) {
        result.push({
          id: `att-${lead.id}`,
          type: 'lead_stagnant',
          level: 'attention',
          priority: 'low',
          title: 'Conversa aberta sem avanço',
          description: `Em contato há ${days}d.`,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }

      // Tarefas atrasadas
      if (overdueCount > 0) {
        result.push({
          id: `att-${lead.id}`,
          type: 'task_overdue',
          level: 'attention',
          priority: 'medium',
          title: `${overdueCount} tarefa${overdueCount > 1 ? 's' : ''} atrasada${overdueCount > 1 ? 's' : ''}`,
          description: 'Tarefas pendentes não concluídas.',
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadStatus: lead.status,
          leadStatusLabel: getStageLabel(lead.status),
          daysInStage: days,
          potentialValue,
          lastInteractionAt,
          createdAt: new Date(),
        });
        continue;
      }
    }

    // Sort each by priority/value desc
    const priorityOrder: Record<AlertPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return result.sort((a, b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (p !== 0) return p;
      return b.potentialValue - a.potentialValue;
    });
  }, [leads, pendingTasks, payments, creditApproved]);

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.level === 'critical').length,
      attention: alerts.filter((a) => a.level === 'attention').length,
      opportunity: alerts.filter((a) => a.level === 'opportunity').length,
      total: alerts.length,
    }),
    [alerts]
  );

  return { alerts, counts };
}
