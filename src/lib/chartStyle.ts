/**
 * Estilo unificado dos gráficos (referência: Dental Growth Launchpad).
 * Grid tracejado suave, eixos sem linha, tipografia discreta e tooltip em card.
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
