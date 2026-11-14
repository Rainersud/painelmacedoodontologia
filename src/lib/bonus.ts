// Bônus por metas (regra de 14/11/2026)
//
// Dois grupos, cada um com uma responsável — os resultados não se misturam:
//   - Atendimento (Ariane): agendamentos, comparecimentos e resgates
//   - Coleta de indicações (Lidiane): indicações registradas em qualquer lugar do painel
// Semana (segunda a domingo) em que TODAS as metas do grupo são batidas = R$ 100.
// Todas as semanas do mês batidas = bônus dobrado (recebe de novo o total das semanas).
// As metas semanais de agendamento e comparecimento saem do objetivo central (escada);
// resgates, indicações e o valor por semana ficam em meta_settings e acompanham o objetivo.
import { addDays, endOfDay, endOfMonth, startOfMonth, startOfWeek } from 'date-fns';

export type BonusGroup = 'atendimento' | 'indicacoes';

export const BONUS_GROUPS: { key: BonusGroup; label: string; defaultOwner: string; goals: string[] }[] = [
  { key: 'atendimento', label: 'Atendimento', defaultOwner: 'Ariane', goals: ['agendamentos', 'comparecimentos', 'resgates'] },
  { key: 'indicacoes', label: 'Coleta de indicações', defaultOwner: 'Lidiane', goals: ['indicacoes'] },
];

export const GOAL_LABELS: Record<string, string> = {
  agendamentos: 'Agendamentos',
  comparecimentos: 'Comparecimentos',
  resgates: 'Resgates',
  indicacoes: 'Indicações coletadas',
};

export const BONUS_SETTINGS = {
  weeklyValue: { key: 'bonus_semana_valor', fallback: 100 },
  resgatesPerWeek: { key: 'bonus_resgatados_semana', fallback: 3 },
  indicacoesPerWeek: { key: 'bonus_indicacoes_semana', fallback: 10 },
} as const;

export interface Week { start: Date; end: Date }

/**
 * Semanas do mês: segunda a domingo, e a semana pertence ao mês em que cai a quinta-feira
 * (a mesma regra do calendário ISO). Assim o mês tem 4 ou 5 semanas inteiras, sem dividir.
 */
export function monthWeeks(month: Date): Week[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  let monday = startOfWeek(first, { weekStartsOn: 1 });
  const weeks: Week[] = [];
  while (monday <= last) {
    const thursday = addDays(monday, 3);
    if (thursday >= first && thursday <= last) {
      weeks.push({ start: monday, end: endOfDay(addDays(monday, 6)) });
    }
    monday = addDays(monday, 7);
  }
  return weeks;
}

export type WeekState = 'futura' | 'em_andamento' | 'batida' | 'nao_batida';

export interface GoalResult { key: string; label: string; current: number; target: number; hit: boolean }
export interface WeekResult { week: Week; state: WeekState; goals: GoalResult[]; earned: number }
export interface GroupResult {
  group: BonusGroup;
  weeks: WeekResult[];
  weeklyValue: number;
  weeksHit: number;
  /** soma das semanas batidas */
  weeklyTotal: number;
  /** bônus dobrado: igual ao total das semanas, quando TODAS as semanas do mês foram batidas */
  doubleBonus: number;
  /** o mês ainda pode virar bônus dobrado? */
  doubleStillPossible: boolean;
  total: number;
}

/** Junta as metas de cada semana e aplica a regra de pagamento. */
export function evaluateGroup(
  group: BonusGroup,
  weeks: Week[],
  goalsFor: (w: Week) => GoalResult[],
  weeklyValue: number,
  now: Date = new Date(),
): GroupResult {
  const results: WeekResult[] = weeks.map(w => {
    const goals = goalsFor(w);
    const allHit = goals.length > 0 && goals.every(g => g.hit);
    let state: WeekState;
    if (now < w.start) state = 'futura';
    else if (allHit) state = 'batida';
    else if (now <= w.end) state = 'em_andamento';
    else state = 'nao_batida';
    return { week: w, state, goals, earned: state === 'batida' ? weeklyValue : 0 };
  });
  const weeksHit = results.filter(r => r.state === 'batida').length;
  const weeklyTotal = weeksHit * weeklyValue;
  const allWeeksHit = results.length > 0 && weeksHit === results.length;
  const doubleBonus = allWeeksHit ? weeklyTotal : 0;
  return {
    group,
    weeks: results,
    weeklyValue,
    weeksHit,
    weeklyTotal,
    doubleBonus,
    doubleStillPossible: !results.some(r => r.state === 'nao_batida'),
    total: weeklyTotal + doubleBonus,
  };
}

// ---------- Indicações coletadas ----------

export interface ReferralSources {
  /** vínculos indicado ↔ quem indicou (card do lead no Comercial 1, CRC ou Comercial 2) */
  referrals: { referred_lead_id: string; created_at: string }[];
  /** nomes indicados na triagem */
  triage: { id: string; converted_lead_id: string | null; created_at: string }[];
  /** leads cadastrados com origem de indicação de paciente */
  leads: { id: string; created_at: string; lead_arrival_source?: string | null; source?: string | null }[];
}

/**
 * Cada pessoa indicada conta uma vez, na data em que a indicação foi registrada pela
 * primeira vez — venha ela do card do lead, da triagem ou do cadastro com origem indicação.
 */
export function referralEvents(src: ReferralSources): { id: string; at: Date }[] {
  const first = new Map<string, Date>();
  const add = (id: string, at: string) => {
    const d = new Date(at);
    const cur = first.get(id);
    if (!cur || d < cur) first.set(id, d);
  };
  for (const r of src.referrals) add(`lead:${r.referred_lead_id}`, r.created_at);
  for (const t of src.triage) add(t.converted_lead_id ? `lead:${t.converted_lead_id}` : `triagem:${t.id}`, t.created_at);
  for (const l of src.leads) {
    if (l.lead_arrival_source === 'indicacao_pac' || l.source === 'indicacao') add(`lead:${l.id}`, l.created_at);
  }
  return [...first.entries()].map(([id, at]) => ({ id, at }));
}

export function countIn(events: { at: Date }[], w: Week): number {
  return events.filter(e => e.at >= w.start && e.at <= w.end).length;
}
