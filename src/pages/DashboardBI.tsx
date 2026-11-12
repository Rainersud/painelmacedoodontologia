import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useBIDashboard, type BIPeriodFilter } from '@/hooks/useBIDashboard';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  Repeat,
  Target,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { chartGrid, chartAxis, seriesColor } from '@/lib/chartStyle';

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Séries fixas do padrão; vermelho só como status (ROI negativo)
const biColors = {
  green: 'hsl(var(--chart-1))',
  blue: 'hsl(var(--chart-2))',
  orange: 'hsl(var(--chart-3))',
  purple: 'hsl(var(--chart-4))',
  red: 'hsl(var(--destructive))',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl p-3 shadow-xl text-sm space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{formatBRL(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const DashboardBI = () => {
  const [period, setPeriod] = useState<BIPeriodFilter>('todos');
  const { data, isLoading } = useBIDashboard(period);

  const kpiCards = data
    ? [
        {
          title: 'Faturamento Recebido',
          value: data.kpis.faturamentoRecebido,
          icon: DollarSign,
          color: biColors.green,
          subtitle: 'Mês atual (caixa)',
        },
        {
          title: 'Faturamento Previsto',
          value: data.kpis.faturamentoPrevisto,
          icon: TrendingUp,
          color: biColors.orange,
          subtitle: 'Parcelas pendentes',
        },
        {
          title: 'LTV Total',
          value: data.kpis.ltvTotal,
          icon: BarChart3,
          color: biColors.purple,
          subtitle: 'Valor total vendido',
        },
        {
          title: 'Ticket Médio',
          value: data.kpis.ticketMedio,
          icon: ShoppingCart,
          color: biColors.blue,
          subtitle: 'Faturamento ÷ vendas',
        },
        {
          title: 'Média de Compras',
          value: data.kpis.mediaComprasPaciente,
          icon: Repeat,
          color: biColors.purple,
          subtitle: 'Por paciente',
          formatAsNumber: true,
        },
        {
          title: 'CAC Médio',
          value: data.kpis.cacMedio,
          icon: Target,
          color: biColors.blue,
          subtitle: 'Custo de aquisição',
        },
        {
          title: 'Total Pacientes',
          value: data.kpis.totalPacientes,
          icon: Users,
          color: biColors.green,
          subtitle: 'Que geraram receita',
          formatAsNumber: true,
        },
        {
          title: 'ROI Geral',
          value: data.kpis.roiGeral,
          icon: ArrowUpRight,
          color: data.kpis.roiGeral >= 0 ? biColors.green : biColors.red,
          subtitle: 'Retorno sobre investimento',
          formatAsPercent: true,
        },
      ]
    : [];

  return (
    <AppLayout title="Dashboard BI">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Painel Executivo (BI)</h2>
            <p className="text-sm text-muted-foreground">
              Visão 360° da clínica — receita, LTV, CAC e performance
            </p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as BIPeriodFilter)}>
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="mes" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mês</TabsTrigger>
              <TabsTrigger value="trimestre" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Trimestre</TabsTrigger>
              <TabsTrigger value="semestre" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Semestre</TabsTrigger>
              <TabsTrigger value="ano" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ano</TabsTrigger>
              <TabsTrigger value="todos" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tudo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))
            : kpiCards.map((kpi) => (
                <Card key={kpi.title} className="overflow-hidden group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {kpi.title}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold truncate">
                          {kpi.formatAsNumber
                            ? kpi.value.toFixed(1)
                            : kpi.formatAsPercent
                            ? `${kpi.value.toFixed(1)}%`
                            : formatBRL(kpi.value)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{kpi.subtitle}</p>
                      </div>
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: kpi.color }}
                      >
                        <kpi.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Smart Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <Card className="monday-card border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-strong" />
                Alertas Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg text-sm',
                      alert.type === 'danger' && 'bg-destructive/10 text-destructive',
                      alert.type === 'warning' && 'bg-warning/10 text-warning-strong',
                      alert.type === 'info' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <span>{alert.icon}</span>
                    <span className="font-medium">{alert.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Projection */}
        {data && (
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Projeção de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Próximos 30 dias', value: data.projection30 },
                  { label: 'Próximos 60 dias', value: data.projection60 },
                  { label: 'Próximos 90 dias', value: data.projection90 },
                ].map((p) => (
                  <div key={p.label} className="rounded-xl bg-muted/40 p-4 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-primary">{formatBRL(p.value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row 1: Real Revenue + Future Revenue */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Real Revenue (Bars) */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Faturamento Real (Caixa)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.monthlyData || []}>
                      <CartesianGrid {...chartGrid} />
                      <XAxis {...chartAxis} dataKey="label" />
                      <YAxis {...chartAxis} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="faturamentoReal" name="Faturamento Real" fill={biColors.green} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Future Revenue (Area) */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Faturamento Futuro (Parcelas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.monthlyData || []}>
                      <defs>
                        <linearGradient id="gradFuturo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={biColors.orange} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={biColors.orange} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...chartGrid} />
                      <XAxis {...chartAxis} dataKey="label" />
                      <YAxis {...chartAxis} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="faturamentoFuturo" name="Faturamento Futuro" stroke={biColors.orange} strokeWidth={2} fill="url(#gradFuturo)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: CAC + LTV */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* CAC Chart */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                CAC por mês (investimento ÷ vendas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.monthlyData || []}>
                      <CartesianGrid {...chartGrid} />
                      <XAxis {...chartAxis} dataKey="label" />
                      <YAxis {...chartAxis} tickFormatter={(v) => `R$ ${Math.round(v)}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cac" name="CAC" fill={biColors.blue} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LTV Chart */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Comercial 2 (LTV – Valor Total)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.monthlyData || []}>
                      <defs>
                        <linearGradient id="gradLTV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={biColors.purple} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={biColors.purple} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...chartGrid} />
                      <XAxis {...chartAxis} dataKey="label" />
                      <YAxis {...chartAxis} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="ltv" name="LTV (Recompras)" stroke={biColors.purple} strokeWidth={2} fill="url(#gradLTV)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LTV Evolution by Purchase Stage */}
        <Card className="monday-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Evolução do LTV por Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.ltvEvolution || []}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis {...chartAxis} dataKey="stage" />
                    <YAxis {...chartAxis} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" name="LTV Médio" stroke={biColors.purple} strokeWidth={3} dot={{ r: 6, fill: biColors.purple, strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* LTV Funnel Visual */}
        <Card className="monday-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Funil de LTV – Progressão de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-32 rounded-lg" />
            ) : (
              <div className="space-y-3">
                {data?.ltvFunnel.map((stage, i) => {
                  const maxCount = Math.max(...(data?.ltvFunnel.map(s => s.count) || [1]), 1);
                  const widthPercent = Math.max((stage.count / maxCount) * 100, 8);
                  const colors = [0, 1, 2, 3, 4].map(seriesColor);
                  const color = colors[i % colors.length];

                  return (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-28 shrink-0 text-right text-muted-foreground">
                        {stage.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="relative h-9 rounded-lg bg-muted/30 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg flex items-center justify-between px-3 transition-all duration-700"
                            style={{ width: `${widthPercent}%`, backgroundColor: color }}
                          >
                            <span className="text-white text-xs font-bold whitespace-nowrap">
                              {stage.count} pacientes
                            </span>
                            {widthPercent > 30 && (
                              <span className="text-white/80 text-[10px] whitespace-nowrap">
                                {stage.percent.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {i > 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] shrink-0',
                            stage.progressionRate >= 30 ? 'bg-success/10 text-success' :
                            stage.progressionRate >= 15 ? 'bg-warning/10 text-warning-strong' :
                            'bg-destructive/10 text-destructive'
                          )}
                        >
                          ↑ {stage.progressionRate.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DashboardBI;
