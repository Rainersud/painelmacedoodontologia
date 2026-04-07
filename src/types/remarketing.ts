// Remarketing 365 Types

export interface RemarketingStage {
  key: string;
  label: string;
  day: number;
  phase: RemarketingPhase;
}

export type RemarketingPhase = 'aquecimento' | 'nutricao' | 'reativacao' | 'urgencia';

export const RMKT_PHASE_CONFIG: Record<RemarketingPhase, { label: string; color: string; bgColor: string; emoji: string }> = {
  aquecimento: { label: 'Aquecimento', color: 'text-blue-600', bgColor: 'bg-blue-500/10', emoji: '🔵' },
  nutricao: { label: 'Nutrição', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', emoji: '🟡' },
  reativacao: { label: 'Reativação', color: 'text-orange-600', bgColor: 'bg-orange-500/10', emoji: '🟠' },
  urgencia: { label: 'Urgência', color: 'text-red-600', bgColor: 'bg-red-500/10', emoji: '🔴' },
};

export const RMKT_STAGES: RemarketingStage[] = [
  // Phase 1 - Aquecimento (D1-D30)
  { key: 'dia_1', label: 'Dia 1', day: 1, phase: 'aquecimento' },
  { key: 'dia_3', label: 'Dia 3', day: 3, phase: 'aquecimento' },
  { key: 'dia_5', label: 'Dia 5', day: 5, phase: 'aquecimento' },
  { key: 'dia_7', label: 'Dia 7', day: 7, phase: 'aquecimento' },
  { key: 'dia_10', label: 'Dia 10', day: 10, phase: 'aquecimento' },
  { key: 'dia_15', label: 'Dia 15', day: 15, phase: 'aquecimento' },
  { key: 'dia_20', label: 'Dia 20', day: 20, phase: 'aquecimento' },
  { key: 'dia_25', label: 'Dia 25', day: 25, phase: 'aquecimento' },
  { key: 'dia_30', label: 'Dia 30', day: 30, phase: 'aquecimento' },
  // Phase 2 - Nutrição (D31-D120)
  { key: 'dia_40', label: 'Dia 40', day: 40, phase: 'nutricao' },
  { key: 'dia_50', label: 'Dia 50', day: 50, phase: 'nutricao' },
  { key: 'dia_60', label: 'Dia 60', day: 60, phase: 'nutricao' },
  { key: 'dia_75', label: 'Dia 75', day: 75, phase: 'nutricao' },
  { key: 'dia_90', label: 'Dia 90', day: 90, phase: 'nutricao' },
  { key: 'dia_105', label: 'Dia 105', day: 105, phase: 'nutricao' },
  { key: 'dia_120', label: 'Dia 120', day: 120, phase: 'nutricao' },
  // Phase 3 - Reativação (D121-D240)
  { key: 'dia_140', label: 'Dia 140', day: 140, phase: 'reativacao' },
  { key: 'dia_160', label: 'Dia 160', day: 160, phase: 'reativacao' },
  { key: 'dia_180', label: 'Dia 180', day: 180, phase: 'reativacao' },
  { key: 'dia_200', label: 'Dia 200', day: 200, phase: 'reativacao' },
  { key: 'dia_220', label: 'Dia 220', day: 220, phase: 'reativacao' },
  { key: 'dia_240', label: 'Dia 240', day: 240, phase: 'reativacao' },
  // Phase 4 - Urgência (D241-D355)
  { key: 'dia_270', label: 'Dia 270', day: 270, phase: 'urgencia' },
  { key: 'dia_300', label: 'Dia 300', day: 300, phase: 'urgencia' },
  { key: 'dia_320', label: 'Dia 320', day: 320, phase: 'urgencia' },
  { key: 'dia_340', label: 'Dia 340', day: 340, phase: 'urgencia' },
  { key: 'dia_355', label: 'Dia 355', day: 355, phase: 'urgencia' },
];

export interface RemarketingEntry {
  id: string;
  lead_id: string;
  current_stage: string;
  phase: string;
  entered_at: string;
  last_advanced_at: string | null;
  origin_status: string | null;
  is_active: boolean;
  return_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: {
    name: string;
    phone: string;
    source: string;
    interest_product: string | null;
    last_interaction_at: string | null;
    status: string;
  } | null;
}

export function getNextRmktStage(currentStage: string): string | null {
  const idx = RMKT_STAGES.findIndex(s => s.key === currentStage);
  if (idx === -1 || idx >= RMKT_STAGES.length - 1) return null;
  return RMKT_STAGES[idx + 1].key;
}

export function getRmktPhase(stage: string): RemarketingPhase {
  const found = RMKT_STAGES.find(s => s.key === stage);
  return found?.phase || 'aquecimento';
}
