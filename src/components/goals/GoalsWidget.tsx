import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, Users, DollarSign, UserCheck } from 'lucide-react';
import { useGoalsProgress, GoalProgress } from '@/hooks/useGoalsProgress';
import { cn } from '@/lib/utils';

const goalTypeConfig = {
  leads_atendidos: { label: 'Leads Atendidos', icon: Users, format: (v: number) => v.toString() },
  consultas_agendadas: { label: 'Consultas Agendadas', icon: Calendar, format: (v: number) => v.toString() },
  taxa_conversao: { label: 'Taxa de Conversão', icon: TrendingUp, format: (v: number) => `${v}%` },
  taxa_comparecimento: { label: 'Comparecimento', icon: UserCheck, format: (v: number) => `${v}%` },
  receita: { label: 'Receita', icon: DollarSign, format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
};

const periodLabels = {
  diario: 'Hoje',
  semanal: 'Esta Semana',
  mensal: 'Este Mês',
};

const statusColors = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
};

const statusBgColors = {
  green: 'bg-success/10 border-success/20',
  yellow: 'bg-warning/10 border-warning/20',
  red: 'bg-destructive/10 border-destructive/20',
};

function GoalProgressCard({ goal }: { goal: GoalProgress }) {
  const config = goalTypeConfig[goal.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-200",
      statusBgColors[goal.status]
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            goal.status === 'green' ? 'bg-success/20' :
            goal.status === 'yellow' ? 'bg-warning/20' : 'bg-destructive/20'
          )}>
            <Icon className={cn(
              "h-4 w-4",
              goal.status === 'green' ? 'text-success' :
              goal.status === 'yellow' ? 'text-warning' : 'text-destructive'
            )} />
          </div>
          <div>
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{periodLabels[goal.period]}</p>
          </div>
        </div>
        <div className={cn(
          "h-3 w-3 rounded-full animate-pulse",
          statusColors[goal.status]
        )} />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{config.format(goal.current)}</span>
          <span className="text-sm text-muted-foreground">
            / {config.format(goal.target)}
          </span>
        </div>
        
        <Progress 
          value={goal.percentage} 
          className={cn(
            "h-2",
            goal.status === 'green' ? '[&>div]:bg-success' :
            goal.status === 'yellow' ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
          )}
        />
        
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-semibold",
            goal.status === 'green' ? 'text-success' :
            goal.status === 'yellow' ? 'text-warning' : 'text-destructive'
          )}>
            {goal.percentage}% concluído
          </span>
          <span className="text-muted-foreground">
            Faltam: {config.format(goal.remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function GoalsWidget() {
  const { data: goals, isLoading } = useGoalsProgress();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma meta configurada</p>
            <p className="text-xs mt-1">Configure metas na página de Metas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by period
  const groupedGoals = {
    diario: goals.filter(g => g.period === 'diario'),
    semanal: goals.filter(g => g.period === 'semanal'),
    mensal: goals.filter(g => g.period === 'mensal'),
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedGoals).map(([period, periodGoals]) => {
          if (periodGoals.length === 0) return null;
          return (
            <div key={period} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {periodLabels[period as keyof typeof periodLabels]}
              </h4>
              <div className="grid gap-3">
                {periodGoals.map((goal, idx) => (
                  <GoalProgressCard key={`${goal.type}-${goal.period}-${idx}`} goal={goal} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
