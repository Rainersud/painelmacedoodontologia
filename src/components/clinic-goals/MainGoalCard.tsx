import { Card, CardContent } from '@/components/ui/card';
import { useClinicGoals } from '@/hooks/useClinicGoals';
import { formatCurrency } from '@/lib/currency';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium "objetivo do mês" card.
 * Reads target faturamento, ticket médio and dias úteis from meta_settings (via useClinicGoals).
 */
export function MainGoalCard() {
  const { data } = useClinicGoals();
  const faturamento = data?.healthyRates.faturamento.target ?? 120000;
  const ticket = data?.healthyRates.ticketMedio.target ?? 6000;
  const fechamentos = data?.healthyRates.fechamentos.target ?? 20;
  const investimento = data?.healthyRates.investimento.target ?? 6000;

  const fatGoal = data?.goals.find(g => g.key === 'faturamento');
  const currentFat = fatGoal?.current ?? 0;
  const percentage = faturamento > 0 ? Math.min(100, Math.round((currentFat / faturamento) * 100)) : 0;
  const remaining = Math.max(0, faturamento - currentFat);

  return (
    <Card className="monday-card overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-chart-5/5">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary via-chart-5 to-primary" />
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center text-primary-foreground shadow-lg">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objetivo do Mês</p>
            <h2 className="text-xl sm:text-2xl font-bold">
              Faturar <span className="text-primary">{formatCurrency(faturamento)}</span> em <span className="text-chart-5">20 dias úteis</span> com ticket de <span className="text-primary">{formatCurrency(ticket)}</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat icon={DollarSign} label="Faturamento Alvo" value={formatCurrency(faturamento)} accent="text-primary" />
          <Stat icon={TrendingUp} label="Ticket Médio" value={formatCurrency(ticket)} accent="text-chart-5" />
          <Stat icon={Calendar} label="Vendas Necessárias" value={`${fechamentos}`} accent="text-success" />
          <Stat icon={Target} label="Investimento" value={formatCurrency(investimento)} accent="text-warning" />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Progresso atual</span>
            <span className="text-lg font-bold">{formatCurrency(currentFat)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(faturamento)}</span></span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700 bg-gradient-to-r from-primary to-chart-5')}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">{percentage}% concluído</span>
            <span className="text-muted-foreground">Falta {formatCurrency(remaining)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', accent)} />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      </div>
      <p className={cn('text-base font-bold', accent)}>{value}</p>
    </div>
  );
}
