// Filtro de período único: Hoje, Semana, Mês, Ano e intervalo personalizado.
// Todas as telas devem montar o período por aqui para que "este mês" seja o mesmo em todo lugar.
import {
  startOfDay, endOfDay, subDays,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, subYears,
  differenceInCalendarDays, addDays,
} from 'date-fns';

export type PeriodKey = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricsPeriod extends DateRange {
  key: PeriodKey;
  label: string;
  /** Período imediatamente anterior, de mesmo tamanho, para comparação. */
  previous: DateRange;
}

const WEEK = { weekStartsOn: 1 as const }; // semana começa na segunda

export function buildPeriod(
  key: PeriodKey,
  now: Date = new Date(),
  custom?: { from?: Date; to?: Date },
): MetricsPeriod {
  switch (key) {
    case 'hoje': {
      const y = subDays(now, 1);
      return {
        key, label: 'Hoje',
        start: startOfDay(now), end: endOfDay(now),
        previous: { start: startOfDay(y), end: endOfDay(y) },
      };
    }
    case 'semana': {
      const p = subWeeks(now, 1);
      return {
        key, label: 'Esta semana',
        start: startOfWeek(now, WEEK), end: endOfWeek(now, WEEK),
        previous: { start: startOfWeek(p, WEEK), end: endOfWeek(p, WEEK) },
      };
    }
    case 'ano': {
      const p = subYears(now, 1);
      return {
        key, label: 'Este ano',
        start: startOfYear(now), end: endOfYear(now),
        previous: { start: startOfYear(p), end: endOfYear(p) },
      };
    }
    case 'personalizado': {
      if (!custom?.from || !custom?.to) return buildPeriod('mes', now);
      const from = custom.from <= custom.to ? custom.from : custom.to;
      const to = custom.from <= custom.to ? custom.to : custom.from;
      const start = startOfDay(from);
      const end = endOfDay(to);
      const days = differenceInCalendarDays(end, start) + 1;
      return {
        key, label: 'Período personalizado',
        start, end,
        previous: { start: startOfDay(addDays(start, -days)), end: endOfDay(addDays(start, -1)) },
      };
    }
    case 'mes':
    default: {
      const p = subMonths(now, 1);
      return {
        key: 'mes', label: 'Este mês',
        start: startOfMonth(now), end: endOfMonth(now),
        previous: { start: startOfMonth(p), end: endOfMonth(p) },
      };
    }
  }
}

/** true se o instante (ISO ou Date) cai dentro do intervalo, extremos inclusos. */
export function inRange(value: string | Date | null | undefined, range: DateRange): boolean {
  if (!value) return false;
  const t = (value instanceof Date ? value : new Date(value)).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/** true se uma data sem hora (YYYY-MM-DD) cai dentro do intervalo, comparando por dia local. */
export function dateOnlyInRange(ymd: string | null | undefined, range: DateRange): boolean {
  if (!ymd) return false;
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return false;
  const day = new Date(y, m - 1, d, 12); // meio-dia local evita bordas de fuso
  return day >= startOfDay(range.start) && day <= endOfDay(range.end);
}
