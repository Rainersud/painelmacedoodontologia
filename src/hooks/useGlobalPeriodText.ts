import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';

const CURRENT: Record<string, string> = {
  Hoje: 'hoje', 'Esta semana': 'nesta semana', 'Este mês': 'neste mês', 'Este ano': 'neste ano',
};

/**
 * Período do filtro de data global com textos prontos para os cards
 * ("neste mês" / "em Outubro 2026" e "mês anterior" / "mesmo período de 2025").
 */
export function useGlobalPeriodText() {
  const { range } = usePeriodFilter();
  return {
    range,
    current: CURRENT[range.label] ?? `em ${range.label}`,
    previous: range.prevLabel ?? 'período anterior',
  };
}

/**
 * Para telas de contas mensais (custos, CAC, tráfego): o mês da data escolhida no filtro
 * global. `exact` diz se o filtro já está em "Mês" (se não, a tela avisa que mostra o mês).
 */
export function useGlobalMonth() {
  const { anchor, period, customRange } = usePeriodFilter();
  const month = customRange?.from ?? anchor;
  return { month, exact: period === 'mes' && !customRange?.from };
}
