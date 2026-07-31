/**
 * Estilo unificado dos gráficos (referência: Dental Growth Launchpad).
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
  borderRadius: '0.75rem',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
  boxShadow: '0 12px 40px -20px hsl(0 0% 0% / 0.6)',
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
