import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClinicGoals, HEALTHY_RATES } from '@/hooks/useClinicGoals';
import { 
  Target, 
  TrendingUp,
  Users,
  Calendar,
  UserCheck,
  DollarSign,
  Settings,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Monday.com style colors
const mondayColors = {
  blue: 'hsl(213 94% 58%)',
  green: 'hsl(156 72% 45%)',
  purple: 'hsl(270 75% 60%)',
  orange: 'hsl(32 95% 55%)',
  pink: 'hsl(340 82% 60%)',
  teal: 'hsl(180 70% 50%)',
  yellow: 'hsl(45 93% 58%)',
  red: 'hsl(0 84% 60%)',
};

const statusConfig = {
  healthy: { color: 'text-success', bg: 'bg-success', icon: CheckCircle2, label: 'Saudável' },
  warning: { color: 'text-warning', bg: 'bg-warning', icon: AlertCircle, label: 'Atenção' },
  critical: { color: 'text-destructive', bg: 'bg-destructive', icon: XCircle, label: 'Crítico' },
};

const goalConfig: Record<string, { icon: React.ElementType; color: string }> = {
  leads: { icon: Users, color: mondayColors.blue },
  agendamentos: { icon: Calendar, color: mondayColors.purple },
  comparecimentos: { icon: UserCheck, color: mondayColors.green },
  fechamentos: { icon: DollarSign, color: mondayColors.teal },
  ticket_medio: { icon: DollarSign, color: mondayColors.orange },
  faturamento: { icon: TrendingUp, color: mondayColors.pink },
  investimento: { icon: BarChart3, color: mondayColors.yellow },
  roi: { icon: Target, color: mondayColors.blue },
};

export default function MetasClinica() {
  const { data, isLoading, updateGoal, isAdmin } = useClinicGoals();
  const [editingGoal, setEditingGoal] = useState<{ key: string; value: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveGoal = async () => {
    if (!editingGoal) return;
    
    try {
      await updateGoal.mutateAsync({ key: editingGoal.key, value: editingGoal.value });
      toast.success('Meta atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingGoal(null);
    } catch (error) {
      toast.error('Erro ao atualizar meta');
    }
  };

  const formatValue = (key: string, value: number) => {
    if (['ticket_medio', 'faturamento', 'investimento'].includes(key)) {
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
    if (key === 'roi') return `${value}x`;
    return value.toString();
  };

  return (
    <AppLayout title="Metas da Clínica">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Metas da Clínica</h1>
            <p className="text-muted-foreground">Acompanhe as taxas saudáveis de conversão</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: mondayColors.purple }}>
              <Target className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Healthy Rates Reference - Monday Style */}
        <Card className="monday-card overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: mondayColors.blue }} />
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
              Taxas Saudáveis de Referência
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              {[
                { label: 'Leads', value: HEALTHY_RATES.leads.target, rate: HEALTHY_RATES.leads.rate, color: mondayColors.blue },
                { label: 'Agendamentos', value: HEALTHY_RATES.agendamentos.target, rate: HEALTHY_RATES.agendamentos.rate, color: mondayColors.purple },
                { label: 'Comparecimentos', value: HEALTHY_RATES.comparecimentos.target, rate: HEALTHY_RATES.comparecimentos.rate, color: mondayColors.green },
                { label: 'Fechamentos', value: HEALTHY_RATES.fechamentos.target, rate: HEALTHY_RATES.fechamentos.rate, color: mondayColors.teal },
                { label: 'Ticket Médio', value: 'R$ 6.5k', rate: null, color: mondayColors.orange },
                { label: 'Faturamento', value: 'R$ 130k', rate: null, color: mondayColors.pink },
                { label: 'Investimento', value: 'R$ 10k', rate: null, color: mondayColors.yellow },
                { label: 'ROI', value: `${HEALTHY_RATES.roi.target}x`, rate: null, color: mondayColors.blue },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div 
                    className="h-2 w-12 mx-auto rounded-full mb-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.rate !== null && (
                    <span 
                      className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.rate}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Flow - Monday Pipeline Style */}
        <Card className="monday-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Fluxo de Conversão</CardTitle>
            <CardDescription>Visualização do pipeline de leads até fechamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4 gap-2">
              {(data?.funnelData || []).map((stage, index, arr) => (
                <div key={stage.stage} className="flex items-center flex-1 min-w-[140px]">
                  <div className="flex-1">
                    <div 
                      className="rounded-xl p-4 text-center text-white transition-all hover:scale-105"
                      style={{ backgroundColor: stage.color }}
                    >
                      <p className="text-3xl font-bold">{stage.value}</p>
                      <p className="text-sm font-medium opacity-90">{stage.stage}</p>
                      <div className="mt-2 inline-block bg-white/20 rounded-full px-3 py-1">
                        <span className="text-sm font-semibold">{stage.rate}%</span>
                      </div>
                    </div>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid - Monday Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            (data?.goals || []).map((goal) => {
              const config = goalConfig[goal.key] || { icon: Target, color: mondayColors.blue };
              const Icon = config.icon;
              const status = statusConfig[goal.status];
              const StatusIcon = status.icon;

              return (
                <Card 
                  key={goal.key} 
                  className="monday-card overflow-hidden group"
                >
                  <div 
                    className="h-1.5 w-full transition-all"
                    style={{ backgroundColor: config.color }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: config.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{goal.label}</h3>
                          {goal.rate !== undefined && (
                            <p className="text-xs text-muted-foreground">Taxa: {goal.rate}%</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span 
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-white",
                            status.bg
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {isAdmin && goal.isEditable && (
                          <Dialog open={isDialogOpen && editingGoal?.key === goal.key} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingGoal(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setEditingGoal({ key: goal.key, value: goal.target })}
                                title="Editar meta"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Meta: {goal.label}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Valor da Meta {['ticket_medio', 'faturamento', 'investimento'].includes(goal.key) ? '(R$)' : ''}</Label>
                                  <Input
                                    type="number"
                                    value={editingGoal?.value || 0}
                                    onChange={(e) => setEditingGoal(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                                    min={0}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {['ticket_medio', 'faturamento', 'investimento'].includes(goal.key) 
                                      ? 'Digite o valor em reais (sem formatação)'
                                      : 'Digite a quantidade mensal desejada'}
                                  </p>
                                </div>
                                <Button 
                                  className="w-full" 
                                  onClick={handleSaveGoal}
                                  disabled={updateGoal.isPending}
                                >
                                  {updateGoal.isPending ? 'Salvando...' : 'Salvar Meta'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold">{formatValue(goal.key, goal.current)}</span>
                        <span className="text-sm text-muted-foreground">/ {formatValue(goal.key, goal.target)}</span>
                      </div>

                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(goal.percentage, 100)}%`,
                            backgroundColor: config.color 
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color: config.color }}>
                          {goal.percentage}% concluído
                        </span>
                        <span className="text-muted-foreground">
                          Falta: {formatValue(goal.key, goal.remaining)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}