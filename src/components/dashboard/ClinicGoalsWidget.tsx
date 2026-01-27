import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, Calendar, UserCheck, DollarSign, TrendingUp } from 'lucide-react';
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
  qty: number;
  conversion: number;
  color: string;
  current?: number;
}

function GoalRow({ icon: Icon, label, qty, conversion, color, current = 0 }: GoalRowProps) {
  const percentage = qty > 0 ? Math.min(Math.round((current / qty) * 100), 100) : 0;
  const isAchieved = current >= qty;

  return (
    <div className="flex items-center gap-3 py-2">
      <div 
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{Math.round(qty)}</span>
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0"
              style={{ 
                borderColor: color, 
                color,
                backgroundColor: `${color}10`
              }}
            >
              {conversion}%
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Progress 
            value={percentage} 
            className={cn(
              "h-1.5 flex-1",
              isAchieved ? '[&>div]:bg-success' : ''
            )}
            style={{ 
              '--progress-color': color,
            } as React.CSSProperties}
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right">
            {current}/{Math.round(qty)}
          </span>
        </div>
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

  const renderGoalsContent = (period: 'diario' | 'semanal' | 'mensal') => {
    const goals = getGoalsForPeriod(period);
    const periodLabel = {
      diario: 'Diária',
      semanal: 'Semanal',
      mensal: 'Mensal',
    }[period];

    return (
      <div className="space-y-1">
        <GoalRow 
          icon={Users} 
          label="Leads Gerados" 
          qty={goals.leads.qty} 
          conversion={goals.leads.conversion}
          color={colors.leads}
          current={currentLeads}
        />
        <GoalRow 
          icon={Calendar} 
          label="Agendamentos" 
          qty={goals.agendamentos.qty} 
          conversion={goals.agendamentos.conversion}
          color={colors.agendamentos}
          current={currentAgendamentos}
        />
        <GoalRow 
          icon={UserCheck} 
          label="Comparecimentos" 
          qty={goals.comparecimentos.qty} 
          conversion={goals.comparecimentos.conversion}
          color={colors.comparecimentos}
          current={currentComparecimentos}
        />
        <GoalRow 
          icon={TrendingUp} 
          label="Fechamentos" 
          qty={goals.fechamentos.qty} 
          conversion={goals.fechamentos.conversion}
          color={colors.fechamentos}
          current={currentFechamentos}
        />
        
        {/* Faturamento */}
        <div className="pt-2 mt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${colors.faturamento}20` }}
              >
                <DollarSign className="h-4 w-4" style={{ color: colors.faturamento }} />
              </div>
              <span className="text-sm font-medium">Faturamento {periodLabel}</span>
            </div>
            <span className="text-lg font-bold" style={{ color: colors.faturamento }}>
              R$ {Math.round(goals.faturamento).toLocaleString('pt-BR')}
            </span>
          </div>
          
          <div className="mt-2 p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">CPL Médio:</span>
              <span className="font-semibold text-success">R$ {MONTHLY_GOALS.cpl}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={externalPeriod || "mensal"} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="diario" className="text-xs">
              Diário
            </TabsTrigger>
            <TabsTrigger value="semanal" className="text-xs">
              Semanal
            </TabsTrigger>
            <TabsTrigger value="mensal" className="text-xs">
              Mensal
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
