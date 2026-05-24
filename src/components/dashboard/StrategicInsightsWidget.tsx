import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStrategicInsights } from '@/hooks/useStrategicInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { Trophy, Clock, CalendarDays, Lightbulb, TrendingUp, Crown, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StrategicInsightsWidget() {
  const { data, isLoading } = useStrategicInsights();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Seller Ranking */}
      <Card className="monday-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Ranking de Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : !data?.sellerRanking.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem vendas no período</p>
          ) : (
            <div className="space-y-2">
              {data.sellerRanking.map((s, idx) => (
                <div key={s.agentId} className={cn('flex items-center gap-3 p-3 rounded-lg border', idx === 0 && 'bg-warning/10 border-warning/30')}>
                  <div className={cn('h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm', idx === 0 ? 'bg-warning text-warning-foreground' : idx === 1 ? 'bg-muted-foreground/20' : idx === 2 ? 'bg-muted/40' : 'bg-muted/20')}>
                    {idx === 0 ? <Crown className="h-4 w-4" /> : idx === 1 ? <Medal className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.vendas} venda{s.vendas !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-success">{formatCurrency(s.receita)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best hours / days */}
      <Card className="monday-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horários e Dias com Maior Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Skeleton className="h-[180px] w-full" /> : (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">⏰ Top horários</p>
                <div className="flex flex-wrap gap-2">
                  {(data?.bestHours || []).map(h => (
                    <Badge key={h.hour} variant="outline" className="text-xs bg-primary/10 border-primary/30">
                      {String(h.hour).padStart(2, '0')}h · {h.sales} venda{h.sales !== 1 ? 's' : ''}
                    </Badge>
                  ))}
                  {(!data?.bestHours.length) && <span className="text-xs text-muted-foreground">Sem dados</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Dias top</p>
                <div className="space-y-1.5">
                  {(data?.bestDays || []).slice(0, 4).map((d, i) => {
                    const max = data?.bestDays[0].sales || 1;
                    return (
                      <div key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="w-20 font-medium">{d.day}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(d.sales / max) * 100}%` }} />
                        </div>
                        <span className="font-semibold w-10 text-right">{d.sales}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Previsão de faturamento do mês</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(data?.forecast || 0)}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="monday-card lg:col-span-2 bg-gradient-to-br from-primary/5 to-chart-5/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Insights Comerciais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[80px] w-full" /> : !data?.insights.length ? (
            <p className="text-sm text-muted-foreground">Continue acompanhando — assim que houver tendência clara, mostraremos aqui.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {data.insights.map((i, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed">{i}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
