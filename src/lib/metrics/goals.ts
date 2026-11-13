// Metas: uma fonte (meta_settings), proporcional aos dias úteis do período.
//
// Cada meta tem UMA chave em meta_settings: a mesma que a tela "Metas da Clínica" grava
// (useClinicGoals). As cópias antigas (meta_*_mes, meta_taxa_*, meta_roi_liquido...) foram
// removidas do banco em 13/11/2026. Sem valor configurado, vale o padrão (fallback).
import type { BusinessCalendar } from './calendar';
import type { DateRange } from './period';
import { safeDiv } from './rules';

export type GoalKey =
  | 'leads' | 'agendamentos' | 'comparecimentos' | 'vendas'
  | 'ticket_medio' | 'faturamento' | 'investimento'
  | 'taxa_agendamento' | 'taxa_comparecimento' | 'taxa_fechamento'
  | 'cpl' | 'cac' | 'roi' | 'roas';

interface GoalDef {
  /** chave em meta_settings (a que a tela de metas grava) */
  keys: string[];
  fallback: number;
  /** metas de volume são divididas pelos dias úteis; taxas e médias não. */
  proportional: boolean;
}

export const GOAL_DEFS: Record<GoalKey, GoalDef> = {
  leads:               { keys: ['meta_leads'], fallback: 300, proportional: true },
  agendamentos:        { keys: ['meta_agendamentos'], fallback: 135, proportional: true },
  comparecimentos:     { keys: ['meta_comparecimentos'], fallback: 95, proportional: true },
  vendas:              { keys: ['meta_fechamentos'], fallback: 20, proportional: true },
  faturamento:         { keys: ['meta_faturamento'], fallback: 120000, proportional: true },
  investimento:        { keys: ['investimento_marketing'], fallback: 6000, proportional: true },
  ticket_medio:        { keys: ['meta_ticket_medio'], fallback: 6000, proportional: false },
  taxa_agendamento:    { keys: ['taxa_agendamentos'], fallback: 45, proportional: false },
  taxa_comparecimento: { keys: ['taxa_comparecimentos'], fallback: 70, proportional: false },
  taxa_fechamento:     { keys: ['taxa_fechamentos'], fallback: 21, proportional: false },
  cpl:                 { keys: ['meta_cpl'], fallback: 20, proportional: false },
  cac:                 { keys: ['meta_cac'], fallback: 300, proportional: false },
  roi:                 { keys: ['meta_roi'], fallback: 8, proportional: false },
  roas:                { keys: ['meta_roas_bruto'], fallback: 20, proportional: false },
};

export const BUSINESS_DAYS_PER_MONTH_KEY = 'meta_dias_uteis_mes';
export const DEFAULT_BUSINESS_DAYS_PER_MONTH = 20;

export type MetaSettingsMap = Record<string, number | string | null | undefined>;

/** Meta mensal configurada (sem proporção). */
export function monthlyGoal(settings: MetaSettingsMap, key: GoalKey): number {
  const def = GOAL_DEFS[key];
  for (const k of def.keys) {
    const v = settings[k];
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) > 0) {
      return Number(v);
    }
  }
  return def.fallback;
}

/** Base de dias úteis por mês para a proporção (padrão 20). */
export function businessDaysPerMonth(settings: MetaSettingsMap): number {
  const v = Number(settings[BUSINESS_DAYS_PER_MONTH_KEY]);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_BUSINESS_DAYS_PER_MONTH;
}

/**
 * Fração do mês que o período representa: dias úteis do período ÷ base mensal.
 * Hoje = 1/20, semana = 5/20, mês = dias úteis do mês/20 (normalmente ~1).
 * O mês inteiro é sempre 1, para que a meta mensal apareça exata.
 */
export function periodProportion(
  range: DateRange, calendar: BusinessCalendar, settings: MetaSettingsMap,
): number {
  const s = range.start;
  const e = range.end;
  const isWholeMonth =
    s.getDate() === 1 && s.getHours() === 0 &&
    e.getMonth() === s.getMonth() && e.getFullYear() === s.getFullYear() &&
    new Date(e.getTime() + 1).getDate() === 1;
  if (isWholeMonth) return 1;
  return safeDiv(calendar.countBusinessDays(s, e), businessDaysPerMonth(settings));
}

/** Meta do período: metas de volume são proporcionais; taxas e médias ficam iguais. */
export function periodGoal(
  settings: MetaSettingsMap, key: GoalKey, range: DateRange, calendar: BusinessCalendar,
): number {
  const monthly = monthlyGoal(settings, key);
  if (!GOAL_DEFS[key].proportional) return monthly;
  const p = periodProportion(range, calendar, settings);
  if (p === 0) return 0; // dia sem expediente: sem meta de volume
  return key === 'faturamento' || key === 'investimento'
    ? Math.round(monthly * p)
    : Math.max(1, Math.round(monthly * p));
}

export type GoalStatus = 'healthy' | 'warning' | 'critical';

/**
 * Situação contra a meta: ≥ 85% saudável, ≥ 55% atenção, abaixo disso crítico.
 * `lowerIsBetter` para CAC, CPL e tempo de resposta.
 */
export function goalStatus(current: number, target: number, lowerIsBetter = false): GoalStatus {
  if (target <= 0) return 'warning';
  const ratio = lowerIsBetter ? target / Math.max(current, 0.0001) : current / target;
  if (ratio >= 0.85) return 'healthy';
  if (ratio >= 0.55) return 'warning';
  return 'critical';
}

/**
 * Projeção do fim do período no ritmo atual, por DIAS ÚTEIS (a mesma régua das metas):
 * realizado ÷ dias úteis já decorridos × dias úteis do período.
 */
export function projectByBusinessDays(
  current: number, range: DateRange, calendar: BusinessCalendar, now: Date = new Date(),
): number {
  const total = calendar.countBusinessDays(range.start, range.end);
  const elapsed = calendar.countBusinessDays(range.start, now > range.end ? range.end : now);
  if (total <= 0) return Math.round(current);
  return Math.round((current / Math.max(1, elapsed)) * total);
}

/** Ritmo esperado: % do período já decorrido (para "no ritmo" / "atrasado"). */
export function expectedPace(range: DateRange, now: Date = new Date()): number {
  const total = range.end.getTime() - range.start.getTime();
  if (total <= 0) return 100;
  const elapsed = Math.min(total, Math.max(0, now.getTime() - range.start.getTime()));
  return (elapsed / total) * 100;
}

/**
 * Situação pela régua de ritmo: compara o realizado com o que já deveria
 * estar feito até agora (meta × fração do período decorrida).
 */
export function paceStatus(current: number, target: number, elapsedFraction: number): GoalStatus {
  return goalStatus(current, target * Math.max(elapsedFraction, 0.01));
}
