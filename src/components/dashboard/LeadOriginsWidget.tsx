import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategicInsights } from '@/hooks/useStrategicInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { PieChart as PieIcon, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SOURCE_CONFIG } from '@/types/crm';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { WidgetPeriodTabs } from '@/components/dashboard/WidgetPeriodTabs';

const COLORS = ['hsl(213 94% 58%)', 'hsl(156 72% 45%)', 'hsl(270 75% 60%)', 'hsl(32 95% 55%)', 'hsl(340 82% 60%)', 'hsl(180 70% 50%)', 'hsl(45 93% 58%)', 'hsl(0 84% 60%)'];

export function LeadOriginsWidget() {
  const { period, setPeriod, range } = useLocalPeriod('mes');
  const { data, isLoading } = useStrategicInsights(range);

  const chartData = (data?.origins || []).map((o, i) => ({
    name: SOURCE_CONFIG[o.source as keyof typeof SOURCE_CONFIG]?.label || o.source,
    value: o.count,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-primary" />
            Origem dos Leads
          </CardTitle>
          <WidgetPeriodTabs value={period} onChange={setPeriod} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {(data?.origins || []).map((o, i) => (
                <div key={o.source} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{SOURCE_CONFIG[o.source as keyof typeof SOURCE_CONFIG]?.label || o.source}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{o.count} leads · {o.conversao}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(o.receita)} · ROI {o.roi}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LossReasonsWidget() {
  const { data, isLoading } = useStrategicInsights();
  const losses = (data?.losses || []).filter(l => l.count > 0);
  const top = losses[0];

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Perdas por Motivo
        </CardTitle>
        <p className="text-xs text-muted-foreground">Categorias inteligentes · quantidade · % · valor estimado perdido</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : losses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma perda registrada no período 🎉</p>
        ) : (
          <div className="space-y-3">
            {top && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-xs uppercase tracking-wide text-destructive font-bold">Maior perda atual</p>
                <p className="text-base font-semibold mt-0.5">
                  {top.reason} <span className="text-destructive">({top.pct}%)</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {top.count} lead{top.count !== 1 ? 's' : ''} perdido{top.count !== 1 ? 's' : ''} · {formatCurrency(top.valorPerdido)} estimados
                </p>
              </div>
            )}
            <div className="space-y-2">
              {losses.map((l, idx) => (
                <div key={l.reason} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">
                      {idx === 0 && '🔥 '}
                      {l.reason}
                    </span>
                    <span className="text-xs font-bold text-destructive">{l.pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{l.count} lead{l.count !== 1 ? 's' : ''} perdido{l.count !== 1 ? 's' : ''}</span>
                    <span>Estimado: {formatCurrency(l.valorPerdido)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${l.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
