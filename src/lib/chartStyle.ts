/**
 * Estilo unificado dos gráficos — padrão "Clínica clara".
 * Grid tracejado suave, eixos sem linha, tipografia discreta e tooltip em card.
 *
 * Use SEMPRE estes helpers em qualquer gráfico do CRM:
 *   <CartesianGrid {...chartGrid} />
 *   <XAxis {...chartAxis} /> <YAxis {...chartAxis} />
 *   <Tooltip {...chartTooltipProps} />
 *   <Legend {...chartLegend} />
 */

export const chartGrid = {
  strokeDasharray: '3 3',
  vertical: false,
  stroke: 'hsl(var(--border))',
  opacity: 0.4,
} as const;

export const chartAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
} as const;

export const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
  boxShadow: '0 8px 24px -16px hsl(193 26% 14% / 0.35)',
} as const;

export const chartTooltipItemStyle = { color: 'hsl(var(--foreground))' } as const;
export const chartTooltipLabelStyle = {
  color: 'hsl(var(--muted-foreground))',
  fontWeight: 600,
} as const;

/** Props completas do <Tooltip /> — padrão único de toda a aplicação. */
export const chartTooltipProps = {
  contentStyle: chartTooltipStyle,
  itemStyle: chartTooltipItemStyle,
  labelStyle: chartTooltipLabelStyle,
  cursor: { fill: 'hsl(var(--muted) / 0.25)' },
} as const;

/** Tooltip para gráficos de linha/área (cursor em linha, não em bloco). */
export const chartTooltipLineProps = {
  contentStyle: chartTooltipStyle,
  itemStyle: chartTooltipItemStyle,
  labelStyle: chartTooltipLabelStyle,
  cursor: { stroke: 'hsl(var(--border))', strokeWidth: 1 },
} as const;

/** Legenda padrão. */
export const chartLegend = {
  wrapperStyle: { fontSize: 12, color: 'hsl(var(--muted-foreground))' },
  iconType: 'circle' as const,
  iconSize: 8,
};

/** Formatação curta de valores em R$ para ticks de eixo. */
export const currencyTick = (v: number) =>
  Math.abs(v) >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

/**
 * Séries de gráfico em ordem fixa (paleta validada para daltonismo, claro e escuro).
 * Atribua pela ordem da entidade, nunca pelo ranking. 6ª em diante → "Outros" (cinza).
 */
export const SERIES = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
] as const;
export const SERIES_OTHER = 'hsl(var(--chart-6))';
export const seriesColor = (i: number) => SERIES[i] ?? SERIES_OTHER;

/** Cores de status (reservadas: nunca usar como "série 4"). */
export const STATUS_COLOR = {
  good: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  critical: 'hsl(var(--destructive))',
} as const;

/**
 * Cor fixa por origem do lead (a cor acompanha a origem em todas as telas).
 * As cinco origens principais têm cor própria; as demais ficam em cinza ("Outras").
 */
const ORIGIN_ORDER = ['facebook', 'instagram', 'google', 'indicacao_pac', 'passou_na_frente'];
const ORIGIN_LABEL_TO_KEY: Record<string, string> = {
  Facebook: 'facebook', Instagram: 'instagram', Google: 'google',
  'Indicação de paciente': 'indicacao_pac', 'Passou na frente': 'passou_na_frente',
};
export const originColor = (keyOrLabel: string) => {
  const key = ORIGIN_LABEL_TO_KEY[keyOrLabel] ?? keyOrLabel;
  const i = ORIGIN_ORDER.indexOf(key);
  return i >= 0 ? SERIES[i] : SERIES_OTHER;
};
