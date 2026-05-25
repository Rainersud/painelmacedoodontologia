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
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadStatus: string;
  leadStatusLabel: string;
  daysInStage: number;
  potentialValue: number;
  lastInteractionAt: Date | null;
  stageEnteredAt: Date | null;
  createdAt: Date;
}

const ATTENTION_DAYS = 5;
const CRITICAL_DAYS = 10;

function getStageLabel(status: string): string {
  return FUNNEL_STAGES.find((s) => s.key === status)?.label || status;
}

/**
 * Alertas Inteligentes — APENAS INFORMATIVOS.
 * Regras automáticas baseadas no Comercial 1:
 *  • Atenção:    5+ dias sem movimentação
 *  • Crítico:    10+ dias sem movimentação
 *  • Oportunidade: leads em "Quase Cliente" ou com crédito liberado
 *
 * Não altera estágio do funil, apenas espelha informações.
 */
export function useSmartAlerts() {
  const { user } = useAuth();

  const { data: leads } = useQuery({
    queryKey: ['smart-alerts-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, name, phone, status, stage_entered_at, treatment_value, budget_value, last_interaction_at',
        )
        .not('status', 'in', '(concluido,pos_venda,descartados,sem_interesse,fechado)');
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
    const creditApprovedIds = new Set(creditApproved?.map((c) => c.lead_id) || []);

    const result: SmartAlert[] = [];

    for (const lead of leads) {
      const days = getDaysInStage(lead.stage_entered_at);
      const potentialValue = Number(lead.treatment_value || lead.budget_value || 0);
      const lastInteractionAt = lead.last_interaction_at ? new Date(lead.last_interaction_at) : null;
      const stageEnteredAt = lead.stage_entered_at ? new Date(lead.stage_entered_at) : null;

      const base = {
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        leadStatus: lead.status,
        leadStatusLabel: getStageLabel(lead.status),
        daysInStage: days,
        potentialValue,
        lastInteractionAt,
        stageEnteredAt,
        createdAt: new Date(),
      };

      // 🟢 OPORTUNIDADE — Quase Cliente ou Crédito Liberado
      if (lead.status === 'quase_cliente') {
        result.push({
          ...base,
          id: `opp-${lead.id}`,
          type: 'ready_to_close',
          level: 'opportunity',
          priority: potentialValue >= 5000 ? 'urgent' : 'high',
          title: 'Quase Cliente',
        });
        continue;
      }
      if (creditApprovedIds.has(lead.id)) {
        result.push({
          ...base,
          id: `opp-${lead.id}`,
          type: 'credit_liberado',
          level: 'opportunity',
          priority: 'urgent',
          title: 'Crédito Liberado',
        });
        continue;
      }

      // 🔴 CRÍTICO — 10+ dias sem movimentação
      if (days >= CRITICAL_DAYS) {
        result.push({
          ...base,
          id: `crit-${lead.id}`,
          type: 'lead_stagnant',
          level: 'critical',
          priority: days >= 14 ? 'urgent' : 'high',
          title: `${days} dias sem movimentação`,
        });
        continue;
      }

      // 🔶 ATENÇÃO — 5+ dias sem movimentação
      if (days >= ATTENTION_DAYS) {
        result.push({
          ...base,
          id: `att-${lead.id}`,
          type: 'lead_stagnant',
          level: 'attention',
          priority: 'medium',
          title: `${days} dias sem movimentação`,
        });
        continue;
      }
    }

    const priorityOrder: Record<AlertPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return result.sort((a, b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (p !== 0) return p;
      return b.potentialValue - a.potentialValue;
    });
  }, [leads, creditApproved]);

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.level === 'critical').length,
      attention: alerts.filter((a) => a.level === 'attention').length,
      opportunity: alerts.filter((a) => a.level === 'opportunity').length,
      total: alerts.length,
    }),
    [alerts],
  );

  return { alerts, counts };
}
