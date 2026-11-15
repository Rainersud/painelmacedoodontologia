import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import {
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfYear,
  endOfYear, subYears, addDays, addWeeks, addMonths, addYears, format, isSameDay, isSameMonth, isSameYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DashboardPeriod = 'hoje' | 'semana' | 'mes' | 'ano';

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
  /** dias úteis proporcionais ao período (base 20du/mês) */
  businessDays: number;
  /** com o que o período está sendo comparado (ex.: "mês anterior", "mesmo período de 2025") */
  prevLabel?: string;
}

/** 0 = período anterior; 1, 2, 3 = mesmo período de 1, 2 ou 3 anos atrás. */
export type CompareYears = 0 | 1 | 2 | 3;

const PREV_LABELS: Record<DashboardPeriod, string> = {
  hoje: 'ontem', semana: 'semana anterior', mes: 'mês anterior', ano: 'ano anterior',
};

/** Aplica a comparação escolhida: período anterior ou o mesmo período de anos atrás. */
export function withComparison(r: PeriodRange, period: DashboardPeriod, years: CompareYears): PeriodRange {
  if (!years) return { ...r, prevLabel: r.prevLabel ?? PREV_LABELS[period] };
  return {
    ...r,
    prevStart: subYears(r.start, years),
    prevEnd: subYears(r.end, years),
    prevLabel: `mesmo período de ${r.start.getFullYear() - years}`,
  };
}

export interface CustomYearRange {
  from?: Date;
  to?: Date;
}

/**
 * Intervalo do filtro. `anchor` é o dia escolhido no filtro global (padrão: hoje):
 * Dia = aquele dia, Semana = a semana dele (seg–dom), Mês = o mês dele, Ano = o ano dele.
 */
export function buildRange(period: DashboardPeriod, customRange?: CustomYearRange, anchor: Date = new Date()): PeriodRange {
  const now = anchor;
  const today = new Date();
  switch (period) {
    case 'hoje':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        prevStart: startOfDay(subDays(now, 1)),
        prevEnd: endOfDay(subDays(now, 1)),
        label: isSameDay(now, today) ? 'Hoje' : format(now, "EEE, dd 'de' MMM yyyy", { locale: ptBR }),
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
        label: isSameDay(wStart, startOfWeek(today, { weekStartsOn: 1 })) ? 'Esta semana' : `Semana de ${format(wStart, 'dd/MM')} a ${format(wEnd, 'dd/MM/yyyy')}`,
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
        label: isSameYear(now, today) ? 'Este ano' : format(now, 'yyyy'),
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
        label: isSameMonth(now, today) ? 'Este mês' : capitalize(format(now, 'MMMM yyyy', { locale: ptBR })),
        businessDays: 20,
      };
    }
  }
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

interface Ctx {
  /** dia de referência do filtro (Dia/Semana/Mês/Ano em torno dele) */
  anchor: Date;
  setAnchor: (d: Date) => void;
  /** avança ou volta um período (dia, semana, mês ou ano) */
  shift: (dir: 1 | -1) => void;
  /** o período escolhido inclui hoje? */
  isCurrent: boolean;
  period: DashboardPeriod;
  setPeriod: (p: DashboardPeriod) => void;
  range: PeriodRange;
  customRange?: CustomYearRange;
  setCustomRange: (r: CustomYearRange | undefined) => void;
  compareYears: CompareYears;
  setCompareYears: (y: CompareYears) => void;
}

const PeriodCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = 'painel.filtroData';

function loadSaved(): { period?: DashboardPeriod; compareYears?: CompareYears } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * Filtro de data ÚNICO do sistema (fica no topo do App). Todas as telas leem daqui:
 * mudar a data no widget do canto superior direito muda o painel inteiro.
 * Guarda no navegador só o tipo de período e a comparação; a data sempre volta para hoje.
 */
export function PeriodFilterProvider({ children }: { children: ReactNode }) {
  const saved = loadSaved();
  const [period, setPeriodState] = useState<DashboardPeriod>(saved.period ?? 'mes');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [customRange, setCustomRangeState] = useState<CustomYearRange | undefined>(undefined);
  const [compareYears, setCompareYears] = useState<CompareYears>(saved.compareYears ?? 0);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, compareYears })); } catch { /* navegador sem armazenamento */ }
  }, [period, compareYears]);

  const setPeriod = useCallback((p: DashboardPeriod) => { setPeriodState(p); setCustomRangeState(undefined); }, []);
  const setCustomRange = useCallback((r: CustomYearRange | undefined) => {
    setCustomRangeState(r);
    if (r?.from && r?.to) setPeriodState('ano');
  }, []);
  const shift = useCallback((dir: 1 | -1) => {
    setCustomRangeState(undefined);
    setAnchor(a => (period === 'hoje' ? addDays(a, dir) : period === 'semana' ? addWeeks(a, dir) : period === 'ano' ? addYears(a, dir) : addMonths(a, dir)));
  }, [period]);

  const range = useMemo<PeriodRange>(
    () => withComparison(buildRange(period, customRange, anchor), period, compareYears),
    [period, customRange, anchor, compareYears],
  );
  const now = new Date();
  const isCurrent = range.start <= now && now <= range.end;
  const value = useMemo<Ctx>(
    () => ({ anchor, setAnchor, shift, isCurrent, period, setPeriod, range, customRange, setCustomRange, compareYears, setCompareYears }),
    [anchor, shift, isCurrent, period, setPeriod, range, customRange, setCustomRange, compareYears],
  );
  return <PeriodCtx.Provider value={value}>{children}</PeriodCtx.Provider>;
}

export function usePeriodFilter() {
  const ctx = useContext(PeriodCtx);
  if (!ctx) throw new Error('usePeriodFilter must be used inside PeriodFilterProvider');
  return ctx;
}

/**
 * Filtro de período do widget — sincroniza automaticamente com o filtro mestre
 * (PeriodFilterProvider) quando o usuário altera o calendário do topo, mas permite
 * sobrescrita local depois.
 */
/** Há um filtro mestre na tela? (os filtros de cada bloco somem e todos seguem o mestre) */
export function useHasMasterPeriod() {
  return useContext(PeriodCtx) !== null;
}

export function useLocalPeriod(initial: DashboardPeriod = 'mes') {
  const ctx = useContext(PeriodCtx);
  const [period, setPeriod] = useState<DashboardPeriod>(ctx?.period ?? initial);
  const [customRange, setCustomRange] = useState<CustomYearRange | undefined>(ctx?.customRange);

  // Sincroniza com o calendário mestre quando ele muda
  useEffect(() => {
    if (!ctx) return;
    setPeriod(ctx.period);
    setCustomRange(ctx.customRange);
  }, [ctx?.period, ctx?.customRange]);

  const range = useMemo<PeriodRange>(
    () => withComparison(buildRange(period, customRange), period, ctx?.compareYears ?? 0),
    [period, customRange, ctx?.compareYears],
  );
  // Com filtro mestre, o bloco usa exatamente o período e a comparação dele
  if (ctx) return { period: ctx.period, setPeriod: ctx.setPeriod, range: ctx.range, customRange: ctx.customRange, setCustomRange: ctx.setCustomRange, anchor: ctx.anchor };
  return { period, setPeriod, range, customRange, setCustomRange, anchor: new Date() };
}

/** Proporcionaliza uma meta mensal em função do período atual (base 20 du/mês). */
export function proportionalTarget(monthlyTarget: number, businessDays: number) {
  return Math.round((monthlyTarget * businessDays) / 20);
}
