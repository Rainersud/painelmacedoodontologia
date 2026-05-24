import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategicOrigins, STRATEGIC_ORIGINS } from '@/hooks/useStrategicOrigins';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Calendar, Users, CheckCircle2, DollarSign, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';

const DAILY_GOALS: Record<string, number> = {
  indicacao_pac: 10,
  prospeccao_ativa: 6,
  indicacao_parceria: 5,
  social_selling: 5,
};

export function StrategicOriginsWidget() {
  const { data, isLoading } = useStrategicOrigins();
  const { range, period } = usePeriodFilter();

  const rows = (data || []).filter(r => (STRATEGIC_ORIGINS as readonly string[]).includes(r.key));
  const periodLabel = period === 'hoje' ? '/dia' : period === 'semana' ? '/semana' : '/mês';

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Origens Estratégicas — Recebidos · Agendados · Compareceu · Faturamento
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Acompanhamento individual das origens de indicação integrado ao Comercial 1. Metas considerando dias úteis ({range.businessDays}du).
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map(r => {
              const dailyGoal = DAILY_GOALS[r.key] || 0;
              const periodGoal = dailyGoal * range.businessDays;
              const goalProgress = periodGoal > 0 ? Math.min(100, Math.round((r.recebidos / periodGoal) * 100)) : 0;
              const goalColor = goalProgress >= 100 ? 'text-success' : goalProgress >= 60 ? 'text-primary' : 'text-destructive';
              const barColor = goalProgress >= 100 ? 'bg-success' : goalProgress >= 60 ? 'bg-primary' : 'bg-destructive';

              return (
                <div key={r.key} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full bg-card border inline-flex items-center gap-1', goalColor)}>
                      <Target className="h-3 w-3" />
                      Meta: {periodGoal} ({dailyGoal}/dia)
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-card border">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                        <Users className="h-2.5 w-2.5" /> Recebidos
                      </p>
                      <p className="text-xl font-bold text-foreground">{r.recebidos}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card border">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                        <Calendar className="h-2.5 w-2.5" /> Agendados
                      </p>
                      <p className="text-xl font-bold text-primary">{r.agendados}</p>
                      <p className="text-[9px] text-muted-foreground">{r.taxaAgendamento}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card border">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Compareceu
                      </p>
                      <p className="text-xl font-bold text-success">{r.compareceram}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card border">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                        <DollarSign className="h-2.5 w-2.5" /> Faturamento
                      </p>
                      <p className="text-sm font-bold text-chart-5 leading-tight">{formatCurrency(r.faturamento)}</p>
                      <p className="text-[9px] text-muted-foreground">{r.vendas} venda{r.vendas !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Progresso da meta{periodLabel}</span>
                      <span className={cn('font-bold', goalColor)}>{r.recebidos}/{periodGoal} ({goalProgress}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full transition-all', barColor)} style={{ width: `${goalProgress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
