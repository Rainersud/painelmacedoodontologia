import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Target, Stethoscope, Pill, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreatmentGoal {
  label: string;
  target: number;
  current: number;
}

interface PeriodGoals {
  protocolo: {
    leads: TreatmentGoal;
    comparecimentos: TreatmentGoal;
    fechamentos: TreatmentGoal;
  };
  unitario: {
    leads: TreatmentGoal;
    comparecimentos: TreatmentGoal;
    fechamentos: TreatmentGoal;
  };
}

// Metas por período baseadas no funil fornecido
const GOALS_BY_PERIOD: Record<'diario' | 'semanal' | 'mensal', PeriodGoals> = {
  diario: {
    protocolo: {
      leads: { label: 'Leads', target: 6, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 2, current: 0 },
      fechamentos: { label: 'Vendas', target: 0.35, current: 0 }, // 1 a cada 3 dias
    },
    unitario: {
      leads: { label: 'Leads', target: 9, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 3, current: 0 },
      fechamentos: { label: 'Vendas', target: 1, current: 0 },
    },
  },
  semanal: {
    protocolo: {
      leads: { label: 'Leads', target: 30, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 9, current: 0 },
      fechamentos: { label: 'Vendas', target: 2, current: 0 },
    },
    unitario: {
      leads: { label: 'Leads', target: 45, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 14, current: 0 },
      fechamentos: { label: 'Vendas', target: 4, current: 0 },
    },
  },
  mensal: {
    protocolo: {
      leads: { label: 'Leads', target: 120, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 36, current: 0 },
      fechamentos: { label: 'Vendas', target: 7, current: 0 },
    },
    unitario: {
      leads: { label: 'Leads', target: 180, current: 0 },
      comparecimentos: { label: 'Avaliações', target: 54, current: 0 },
      fechamentos: { label: 'Vendas', target: 16, current: 0 },
    },
  },
};

const periodLabels = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

interface TreatmentCardProps {
  type: 'protocolo' | 'unitario';
  goals: PeriodGoals['protocolo'];
  period: 'diario' | 'semanal' | 'mensal';
}

function TreatmentCard({ type, goals, period }: TreatmentCardProps) {
  const isProtocolo = type === 'protocolo';
  const Icon = isProtocolo ? Stethoscope : Pill;
  
  const colorClasses = isProtocolo 
    ? {
        bg: 'bg-gradient-to-br from-violet-500/10 to-purple-500/10',
        border: 'border-violet-500/30',
        accent: 'text-violet-600',
        progress: '[&>div]:bg-violet-500',
        iconBg: 'bg-violet-500/20',
        badge: 'bg-violet-500',
      }
    : {
        bg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/30',
        accent: 'text-emerald-600',
        progress: '[&>div]:bg-emerald-500',
        iconBg: 'bg-emerald-500/20',
        badge: 'bg-emerald-500',
      };

  const metrics = [
    { key: 'leads', icon: Users, ...goals.leads },
    { key: 'comparecimentos', icon: Calendar, ...goals.comparecimentos },
    { key: 'fechamentos', icon: DollarSign, ...goals.fechamentos },
  ];

  const totalTarget = goals.leads.target + goals.comparecimentos.target + goals.fechamentos.target;
  const totalCurrent = goals.leads.current + goals.comparecimentos.current + goals.fechamentos.current;
  const overallPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all hover:shadow-lg",
      colorClasses.bg,
      colorClasses.border
    )}>
      {/* Header Badge */}
      <div className={cn(
        "absolute top-0 right-0 px-4 py-1 text-xs font-bold text-white rounded-bl-xl",
        colorClasses.badge
      )}>
        {isProtocolo ? 'PROTOCOLO' : 'UNITÁRIO'}
      </div>

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", colorClasses.iconBg)}>
            <Icon className={cn("h-6 w-6", colorClasses.accent)} />
          </div>
          <div>
            <CardTitle className={cn("text-lg", colorClasses.accent)}>
              {isProtocolo ? 'Tratamento Protocolo' : 'Tratamento Unitário'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isProtocolo ? '40% do funil' : '60% do funil'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="grid gap-3">
          {metrics.map((metric) => {
            const percentage = metric.target > 0 
              ? Math.min(100, Math.round((metric.current / metric.target) * 100)) 
              : 0;
            const MetricIcon = metric.icon;

            return (
              <div key={metric.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MetricIcon className={cn("h-4 w-4", colorClasses.accent)} />
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{metric.current}</span>
                    <span className="text-muted-foreground">/ {metric.target}</span>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className={cn("h-2", colorClasses.progress)}
                />
              </div>
            );
          })}
        </div>

        {/* Resumo */}
        <div className={cn(
          "mt-4 p-3 rounded-lg border",
          colorClasses.bg,
          colorClasses.border
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-4 w-4", colorClasses.accent)} />
              <span className="text-sm font-medium">Progresso Geral</span>
            </div>
            <span className={cn("text-xl font-bold", colorClasses.accent)}>
              {overallPercentage}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TotalsCardProps {
  period: 'diario' | 'semanal' | 'mensal';
  goals: PeriodGoals;
}

function TotalsCard({ period, goals }: TotalsCardProps) {
  const totals = {
    leads: {
      target: goals.protocolo.leads.target + goals.unitario.leads.target,
      current: goals.protocolo.leads.current + goals.unitario.leads.current,
    },
    comparecimentos: {
      target: goals.protocolo.comparecimentos.target + goals.unitario.comparecimentos.target,
      current: goals.protocolo.comparecimentos.current + goals.unitario.comparecimentos.current,
    },
    fechamentos: {
      target: goals.protocolo.fechamentos.target + goals.unitario.fechamentos.target,
      current: goals.protocolo.fechamentos.current + goals.unitario.fechamentos.current,
    },
  };

  const metrics = [
    { label: 'Leads Totais', ...totals.leads, icon: Users },
    { label: 'Avaliações Totais', ...totals.comparecimentos, icon: Calendar },
    { label: 'Vendas Totais', ...totals.fechamentos, icon: DollarSign },
  ];

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Resumo {periodLabels[period]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const percentage = metric.target > 0 
              ? Math.min(100, Math.round((metric.current / metric.target) * 100)) 
              : 0;
            const MetricIcon = metric.icon;
            
            return (
              <div key={metric.label} className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MetricIcon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{metric.target}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-1.5 [&>div]:bg-primary"
                />
                <p className="text-xs font-medium">
                  {metric.current} realizados
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutiveGoalsBoard() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Quadro de Metas Executivo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Acompanhamento por tipo de tratamento
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="diario" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🟢 Diário
            </TabsTrigger>
            <TabsTrigger value="semanal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🟡 Semanal
            </TabsTrigger>
            <TabsTrigger value="mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🔵 Mensal
            </TabsTrigger>
          </TabsList>

          {(['diario', 'semanal', 'mensal'] as const).map((period) => (
            <TabsContent key={period} value={period} className="space-y-4">
              {/* Resumo Totais */}
              <TotalsCard period={period} goals={GOALS_BY_PERIOD[period]} />
              
              {/* Cards por Tipo de Tratamento */}
              <div className="grid md:grid-cols-2 gap-4">
                <TreatmentCard 
                  type="protocolo" 
                  goals={GOALS_BY_PERIOD[period].protocolo}
                  period={period}
                />
                <TreatmentCard 
                  type="unitario" 
                  goals={GOALS_BY_PERIOD[period].unitario}
                  period={period}
                />
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span className="text-xs text-muted-foreground">Protocolo (40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Unitário (60%)</span>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
