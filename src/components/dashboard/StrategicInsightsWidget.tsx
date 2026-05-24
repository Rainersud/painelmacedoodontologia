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

      {/* Previsão de faturamento */}
      <Card className="monday-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Previsão de Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[120px] w-full" /> : (
            <div className="flex flex-col justify-center h-full py-4">
              <p className="text-xs text-muted-foreground">Projeção do mês com base no ritmo atual</p>
              <p className="text-3xl font-bold text-success mt-2">{formatCurrency(data?.forecast || 0)}</p>
            </div>
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
