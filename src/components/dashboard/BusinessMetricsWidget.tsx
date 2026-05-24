import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import {
  Users, DollarSign, MessageSquare, Calendar, UserCheck, TrendingUp,
  Wallet, Target, BarChart3, Clock, RotateCcw, Heart, Briefcase,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Direction = 'higher' | 'lower';
type Status = 'healthy' | 'attention' | 'critical';

function getStatus(current: number, target: number, dir: Direction): Status {
  if (target <= 0) return 'attention';
  if (dir === 'higher') {
    if (current >= target) return 'healthy';
    if (current >= target * 0.8) return 'attention';
    return 'critical';
  } else {
    if (current === 0) return 'attention';
    if (current <= target) return 'healthy';
    if (current <= target * 1.2) return 'attention';
    return 'critical';
  }
}

const statusStyles: Record<Status, { bar: string; text: string; chip: string; label: string }> = {
  healthy: { bar: 'bg-success', text: 'text-success', chip: 'bg-success/15 text-success', label: 'Saudável' },
  attention: { bar: 'bg-warning', text: 'text-warning', chip: 'bg-warning/15 text-warning', label: 'Atenção' },
  critical: { bar: 'bg-destructive', text: 'text-destructive', chip: 'bg-destructive/15 text-destructive', label: 'Crítico' },
};

export function BusinessMetricsWidget() {
  const { data, isLoading } = useBusinessMetrics();
  const { period } = usePeriodFilter();

  // Meta proporcional de Novos Leads (300/mês baseado em 20 dias úteis ⇒ 15/dia útil)
  const leadsTarget = period === 'hoje' ? 15 : period === '7d' ? 75 : 300;

  type Metric = {
    label: string;
    icon: any;
    value: number;
    target: number;
    direction: Direction;
    format: (v: number) => string;
    suffix?: string;
  };

  const metrics: Metric[] = [
    { label: 'Novos Leads', icon: Users, value: data?.leadsGerados ?? 0, target: leadsTarget, direction: 'higher', format: v => v.toString() },
    { label: 'CPL', icon: DollarSign, value: data?.cpl ?? 0, target: 20, direction: 'lower', format: v => formatCurrency(v) },
    { label: 'Taxa de Resposta', icon: MessageSquare, value: data?.taxaResposta ?? 0, target: 80, direction: 'higher', format: v => `${v}%` },
    { label: 'Taxa de Agendamento', icon: Calendar, value: data?.taxaAgendamento ?? 0, target: 40, direction: 'higher', format: v => `${v}%` },
    { label: 'Taxa de Comparecimento', icon: UserCheck, value: data?.taxaComparecimento ?? 0, target: 60, direction: 'higher', format: v => `${v}%` },
    { label: 'Taxa de Fechamento', icon: TrendingUp, value: data?.taxaFechamento ?? 0, target: 45, direction: 'higher', format: v => `${v}%` },
    { label: 'Ticket Médio', icon: Wallet, value: data?.ticketMedio ?? 0, target: 6000, direction: 'higher', format: v => formatCurrency(v) },
    { label: 'CAC', icon: Target, value: data?.cac ?? 0, target: 800, direction: 'lower', format: v => formatCurrency(v) },
    { label: 'ROAS', icon: BarChart3, value: data?.roas ?? 0, target: 8, direction: 'higher', format: v => `${v.toFixed(2)}x` },
    { label: 'Tempo Médio Conversão', icon: Clock, value: data?.tempoMedioConversao ?? 0, target: 30, direction: 'lower', format: v => `${v} dias` },
    { label: 'Taxa de Recuperação', icon: RotateCcw, value: data?.taxaRecuperacao ?? 0, target: 30, direction: 'higher', format: v => `${v}%` },
    { label: 'LTV', icon: Heart, value: data?.ltv ?? 0, target: 15000, direction: 'higher', format: v => formatCurrency(v) },
  ];

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Principais Métricas do Negócio
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cada métrica é comparada com sua meta saudável (benchmark) — verde, amarelo ou vermelho.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {metrics.map(m => {
            const status = getStatus(m.value, m.target, m.direction);
            const styles = statusStyles[status];
            const diffPct = m.target > 0 ? Math.round(((m.value - m.target) / m.target) * 100) : 0;
            const aboveTarget = m.direction === 'higher' ? diffPct >= 0 : diffPct <= 0;
            const progress = m.direction === 'higher'
              ? Math.min(100, m.target > 0 ? (m.value / m.target) * 100 : 0)
              : Math.min(100, m.value > 0 ? (m.target / m.value) * 100 : 100);

            return (
              <div key={m.label} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
                  <m.icon className={cn('h-4 w-4', styles.text)} />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn('text-xl font-bold', styles.text)}>{m.format(m.value)}</p>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', styles.chip)}>
                        {styles.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full transition-all', styles.bar)} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Meta: {m.format(m.target)}</span>
                      <span className={cn('inline-flex items-center gap-0.5 font-semibold', aboveTarget ? 'text-success' : 'text-destructive')}>
                        {diffPct === 0 ? <Minus className="h-2.5 w-2.5" /> : diffPct > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {diffPct > 0 ? '+' : ''}{diffPct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
