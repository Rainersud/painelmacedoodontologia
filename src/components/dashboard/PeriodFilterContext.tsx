import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export type DashboardPeriod = 'hoje' | '7d' | '30d' | 'mes';

interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
  days: number;
}

interface Ctx {
  period: DashboardPeriod;
  setPeriod: (p: DashboardPeriod) => void;
  range: PeriodRange;
}

const PeriodCtx = createContext<Ctx | null>(null);

export function PeriodFilterProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<DashboardPeriod>('mes');

  const range = useMemo<PeriodRange>(() => {
    const now = new Date();
    switch (period) {
      case 'hoje':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
          prevStart: startOfDay(subDays(now, 1)),
          prevEnd: endOfDay(subDays(now, 1)),
          label: 'Hoje',
          days: 1,
        };
      case '7d':
        return {
          start: startOfDay(subDays(now, 6)),
          end: endOfDay(now),
          prevStart: startOfDay(subDays(now, 13)),
          prevEnd: endOfDay(subDays(now, 7)),
          label: 'Últimos 7 dias',
          days: 7,
        };
      case '30d':
        return {
          start: startOfDay(subDays(now, 29)),
          end: endOfDay(now),
          prevStart: startOfDay(subDays(now, 59)),
          prevEnd: endOfDay(subDays(now, 30)),
          label: 'Últimos 30 dias',
          days: 30,
        };
      case 'mes':
      default: {
        const prev = subMonths(now, 1);
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          prevStart: startOfMonth(prev),
          prevEnd: endOfMonth(prev),
          label: 'Este mês',
          days: 30,
        };
      }
    }
  }, [period]);

  return <PeriodCtx.Provider value={{ period, setPeriod, range }}>{children}</PeriodCtx.Provider>;
}

export function usePeriodFilter() {
  const ctx = useContext(PeriodCtx);
  if (!ctx) throw new Error('usePeriodFilter must be used inside PeriodFilterProvider');
  return ctx;
}
