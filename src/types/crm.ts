// CRM Types - Centralized type definitions

export type LeadStatus = 
  | 'novo_lead' 
  | 'contatos_indicados'
  | 'indicacoes'
  | 'nutricao'
  | 'descartados'
  | 'followup_1' 
  | 'followup_2' 
  | 'followup_3' 
  | 'followup_4'
  | 'em_atendimento'
  | 'agendou'
  | 'consulta_agendada'
  | 'confirmado'
  | 'faltou'
  | 'nao_compareceu'
  | 'compareceu'
  | 'potencial'
  | 'acompanhamento'
  | 'fechado'
  | 'pos_venda'
  | 'resgatado'
  | 'sem_interesse'
  | 'nao_convertido'
  | 'orcamentos_abertos'
  | 'outro_momento'
  | 'qualificado'
  | 'tratamento_andamento'
  | 'concluido';

export type LeadSource = 
  | 'whatsapp'
  | 'telefone'
  | 'site'
  | 'indicacao'
  | 'instagram'
  | 'facebook'
  | 'google_ads'
  | 'outro';

export type TaskType = 'ligacao' | 'tarefa' | 'compromisso' | 'followup';
export type TaskStatus = 'pendente' | 'concluido' | 'reagendado' | 'cancelado';
export type TaskPriority = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  whatsapp?: string | null;
  source: LeadSource;
  status: LeadStatus;
  assigned_agent_id: string | null;
  treatment_value?: number | null;
  budget_value?: number | null;
  payment_method?: string | null;
  interest_product?: string | null;
  interest_rating?: number;
  notes?: string | null;
  scheduled_appointment_at?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  rescued_at?: string | null;
  stage_entered_at?: string | null;
  attendance_discount_status?: 'elegivel' | 'liberado' | 'cancelado';
  discount_percentage?: number;
  no_show_count?: number;
  sale_type?: '1_etapa' | '2_etapas' | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: { full_name: string } | null;
  tasks?: Task[];
}

export interface Task {
  id: string;
  lead_id?: string | null;
  agent_id: string;
  title: string;
  description?: string | null;
  task_type: TaskType;
  scheduled_at: string;
  completed_at?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  response?: string | null;
  reschedule_reason?: string | null;
  rescheduled_from_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: { name: string; phone: string; budget_value?: number | null; treatment_value?: number | null } | null;
  profiles?: { full_name: string } | null;
}

export interface ActivityLog {
  id: string;
  lead_id?: string | null;
  agent_id: string;
  activity_type: 'lead_created' | 'status_changed' | 'task_created' | 'task_completed' | 'note_added' | 'call_logged' | 'appointment_scheduled' | 'value_updated' | 'lead_edited';
  title: string;
  description?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  lead?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

export interface MetaSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description?: string | null;
  created_by?: string | null;
  updated_at: string;
  created_at: string;
}

// Funnel stage configuration
export interface FunnelStage {
  key: LeadStatus;
  label: string;
  color: string;
  bgColor: string;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  { key: 'novo_lead', label: 'Novos Leads', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'indicacoes', label: 'Indicação', color: 'bg-chart-5', bgColor: 'bg-chart-5/10' },
  { key: 'agendou', label: 'Agendado', color: 'bg-primary', bgColor: 'bg-primary/10' },
  { key: 'faltou', label: 'Faltou', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'compareceu', label: 'Compareceu', color: 'bg-success', bgColor: 'bg-success/10' },
  { key: 'followup_1', label: 'Follow-up 1', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_2', label: 'Follow-up 2', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_3', label: 'Follow-up 3', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_4', label: 'Follow-up 4', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'fechado', label: 'Venda Realizada', color: 'bg-success', bgColor: 'bg-success/20' },
];

export const SOURCE_CONFIG: Record<LeadSource, { color: string; label: string }> = {
  whatsapp: { color: 'bg-success/10 text-success', label: 'WhatsApp' },
  telefone: { color: 'bg-chart-2/10 text-chart-2', label: 'Telefone' },
  instagram: { color: 'bg-chart-5/10 text-chart-5', label: 'Instagram' },
  facebook: { color: 'bg-primary/10 text-primary', label: 'Facebook' },
  google_ads: { color: 'bg-warning/10 text-warning', label: 'Google Ads' },
  indicacao: { color: 'bg-primary/10 text-primary', label: 'Indicação' },
  site: { color: 'bg-muted text-muted-foreground', label: 'Site' },
  outro: { color: 'bg-muted text-muted-foreground', label: 'Outro' },
};

export const TASK_TYPE_CONFIG: Record<TaskType, { icon: string; label: string; color: string }> = {
  ligacao: { icon: 'Phone', label: 'Ligação', color: 'bg-chart-2/10 text-chart-2' },
  tarefa: { icon: 'CheckSquare', label: 'Tarefa', color: 'bg-primary/10 text-primary' },
  compromisso: { icon: 'Calendar', label: 'Compromisso', color: 'bg-warning/10 text-warning' },
  followup: { icon: 'MessageSquare', label: 'Follow-up', color: 'bg-chart-5/10 text-chart-5' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-primary/10 text-primary' },
  alta: { label: 'Alta', color: 'bg-warning/10 text-warning' },
  urgente: { label: 'Urgente', color: 'bg-destructive/10 text-destructive' },
};

// Helper to get days in current stage
export function getDaysInStage(stageEnteredAt: string | null | undefined): number {
  if (!stageEnteredAt) return 0;
  const entered = new Date(stageEnteredAt);
  const now = new Date();
  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
}

// Get stage alert level based on days
export function getStageAlertLevel(days: number): 'normal' | 'attention' | 'critical' {
  if (days >= 7) return 'critical';
  if (days >= 5) return 'attention';
  return 'normal';
}

export function getStagnationLabel(days: number): string {
  if (days >= 7) return '🔴 Lead esquecido';
  if (days >= 5) return '🟠 Lead parado';
  if (days >= 3) return '🟡 Atenção';
  return '';
}
