import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyMetric {
  label: string;
  current: number;
  ideal: number;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

// Benchmarks ideais
const KEY_METRICS: KeyMetric[] = [
  {
    label: 'CPL (Custo por Lead)',
    current: 0,
    ideal: 30,
    format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    lowerIsBetter: true,
  },
  {
    label: 'Custo por Agendamento',
    current: 0,
    ideal: 100,
    format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    lowerIsBetter: true,
  },
  {
    label: 'Custo por Fechamento',
    current: 0,
    ideal: 430,
    format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    lowerIsBetter: true,
  },
  {
    label: 'Break-even',
    current: 0,
    ideal: 2,
    format: (v: number) => `${v} venda${v !== 1 ? 's' : ''}`,
    lowerIsBetter: true,
  },
];

interface KeyMetricsWidgetProps {
  cpl?: number;
  custoAgendamento?: number;
  custoFechamento?: number;
  breakEven?: number;
}

function getStatus(current: number, ideal: number, lowerIsBetter: boolean) {
  if (current === 0) return 'neutral';
  
  if (lowerIsBetter) {
    if (current <= ideal) return 'good';
    if (current <= ideal * 1.3) return 'warning';
    return 'bad';
  } else {
    if (current >= ideal) return 'good';
    if (current >= ideal * 0.7) return 'warning';
    return 'bad';
  }
}

const statusConfig = {
  good: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10 border-success/30',
    label: 'Ideal ✓',
    labelColor: 'bg-success/20 text-success',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10 border-warning/30',
    label: 'Atenção',
    labelColor: 'bg-warning/20 text-warning',
  },
  bad: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
    label: 'Melhorar',
    labelColor: 'bg-destructive/20 text-destructive',
  },
  neutral: {
    icon: TrendingUp,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50 border-muted',
    label: 'Sem dados',
    labelColor: 'bg-muted text-muted-foreground',
  },
};

export function KeyMetricsWidget({ 
  cpl = 25, 
  custoAgendamento = 0, 
  custoFechamento = 0,
  breakEven = 0,
}: KeyMetricsWidgetProps) {
  // Calcular métricas baseado nos dados reais
  // CPL = Investimento / Leads
  // Custo por Agendamento = Investimento / Agendamentos
  // Custo por Fechamento = Investimento / Fechamentos
  
  const metrics: KeyMetric[] = [
    { ...KEY_METRICS[0], current: cpl },
    { ...KEY_METRICS[1], current: custoAgendamento },
    { ...KEY_METRICS[2], current: custoFechamento },
    { ...KEY_METRICS[3], current: breakEven },
  ];

  return (
    <Card className="monday-card overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Métricas-Chave para Acompanhar
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const status = getStatus(metric.current, metric.ideal, metric.lowerIsBetter || false);
            const config = statusConfig[status];
            const Icon = config.icon;

            return (
              <div
                key={metric.label}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  config.bg
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground truncate pr-2">
                    {metric.label}
                  </p>
                  <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xl font-bold">
                    {metric.format(metric.current)}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Ideal: ≤ {metric.format(metric.ideal)}
                    </span>
                    <Badge className={cn("text-[10px] px-1.5 py-0", config.labelColor)}>
                      {config.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            💡 <span className="font-medium">Dica:</span> Mantenha o CPL abaixo de R$ 30 e busque break-even em 1-2 vendas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
