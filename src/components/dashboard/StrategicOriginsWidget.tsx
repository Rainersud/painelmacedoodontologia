import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategicOrigins, STRATEGIC_ORIGINS } from '@/hooks/useStrategicOrigins';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StrategicOriginsWidget() {
  const { data, isLoading } = useStrategicOrigins();

  const rows = (data || []).filter(r => (STRATEGIC_ORIGINS as readonly string[]).includes(r.key));

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Origens Estratégicas — Recebidos vs Agendados
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparativo direto entre quantos leads chegaram por cada origem estratégica e quantos foram efetivamente agendados.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {rows.map(r => {
              const taxaColor =
                r.taxaAgendamento >= 45 ? 'text-primary' :
                r.taxaAgendamento >= 30 ? 'text-success' :
                'text-destructive';
              const barColor =
                r.taxaAgendamento >= 45 ? 'bg-primary' :
                r.taxaAgendamento >= 30 ? 'bg-success' :
                'bg-destructive';
              return (
                <div key={r.key} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-card border', taxaColor)}>
                      {r.taxaAgendamento}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-card border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebidos</p>
                      <p className="text-2xl font-bold text-foreground">{r.recebidos}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card border flex flex-col items-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Agendados
                      </p>
                      <p className="text-2xl font-bold text-primary">{r.agendados}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', barColor)}
                      style={{ width: `${Math.min(100, r.taxaAgendamento)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{r.compareceram} compareceram</span>
                    <span className="inline-flex items-center gap-1">{r.vendas} vendas <ArrowRight className="h-2.5 w-2.5" /></span>
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
