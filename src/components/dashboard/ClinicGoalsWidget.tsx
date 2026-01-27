import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, Calendar, UserCheck, DollarSign, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Metas mensais base (conforme especificado)
const MONTHLY_GOALS = {
  leads: { qty: 628, conversion: 100 },
  agendamentos: { qty: 157, conversion: 25 },
  comparecimentos: { qty: 47, conversion: 30 },
  fechamentos: { qty: 14, conversion: 30 },
  faturamento: 168000,
  cpl: 25,
};

// Divisão por período (considerando 22 dias úteis, 4 semanas)
const PERIOD_DIVISORS = {
  diario: 22,
  semanal: 4,
  mensal: 1,
};

interface GoalRowProps {
  icon: React.ElementType;
  label: string;
  targetQty: number;
  conversion: number;
  color: string;
  current: number;
}

function GoalRow({ icon: Icon, label, targetQty, conversion, color, current }: GoalRowProps) {
  const remaining = Math.max(0, targetQty - current);
  const percentage = targetQty > 0 ? Math.min(Math.round((current / targetQty) * 100), 100) : 0;
  const isAchieved = current >= targetQty;
  const isClose = percentage >= 70 && !isAchieved;

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all",
      isAchieved 
        ? "bg-success/10 border-success/30" 
        : isClose 
          ? "bg-warning/10 border-warning/30"
          : "bg-card border-border"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: isAchieved ? 'hsl(var(--success))' : `${color}` }}
        >
          {isAchieved ? (
            <CheckCircle className="h-5 w-5 text-white" />
          ) : (
            <Icon className="h-5 w-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold truncate">{label}</span>
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 shrink-0"
              style={{ 
                borderColor: color, 
                color,
                backgroundColor: `${color}15`
              }}
            >
              {conversion}%
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-3">
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isAchieved 
              ? '[&>div]:bg-success' 
              : isClose 
                ? '[&>div]:bg-warning'
                : '[&>div]:bg-primary'
          )}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</p>
          <p className="text-lg font-bold" style={{ color }}>{Math.round(targetQty)}</p>
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          isAchieved ? "bg-success/20" : "bg-primary/10"
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Realizado</p>
          <p className={cn(
            "text-lg font-bold",
            isAchieved ? "text-success" : "text-primary"
          )}>{current}</p>
        </div>
        <div className={cn(
          "p-2 rounded-lg",
          isAchieved ? "bg-success/20" : remaining > 0 ? "bg-destructive/10" : "bg-muted/50"
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faltam</p>
          <p className={cn(
            "text-lg font-bold",
            isAchieved ? "text-success" : remaining > 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {isAchieved ? '✓' : Math.round(remaining)}
          </p>
        </div>
      </div>

      {/* Percentage indicator */}
      <div className="mt-2 flex items-center justify-center">
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          isAchieved 
            ? "bg-success/20 text-success" 
            : isClose 
              ? "bg-warning/20 text-warning"
              : "bg-muted text-muted-foreground"
        )}>
          {percentage}% concluído
        </span>
      </div>
    </div>
  );
}

interface FaturamentoRowProps {
  target: number;
  current: number;
  color: string;
  periodLabel: string;
}

function FaturamentoRow({ target, current, color, periodLabel }: FaturamentoRowProps) {
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isAchieved = current >= target;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      isAchieved ? "bg-success/10 border-success/30" : "bg-card border-border"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: isAchieved ? 'hsl(var(--success))' : color }}
        >
          {isAchieved ? (
            <CheckCircle className="h-5 w-5 text-white" />
          ) : (
            <DollarSign className="h-5 w-5 text-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">Faturamento {periodLabel}</p>
          <p className="text-xs text-muted-foreground">CPL Médio: R$ {MONTHLY_GOALS.cpl}</p>
        </div>
      </div>

      <Progress 
        value={percentage} 
        className={cn("h-2 mb-3", isAchieved ? '[&>div]:bg-success' : '')}
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-[10px] text-muted-foreground uppercase">Meta</p>
          <p className="text-sm font-bold" style={{ color }}>
            R$ {Math.round(target).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className={cn("p-2 rounded-lg", isAchieved ? "bg-success/20" : "bg-primary/10")}>
          <p className="text-[10px] text-muted-foreground uppercase">Realizado</p>
          <p className={cn("text-sm font-bold", isAchieved ? "text-success" : "text-primary")}>
            R$ {current.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className={cn("p-2 rounded-lg", isAchieved ? "bg-success/20" : "bg-destructive/10")}>
          <p className="text-[10px] text-muted-foreground uppercase">Faltam</p>
          <p className={cn("text-sm font-bold", isAchieved ? "text-success" : "text-destructive")}>
            {isAchieved ? '✓' : `R$ ${Math.round(remaining).toLocaleString('pt-BR')}`}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          isAchieved ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
        )}>
          {percentage}% do faturamento
        </span>
      </div>
    </div>
  );
}

interface ClinicGoalsWidgetProps {
  currentLeads?: number;
  currentAgendamentos?: number;
  currentComparecimentos?: number;
  currentFechamentos?: number;
  currentFaturamento?: number;
  period?: 'diario' | 'semanal' | 'mensal';
}

export function ClinicGoalsWidget({
  currentLeads = 0,
  currentAgendamentos = 0,
  currentComparecimentos = 0,
  currentFechamentos = 0,
  currentFaturamento = 0,
  period: externalPeriod,
}: ClinicGoalsWidgetProps) {
  const getGoalsForPeriod = (period: 'diario' | 'semanal' | 'mensal') => {
    const divisor = PERIOD_DIVISORS[period];
    return {
      leads: { qty: MONTHLY_GOALS.leads.qty / divisor, conversion: MONTHLY_GOALS.leads.conversion },
      agendamentos: { qty: MONTHLY_GOALS.agendamentos.qty / divisor, conversion: MONTHLY_GOALS.agendamentos.conversion },
      comparecimentos: { qty: MONTHLY_GOALS.comparecimentos.qty / divisor, conversion: MONTHLY_GOALS.comparecimentos.conversion },
      fechamentos: { qty: MONTHLY_GOALS.fechamentos.qty / divisor, conversion: MONTHLY_GOALS.fechamentos.conversion },
      faturamento: MONTHLY_GOALS.faturamento / divisor,
    };
  };

  const colors = {
    leads: 'hsl(213 94% 58%)',
    agendamentos: 'hsl(270 75% 60%)',
    comparecimentos: 'hsl(156 72% 45%)',
    fechamentos: 'hsl(32 95% 55%)',
    faturamento: 'hsl(180 70% 50%)',
  };

  const periodLabels = {
    diario: 'Diário',
    semanal: 'Semanal',
    mensal: 'Mensal',
  };

  const renderGoalsContent = (period: 'diario' | 'semanal' | 'mensal') => {
    const goals = getGoalsForPeriod(period);

    // Ajustar current values baseado no período (proporcionalmente)
    // Para simulação, usamos os valores passados divididos pelo mesmo divisor
    const periodDivisor = PERIOD_DIVISORS[period];
    const adjustedCurrentLeads = period === 'mensal' ? currentLeads : Math.round(currentLeads / periodDivisor);
    const adjustedCurrentAgendamentos = period === 'mensal' ? currentAgendamentos : Math.round(currentAgendamentos / periodDivisor);
    const adjustedCurrentComparecimentos = period === 'mensal' ? currentComparecimentos : Math.round(currentComparecimentos / periodDivisor);
    const adjustedCurrentFechamentos = period === 'mensal' ? currentFechamentos : Math.round(currentFechamentos / periodDivisor);
    const adjustedCurrentFaturamento = period === 'mensal' ? currentFaturamento : Math.round(currentFaturamento / periodDivisor);

    return (
      <div className="space-y-3">
        {/* Header com resumo */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">
            Período: {periodLabels[period]}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {period === 'diario' ? '1 dia útil' : period === 'semanal' ? '5 dias úteis' : '22 dias úteis'}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <GoalRow 
            icon={Users} 
            label="Leads Gerados" 
            targetQty={goals.leads.qty} 
            conversion={goals.leads.conversion}
            color={colors.leads}
            current={adjustedCurrentLeads}
          />
          <GoalRow 
            icon={Calendar} 
            label="Agendamentos" 
            targetQty={goals.agendamentos.qty} 
            conversion={goals.agendamentos.conversion}
            color={colors.agendamentos}
            current={adjustedCurrentAgendamentos}
          />
          <GoalRow 
            icon={UserCheck} 
            label="Comparecimentos" 
            targetQty={goals.comparecimentos.qty} 
            conversion={goals.comparecimentos.conversion}
            color={colors.comparecimentos}
            current={adjustedCurrentComparecimentos}
          />
          <GoalRow 
            icon={TrendingUp} 
            label="Fechamentos" 
            targetQty={goals.fechamentos.qty} 
            conversion={goals.fechamentos.conversion}
            color={colors.fechamentos}
            current={adjustedCurrentFechamentos}
          />
        </div>
        
        {/* Faturamento */}
        <FaturamentoRow 
          target={goals.faturamento}
          current={adjustedCurrentFaturamento}
          color={colors.faturamento}
          periodLabel={periodLabels[period]}
        />
      </div>
    );
  };

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas da Clínica
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Acompanhamento em Tempo Real
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={externalPeriod || "mensal"} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="diario" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📅 Diário
            </TabsTrigger>
            <TabsTrigger value="semanal" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📆 Semanal
            </TabsTrigger>
            <TabsTrigger value="mensal" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🗓️ Mensal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="diario" className="mt-0">
            {renderGoalsContent('diario')}
          </TabsContent>
          
          <TabsContent value="semanal" className="mt-0">
            {renderGoalsContent('semanal')}
          </TabsContent>
          
          <TabsContent value="mensal" className="mt-0">
            {renderGoalsContent('mensal')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
