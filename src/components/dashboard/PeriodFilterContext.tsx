import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfYear, endOfYear, subYears } from 'date-fns';

export type DashboardPeriod = 'hoje' | 'semana' | 'mes' | 'ano';

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
  /** dias úteis proporcionais ao período (base 20du/mês) */
  businessDays: number;
}

export interface CustomYearRange {
  from?: Date;
  to?: Date;
}

export function buildRange(period: DashboardPeriod, customRange?: CustomYearRange): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'hoje':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        prevStart: startOfDay(subDays(now, 1)),
        prevEnd: endOfDay(subDays(now, 1)),
        label: 'Hoje',
        businessDays: 1,
      };
    case 'semana': {
      const wStart = startOfWeek(now, { weekStartsOn: 1 });
      const wEnd = endOfWeek(now, { weekStartsOn: 1 });
      const prev = subWeeks(now, 1);
      return {
        start: wStart,
        end: wEnd,
        prevStart: startOfWeek(prev, { weekStartsOn: 1 }),
        prevEnd: endOfWeek(prev, { weekStartsOn: 1 }),
        label: 'Esta semana',
        businessDays: 5,
      };
    }
    case 'ano': {
      if (customRange?.from && customRange?.to) {
        const start = startOfDay(customRange.from);
        const end = endOfDay(customRange.to);
        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
        const businessDays = Math.max(1, Math.round((days * 5) / 7));
        const span = end.getTime() - start.getTime();
        return {
          start,
          end,
          prevStart: new Date(start.getTime() - span - 86400000),
          prevEnd: new Date(end.getTime() - span - 86400000),
          label: 'Período personalizado',
          businessDays,
        };
      }
      const prev = subYears(now, 1);
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        prevStart: startOfYear(prev),
        prevEnd: endOfYear(prev),
        label: 'Este ano',
        businessDays: 240,
      };
    }
    case 'mes':
    default: {
      const prev = subMonths(now, 1);
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        prevStart: startOfMonth(prev),
        prevEnd: endOfMonth(prev),
        label: 'Este mês',
        businessDays: 20,
      };
    }
  }
}

interface Ctx {
  period: DashboardPeriod;
  setPeriod: (p: DashboardPeriod) => void;
  range: PeriodRange;
}

const PeriodCtx = createContext<Ctx | null>(null);

export function PeriodFilterProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<DashboardPeriod>('mes');
  const range = useMemo<PeriodRange>(() => buildRange(period), [period]);
  return <PeriodCtx.Provider value={{ period, setPeriod, range }}>{children}</PeriodCtx.Provider>;
}

export function usePeriodFilter() {
  const ctx = useContext(PeriodCtx);
  if (!ctx) throw new Error('usePeriodFilter must be used inside PeriodFilterProvider');
  return ctx;
}

/** Filtro de período local — independente do contexto global. */
export function useLocalPeriod(initial: DashboardPeriod = 'mes') {
  const [period, setPeriod] = useState<DashboardPeriod>(initial);
  const range = useMemo<PeriodRange>(() => buildRange(period), [period]);
  return { period, setPeriod, range };
}

/** Proporcionaliza uma meta mensal em função do período atual (base 20 du/mês). */
export function proportionalTarget(monthlyTarget: number, businessDays: number) {
  return Math.round((monthlyTarget * businessDays) / 20);
}
