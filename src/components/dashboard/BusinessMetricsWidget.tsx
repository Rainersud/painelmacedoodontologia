import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { Users, DollarSign, MessageSquare, Calendar, UserCheck, TrendingUp, Wallet, Target, BarChart3, Clock, RotateCcw, Heart, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BusinessMetricsWidget() {
  const { data, isLoading } = useBusinessMetrics();

  const metrics = [
    { label: 'Leads Gerados', icon: Users, value: data?.leadsGerados ?? 0, format: (v: number) => v.toString(), color: 'text-chart-2' },
    { label: 'CPL', icon: DollarSign, value: data?.cpl ?? 0, format: (v: number) => formatCurrency(v), color: 'text-chart-1', hint: 'Meta ≤ R$ 30' },
    { label: 'Taxa de Resposta', icon: MessageSquare, value: data?.taxaResposta ?? 0, format: (v: number) => `${v}%`, color: 'text-chart-2' },
    { label: 'Taxa de Agendamento', icon: Calendar, value: data?.taxaAgendamento ?? 0, format: (v: number) => `${v}%`, color: 'text-chart-5' },
    { label: 'Taxa de Comparecimento', icon: UserCheck, value: data?.taxaComparecimento ?? 0, format: (v: number) => `${v}%`, color: 'text-success' },
    { label: 'Taxa de Fechamento', icon: TrendingUp, value: data?.taxaFechamento ?? 0, format: (v: number) => `${v}%`, color: 'text-warning' },
    { label: 'Ticket Médio', icon: Wallet, value: data?.ticketMedio ?? 0, format: (v: number) => formatCurrency(v), color: 'text-success' },
    { label: 'CAC', icon: Target, value: data?.cac ?? 0, format: (v: number) => formatCurrency(v), color: 'text-destructive' },
    { label: 'ROAS', icon: BarChart3, value: data?.roas ?? 0, format: (v: number) => `${v.toFixed(2)}x`, color: 'text-primary' },
    { label: 'Tempo Médio Conversão', icon: Clock, value: data?.tempoMedioConversao ?? 0, format: (v: number) => `${v} dias`, color: 'text-chart-1' },
    { label: 'Taxa de Recuperação', icon: RotateCcw, value: data?.taxaRecuperacao ?? 0, format: (v: number) => `${v}%`, color: 'text-chart-4' },
    { label: 'LTV', icon: Heart, value: data?.ltv ?? 0, format: (v: number) => formatCurrency(v), color: 'text-chart-5' },
  ];

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Principais Métricas do Negócio
        </CardTitle>
        <p className="text-xs text-muted-foreground">Indicadores integrados ao funil real e em tempo real</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
                <m.icon className={cn('h-4 w-4', m.color)} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-20" /> : <p className={cn('text-xl font-bold', m.color)}>{m.format(m.value)}</p>}
              {m.hint && <p className="text-[9px] text-muted-foreground mt-0.5">{m.hint}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
