// CRM Types - Centralized type definitions

export type LeadStatus = 
  | 'novo_lead' 
  | 'em_contato'
  | 'nao_respondeu'
  | 'contatos_indicados'
  | 'indicacoes'
  | 'nutricao'
  | 'descartados'
  | 'followup_1' 
  | 'followup_2' 
  | 'followup_3' 
  | 'followup_4'
  | 'followup_5'
  | 'followup_6'
  | 'followup_7'
  | 'followup_8'
  | 'followup_9'
  | 'followup_10'
  | 'followup_11'
  | 'followup_12'
  | 'followup_13'
  | 'followup_14'
  | 'em_atendimento'
  | 'agendou'
  | 'consulta_agendada'
  | 'confirmado'
  | 'faltou'
  | 'nao_compareceu'
  | 'compareceu'
  | 'quase_cliente'
  | 'nao_cliente'
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
  loss_reason?: string | null;
  rmkt_status?: string;
  rmkt_entered_at?: string | null;
  rmkt_last_stage?: string | null;
  rmkt_origin_status?: string | null;
  lead_score?: number;
  score_category?: 'frio' | 'morno' | 'quente';
  contact_attempts?: number;
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
  { key: 'indicacoes', label: 'Indicação', color: 'bg-chart-5', bgColor: 'bg-chart-5/10' },
  { key: 'novo_lead', label: 'Novos Leads', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'em_contato', label: 'Em Contato', color: 'bg-chart-1', bgColor: 'bg-chart-1/10' },
  { key: 'nao_respondeu', label: 'Não Respondeu', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'followup_1', label: 'D1 Manhã (T1)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_2', label: 'D1 Tarde (T2)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_3', label: 'D2 Manhã (T3)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_4', label: 'D2 Tarde (T4)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_5', label: 'D3 Manhã (T5)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_6', label: 'D3 Tarde (T6)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_7', label: 'D4 Manhã (T7)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_8', label: 'D4 Tarde (T8)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_9', label: 'D5 Manhã (T9)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_10', label: 'D5 Tarde (T10)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_11', label: 'D6 Manhã (T11)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_12', label: 'D6 Tarde (T12)', color: 'bg-warning', bgColor: 'bg-warning/10' },
  { key: 'followup_13', label: 'D7 Manhã (T13)', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'followup_14', label: 'D7 Tarde (T14)', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'agendou', label: 'Agendado', color: 'bg-primary', bgColor: 'bg-primary/10' },
  { key: 'faltou', label: 'Faltou', color: 'bg-destructive', bgColor: 'bg-destructive/10' },
  { key: 'compareceu', label: 'Compareceu', color: 'bg-success', bgColor: 'bg-success/10' },
  { key: 'quase_cliente', label: 'Quase Cliente', color: 'bg-chart-4', bgColor: 'bg-chart-4/10' },
  { key: 'potencial', label: 'Potencial', color: 'bg-chart-2', bgColor: 'bg-chart-2/10' },
  { key: 'nao_cliente', label: 'Não Cliente', color: 'bg-chart-5', bgColor: 'bg-chart-5/10' },
  { key: 'fechado', label: 'Venda Realizada', color: 'bg-success', bgColor: 'bg-success/20' },
];

// Follow-up copy templates
export const FOLLOWUP_COPY_TEMPLATES: Record<string, { label: string; format: 'texto' | 'audio'; copy: string }> = {
  followup_1: {
    label: 'D1 MANHÃ',
    format: 'texto',
    copy: 'Oi, [Nome]! Vi que você mostrou interesse no seu tratamento 😊\nQueria te ajudar a dar o próximo passo, posso te explicar rapidinho como funciona?',
  },
  followup_2: {
    label: 'D1 TARDE',
    format: 'audio',
    copy: 'Oi [Nome], tudo bem? Passando rapidinho pra te explicar como funciona aqui na clínica… é bem simples e posso te orientar sem compromisso, tá?',
  },
  followup_3: {
    label: 'D2 MANHÃ',
    format: 'texto',
    copy: '[Nome], me diz uma coisa… você ainda tem interesse em resolver isso ou prefere que eu te chame outro momento?',
  },
  followup_4: {
    label: 'D2 TARDE',
    format: 'texto',
    copy: '[Nome], hoje mesmo atendemos um paciente que estava na mesma situação que você e já saiu com tudo encaminhado 🙌\nSe quiser, posso fazer o mesmo por você',
  },
  followup_5: {
    label: 'D3 MANHÃ',
    format: 'texto',
    copy: '[Nome], muita gente acha que é caro ou complicado, mas na maioria dos casos tem soluções bem acessíveis 🙂\nQuer que eu te explique sem compromisso?',
  },
  followup_6: {
    label: 'D3 TARDE',
    format: 'texto',
    copy: 'Só pra não te deixar sem resposta, estou por aqui pra te ajudar no que precisar, viu? 👍',
  },
  followup_7: {
    label: 'D4 MANHÃ',
    format: 'texto',
    copy: '[Nome], estou finalizando algumas vagas dessa semana e lembrei de você.\nSe ainda quiser, consigo tentar encaixar seu atendimento',
  },
  followup_8: {
    label: 'D4 TARDE',
    format: 'texto',
    copy: '[Nome], passando rapidinho de novo… ainda dá tempo de garantir seu encaixe pra esta semana 😊',
  },
  followup_9: {
    label: 'D5 MANHÃ',
    format: 'texto',
    copy: '[Nome], últimas vagas realmente disponíveis agora… depois disso só na próxima agenda 😬\nQuer que eu reserve pra você?',
  },
  followup_10: {
    label: 'D5 TARDE',
    format: 'texto',
    copy: '[Nome], só conferindo se você ainda quer aproveitar essa janela essa semana. Posso garantir seu horário?',
  },
  followup_11: {
    label: 'D6 MANHÃ',
    format: 'texto',
    copy: '[Nome], bom dia! Lembrei de você hoje. Quer que eu te ajude a dar o próximo passo agora?',
  },
  followup_12: {
    label: 'D6 TARDE',
    format: 'texto',
    copy: '[Nome], antes de encerrar seu atendimento, queria te dar mais uma oportunidade. Posso te ligar?',
  },
  followup_13: {
    label: 'D7 MANHÃ',
    format: 'texto',
    copy: '[Nome], como não tive retorno, vou encerrar seu atendimento por aqui pra não ficar te incomodando 🙏\nMas se ainda quiser, é só me chamar que te ajudo com prioridade',
  },
  followup_14: {
    label: 'D7 TARDE',
    format: 'texto',
    copy: '[Nome], última tentativa por aqui 🙏 Se quiser retomar a qualquer momento, é só me chamar — vou te atender com prioridade.',
  },
};

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
