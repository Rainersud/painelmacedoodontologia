import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Clock, Users,
  Activity, Target, Trophy, BarChart3, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import { useLTVFinancial } from '@/hooks/useLTVFinancial';
import { useCACMonthly } from '@/hooks/useRevenueProjection';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { chartGrid, chartAxis, chartTooltipProps, chartLegend } from '@/lib/chartStyle';

const HEALTH_MAP = {
  success: { label: '🟢 Saudável', cls: 'bg-success/10 text-success border-success/30' },
  warning: { label: '🟡 Estável', cls: 'bg-warning/10 text-warning border-warning/30' },
  destructive: { label: '🔴 Atenção', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
} as const;

export function LTVExecutivePanel() {
  const { data, isLoading } = useLTVFinancial();
  const { data: cacMonthly } = useCACMonthly();
  const queryClient = useQueryClient();

  // Realtime sync
  useEffect(() => {
    const ch = supabase
      .channel('ltv-financial-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ltv-financial-panel'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'upsell_opportunities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ltv-financial-panel'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  if (isLoading || !data) {
    return <div className="h-48 rounded-lg border bg-muted/30 animate-pulse" />;
  }

  const health = HEALTH_MAP[data.health];
  const positive = data.crescimentoPct >= 0;

  // Comparative chart: Com1 (CAC) vs Com2 (LTV) merged by month
  const cacMap: Record<string, number> = {};
  (cacMonthly || []).forEach(m => { cacMap[m.month] = m.total; });
  const comparative = data.evolucaoMensal.map(m => ({
    label: m.label,
    com1: cacMap[m.month] || 0,
    com2: m.recebido,
  }));

  return (
    <div className="space-y-4">
      {/* ============== HERO LTV CARD ============== */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-chart-3/5 to-success/10">
        <div className="absolute inset-0 opacity-50 pointer-events-none"
             style={{ background: 'radial-gradient(circle at 20% 20%, hsl(var(--primary)/0.15), transparent 60%), radial-gradient(circle at 80% 80%, hsl(var(--success)/0.15), transparent 60%)' }} />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LTV Inteligente · $ Financeiro</span>
                <Badge className={cn('text-[10px] ml-1', health.cls)}>{health.label}</Badge>
              </div>
              <p className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-chart-3 to-success bg-clip-text text-transparent">
                {formatCurrency(data.ltvAtual)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                LTV total acumulado · {data.totalPacientesLTV} pacientes recorrentes
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 min-w-[300px]">
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Crescimento</p>
                <div className={cn('flex items-center justify-end gap-1 text-lg font-bold',
                  positive ? 'text-success' : 'text-destructive')}>
                  {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {data.crescimentoPct.toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground">vs. mês anterior</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Recorrente 30d</p>
                <p className="text-lg font-bold text-chart-3">{formatCurrency(data.receitaRecorrente)}</p>
                <p className="text-[10px] text-muted-foreground">últimos 30 dias</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Projeção Futura</p>
                <p className="text-lg font-bold text-warning">{formatCurrency(data.projecaoFutura)}</p>
                <p className="text-[10px] text-muted-foreground">pendente a receber</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============== MINI FINANCIAL CARDS ============== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniCard icon={<Wallet className="h-4 w-4" />} label="Total Recebido"
          value={formatCurrency(data.totalRecebido)} color="success" />
        <MiniCard icon={<Clock className="h-4 w-4" />} label="Total Pendente"
          value={formatCurrency(data.totalPendente)} color="warning" />
        <MiniCard icon={<DollarSign className="h-4 w-4" />} label="Ticket Acumulado"
          value={formatCurrency(data.ticketAcumulado)} color="primary" />
        <MiniCard icon={<Activity className="h-4 w-4" />} label="Receita Recorrente"
          value={formatCurrency(data.receitaRecorrente)} color="chart-3" />
        <MiniCard icon={<Users className="h-4 w-4" />} label="Média / Paciente"
          value={formatCurrency(data.receitaPorPaciente)} color="chart-5" />
        <MiniCard icon={<Target className="h-4 w-4" />} label="Receita do Mês"
          value={formatCurrency(data.receitaMesAtual)} color="chart-2" />
      </div>

      {/* ============== CHARTS ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Evolução do LTV — Receita Recorrente Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.evolucaoMensal}>
                <defs>
                  <linearGradient id="ltvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGrid} />
                <XAxis {...chartAxis} dataKey="label" />
                <YAxis {...chartAxis} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="recebido" stroke="hsl(var(--success))" fill="url(#ltvGrad)" strokeWidth={2} name="Recebido" />
                <Area type="monotone" dataKey="pendente" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.15} strokeWidth={2} name="Pendente" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparative Com1 vs Com2 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Comparativo: Comercial 1 vs Comercial 2 (LTV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparative}>
                <CartesianGrid {...chartGrid} />
                <XAxis {...chartAxis} dataKey="label" />
                <YAxis {...chartAxis} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => formatCurrency(v)} />
                <Legend {...chartLegend} />
                <Bar dataKey="com1" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Comercial 1" />
                <Bar dataKey="com2" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Comercial 2 (LTV)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ============== REVENUE PER SELLER ============== */}
      {data.receitaPorVendedor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-chart-4" />
              Receita por Vendedor (LTV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.receitaPorVendedor.map((v, i) => {
              const max = data.receitaPorVendedor[0].total || 1;
              const pct = (v.total / max) * 100;
              return (
                <div key={v.agentId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium">{v.agentName}</span>
                      <Badge variant="outline" className="text-[9px] h-4">{v.pacientes} pac.</Badge>
                    </div>
                    <span className="font-bold text-success">{formatCurrency(v.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-success to-chart-3 transition-all"
                         style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string;
  color: 'success' | 'warning' | 'primary' | 'chart-3' | 'chart-5' | 'chart-2';
}) {
  const colorMap: Record<string, string> = {
    'success': 'text-success border-success/20 bg-success/5',
    'warning': 'text-warning border-warning/20 bg-warning/5',
    'primary': 'text-primary border-primary/20 bg-primary/5',
    'chart-3': 'text-chart-3 border-chart-3/20 bg-chart-3/5',
    'chart-5': 'text-chart-5 border-chart-5/20 bg-chart-5/5',
    'chart-2': 'text-chart-2 border-chart-2/20 bg-chart-2/5',
  };
  return (
    <Card className={cn('border', colorMap[color])}>
      <CardContent className="p-3">
        <div className={cn('flex items-center gap-1.5 mb-1', colorMap[color].split(' ')[0])}>
          {icon}
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className={cn('text-base font-bold', colorMap[color].split(' ')[0])}>{value}</p>
      </CardContent>
    </Card>
  );
}
