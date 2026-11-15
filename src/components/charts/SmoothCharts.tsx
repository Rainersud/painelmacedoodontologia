import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartGrid, chartTooltipProps } from '@/lib/chartStyle';

/**
 * Gráficos em curva do painel (padrão visual escolhido em 15/11/2026):
 * área com preenchimento suave na cor da marca e a meta como linha tracejada.
 */

const BRAND = 'hsl(var(--primary))';
const MUTED = 'hsl(var(--muted-foreground))';

export interface GoalCurvePoint { label: string; value: number; goal?: number }

/** Curva acumulada contra a meta (ex.: faturamento do mês dia a dia). */
export function GoalCurve({
  points, height = 200, format = (v: number) => v.toLocaleString('pt-BR'), valueLabel = 'Realizado', goalLabel = 'Ritmo da meta',
}: {
  points: GoalCurvePoint[];
  height?: number;
  format?: (v: number) => string;
  valueLabel?: string;
  goalLabel?: string;
}) {
  const id = useId().replace(/:/g, '');
  const compact = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...chartGrid} />
          <XAxis dataKey="label" {...chartAxis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...chartAxis} tickFormatter={compact} width={44} />
          <Tooltip
            {...chartTooltipProps}
            formatter={(v: number, name: string) => [format(v), name === 'goal' ? goalLabel : valueLabel]}
          />
          <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2.5} fill={`url(#fill-${id})`}
            dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} isAnimationActive={false} />
          <Line type="linear" dataKey="goal" stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 5" dot={false}
            activeDot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Mini gráfico de tendência dentro de um card (sem eixos). */
export function Sparkline({ data, height = 40, tone = 'brand' }: { data: number[]; height?: number; tone?: 'brand' | 'muted' | 'danger' }) {
  const id = useId().replace(/:/g, '');
  const color = tone === 'danger' ? 'hsl(var(--destructive))' : tone === 'muted' ? MUTED : BRAND;
  if (data.length < 2) return <div style={{ height }} />;
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Legenda curta para a curva contra a meta. */
export function GoalCurveLegend({ valueLabel = 'Realizado', goalLabel = 'Ritmo da meta' }: { valueLabel?: string; goalLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-primary" />{valueLabel}</span>
      <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-muted-foreground" />{goalLabel}</span>
    </div>
  );
}
