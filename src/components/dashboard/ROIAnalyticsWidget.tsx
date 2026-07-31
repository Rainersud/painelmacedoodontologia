import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useROIAnalytics } from '@/hooks/useROIAnalytics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { WidgetPeriodTabs } from '@/components/dashboard/WidgetPeriodTabs';
import { chartGrid, chartAxis, chartTooltipProps, chartLegend } from '@/lib/chartStyle';

export function ROIAnalyticsWidget() {
  const { period, setPeriod, range } = useLocalPeriod('mes');
  const { data, isLoading } = useROIAnalytics(range);

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              ROI Inteligente
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Retorno sobre investimento com análise multidimensional · {range.label}</p>
          </div>
          <WidgetPeriodTabs value={period} onChange={setPeriod} variant="week-month-year" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evolution">
          <TabsList>
            <TabsTrigger value="evolution">Evolução</TabsTrigger>
            <TabsTrigger value="origin">Por Origem</TabsTrigger>
            <TabsTrigger value="campaign">Por Campanha</TabsTrigger>
            <TabsTrigger value="agent">Por Vendedor</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.evolution || []}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(156 72% 45%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(156 72% 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="inv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartGrid} />
                    <XAxis {...chartAxis} dataKey="date" />
                    <YAxis {...chartAxis} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...chartTooltipProps} formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="receita" stroke="hsl(156 72% 45%)" strokeWidth={2} fill="url(#rev)" name="Receita" />
                    <Area type="monotone" dataKey="investimento" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#inv)" name="Investimento" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          {(['origin', 'campaign', 'agent'] as const).map(tab => {
            const list = tab === 'origin' ? data?.byOrigin : tab === 'campaign' ? data?.byCampaign : data?.byAgent;
            const isOrigin = tab === 'origin';
            return (
              <TabsContent key={tab} value={tab} className="mt-4">
                {isLoading ? <Skeleton className="h-[280px] w-full" /> : !list || list.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados para o período</p>
                ) : (
                  <div className="space-y-2">
                    {list.slice(0, 8).map((item, i) => {
                      const positive = item.roi >= 0;
                      return (
                        <div key={`${item.name}-${i}`} className={cn('p-3 rounded-lg border', positive ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20')}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <div className={cn('flex items-center gap-1 font-bold text-sm', positive ? 'text-success' : 'text-destructive')}>
                              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              ROI {item.roi}%
                            </div>
                          </div>
                          {isOrigin ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <Metric label="Leads" value={item.leads} />
                              <Metric label="Agendados" value={item.agendamentos} />
                              <Metric label="Compareceram" value={item.comparecimentos} />
                              <Metric label="Vendas" value={item.vendas} />
                              <Metric label="Faturamento" value={formatCurrency(item.receita)} />
                              <Metric label="Investimento" value={formatCurrency(item.investimento)} />
                              <Metric label="Ticket Médio" value={formatCurrency(item.ticketMedio)} />
                              <Metric label="Taxa Fech." value={`${item.taxaFechamento}%`} />
                              <Metric label="ROAS" value={`${item.roas}x`} />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {item.vendas} venda{item.vendas !== 1 ? 's' : ''} · Receita {formatCurrency(item.receita)} · Inv. {formatCurrency(item.investimento)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-background/60 rounded px-2 py-1.5 border border-border/40">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  );
}
