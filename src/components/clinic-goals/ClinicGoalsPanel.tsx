import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useClinicGoalsPanel, type Period } from '@/hooks/useClinicGoalsPanel';
import { MainGoalCard } from './MainGoalCard';
import {
  Target, TrendingUp, TrendingDown, Minus, Lightbulb, Activity,
  Users, Calendar, UserCheck, DollarSign, BarChart3, Wallet, MousePointerClick, Zap,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  leads: Users,
  agendamentos: Calendar,
  taxa_agendamento: Activity,
  comparecimentos: UserCheck,
  taxa_comparecimento: Activity,
  vendas: DollarSign,
  taxa_fechamento: Activity,
  ticket_medio: Wallet,
  faturamento: TrendingUp,
  investimento: BarChart3,
  cpl: MousePointerClick,
  cac: Target,
  roi: Zap,
  roas: Zap,
};

// 🔵 saudável | 🟢 atenção | 🔴 crítico (conforme spec do cliente)
const STATUS_STYLES = {
  healthy: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    bar: 'bg-blue-500',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Saudável',
  },
  warning: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    bar: 'bg-emerald-500',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Atenção',
  },
  critical: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    bar: 'bg-red-500',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Crítico',
  },
} as const;

const PERIOD_LABEL: Record<Period, string> = { hoje: 'Hoje', semana: 'Semana', mes: 'Mês' };

export function ClinicGoalsPanel() {
  const [period, setPeriod] = useState<Period>('mes');
  const { data, isLoading } = useClinicGoalsPanel(period);

  return (
    <div className="space-y-4">
      <Card className="monday-card overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-red-500" />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white shadow">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">Metas da Clínica</h2>
                <p className="text-xs text-muted-foreground">
                  Painel premium · sincronizado em tempo real
                  {data && ` · ${data.businessDays}/${data.totalBusinessDays} dias úteis`}
                </p>
              </div>
            </div>

            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="hoje" className="text-xs">Hoje</TabsTrigger>
                <TabsTrigger value="semana" className="text-xs">Semana</TabsTrigger>
                <TabsTrigger value="mes" className="text-xs">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Objetivo principal */}
          <MainGoalCard />
        </CardContent>
      </Card>

      {/* Grid de métricas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
        ))}
        {data?.metrics.map(m => {
          const Icon = ICONS[m.key] || Activity;
          const st = STATUS_STYLES[m.status];
          return (
            <Card key={m.key} className={cn('monday-card overflow-hidden border', st.border)}>
              <div className={cn('h-1 w-full', st.bar)} />
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', st.bg)}>
                      <Icon className={cn('h-4 w-4', st.text)} />
                    </div>
                    <span className="text-xs font-semibold truncate">{m.label}</span>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', st.bg, st.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                    {st.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className={cn('text-2xl font-bold tabular-nums', st.text)}>{m.display}</span>
                  <span className="text-[11px] text-muted-foreground">/ {m.targetDisplay}</span>
                </div>

                <Sparkline data={m.trend} height={28} strokeClassName={st.text} fillClassName={st.text} />

                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-500', st.bar)}
                    style={{ width: `${Math.min(100, m.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn('font-semibold', st.text)}>{m.percentage}%</span>
                  {m.delta !== 0 ? (
                    <span className={cn(
                      'inline-flex items-center gap-0.5',
                      (m.lowerIsBetter ? m.delta < 0 : m.delta > 0) ? 'text-blue-600' : 'text-red-500',
                    )}>
                      {m.delta > 0 ? <TrendingUp className="h-3 w-3" /> : m.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {Math.abs(m.delta)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{PERIOD_LABEL[period]}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Insights */}
      {data && data.insights.length > 0 && (
        <Card className="monday-card overflow-hidden border-blue-500/30 bg-blue-500/5">
          <div className="h-1 w-full bg-blue-500" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold">Inteligência Comercial</h3>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {data.insights.length} insight{data.insights.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <ul className="space-y-2">
              {data.insights.map((ins, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2 p-2 rounded-md bg-background/60 border border-border/50">
                  <span className="mt-0.5">{ins}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
