import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClinicGoals, HEALTHY_RATES } from '@/hooks/useClinicGoals';
import { EditableRate } from '@/components/clinic-goals/EditableRate';
import { FunnelStageCard } from '@/components/clinic-goals/FunnelStageCard';
import { ExecutiveGoalsBoard } from '@/components/clinic-goals/ExecutiveGoalsBoard';
import { MainGoalCard } from '@/components/clinic-goals/MainGoalCard';
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
  const { data, isLoading, updateGoal, updateRate, isAdmin } = useClinicGoals();
  const [editingGoal, setEditingGoal] = useState<{ key: string; value: number; rate?: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const healthyRates = data?.healthyRates || {
    leads: { target: HEALTHY_RATES.leads.target, rate: 100 },
    agendamentos: { target: HEALTHY_RATES.agendamentos.target, rate: HEALTHY_RATES.agendamentos.rate },
    comparecimentos: { target: HEALTHY_RATES.comparecimentos.target, rate: HEALTHY_RATES.comparecimentos.rate },
    fechamentos: { target: HEALTHY_RATES.fechamentos.target, rate: HEALTHY_RATES.fechamentos.rate },
    ticketMedio: { target: HEALTHY_RATES.ticketMedio.target },
    faturamento: { target: HEALTHY_RATES.faturamento.target },
    investimento: { target: HEALTHY_RATES.investimento.target },
    roi: { target: HEALTHY_RATES.roi.target },
  };

  const handleSaveGoal = async () => {
    if (!editingGoal) return;
    
    try {
      await updateGoal.mutateAsync({ 
        key: editingGoal.key, 
        value: editingGoal.value,
        rate: editingGoal.rate 
      });
      toast.success('Meta atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingGoal(null);
    } catch (error) {
      toast.error('Erro ao atualizar meta');
    }
  };

  const handleSaveHealthyRate = async (key: string, value: number, rate?: number) => {
    try {
      await updateGoal.mutateAsync({ key, value, rate });
      toast.success('Meta atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleSaveFunnelRate = async (key: string, rate: number) => {
    try {
      await updateRate.mutateAsync({ key, rate });
      toast.success('Taxa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar taxa');
    }
  };

  const formatValue = (key: string, value: number) => {
    if (['ticket_medio', 'faturamento', 'investimento'].includes(key)) {
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
    if (key === 'roi') return `${value}x`;
    return value.toString();
  };

  const healthyRatesConfig = [
    { key: 'leads', label: 'Leads', value: healthyRates.leads.target, rate: healthyRates.leads.rate, color: mondayColors.blue },
    { key: 'agendamentos', label: 'Agendamentos', value: healthyRates.agendamentos.target, rate: healthyRates.agendamentos.rate, color: mondayColors.purple },
    { key: 'comparecimentos', label: 'Comparecimentos', value: healthyRates.comparecimentos.target, rate: healthyRates.comparecimentos.rate, color: mondayColors.green },
    { key: 'fechamentos', label: 'Fechamentos', value: healthyRates.fechamentos.target, rate: healthyRates.fechamentos.rate, color: mondayColors.teal },
    { key: 'ticket_medio', label: 'Ticket Médio', value: healthyRates.ticketMedio.target, rate: null, color: mondayColors.orange, isCurrency: true },
    { key: 'faturamento', label: 'Faturamento', value: healthyRates.faturamento.target, rate: null, color: mondayColors.pink, isCurrency: true },
    { key: 'investimento', label: 'Investimento', value: healthyRates.investimento.target, rate: null, color: mondayColors.yellow, isCurrency: true },
    { key: 'roi', label: 'ROI', value: healthyRates.roi.target, rate: null, color: mondayColors.blue, isMultiplier: true },
  ];

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
        {/* Premium Main Goal */}
        <MainGoalCard />


        {/* Healthy Rates Reference - Monday Style */}
        <Card className="monday-card overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: mondayColors.blue }} />
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
              Taxas Saudáveis de Referência {isAdmin && <span className="text-xs font-normal">(clique para editar)</span>}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              {healthyRatesConfig.map((item) => (
                <EditableRate
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  rate={item.rate}
                  color={item.color}
                  isAdmin={isAdmin}
                  onSave={(value, rate) => handleSaveHealthyRate(item.key, value, rate)}
                  isPending={updateGoal.isPending}
                  showRate={item.rate !== null}
                  isCurrency={item.isCurrency}
                  isMultiplier={item.isMultiplier}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Flow - Monday Pipeline Style */}
        <Card className="monday-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Fluxo de Conversão</CardTitle>
            <CardDescription>
              Visualização do pipeline de leads até fechamento
              {isAdmin && <span className="text-xs ml-2">(clique nas etapas para editar taxas)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4 gap-2">
              {(data?.funnelData || []).map((stage, index, arr) => (
                <div key={stage.stage} className="flex items-center flex-1 min-w-[140px]">
                  <div className="flex-1">
                    <FunnelStageCard
                      stage={stage.stage}
                      value={stage.value}
                      rate={stage.targetRate}
                      color={stage.color}
                      isAdmin={isAdmin}
                      onSaveRate={(rate) => handleSaveFunnelRate(stage.key, rate)}
                      isPending={updateRate.isPending}
                    />
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quadro Executivo - Protocolo vs Unitário */}
        <ExecutiveGoalsBoard />

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
                                onClick={() => setEditingGoal({ 
                                  key: goal.key, 
                                  value: goal.target,
                                  rate: goal.rate 
                                })}
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
                                  <Label>Valor da Meta {['ticket_medio', 'faturamento', 'investimento'].includes(goal.key) ? '(R$)' : goal.key === 'roi' ? '(multiplicador)' : ''}</Label>
                                  <Input
                                    type="number"
                                    value={editingGoal?.value || 0}
                                    onChange={(e) => setEditingGoal(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                                    min={0}
                                    step={goal.key === 'roi' ? 0.1 : 1}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {['ticket_medio', 'faturamento', 'investimento'].includes(goal.key) 
                                      ? 'Digite o valor em reais (sem formatação)'
                                      : goal.key === 'roi'
                                      ? 'Digite o multiplicador de ROI esperado'
                                      : 'Digite a quantidade mensal desejada'}
                                  </p>
                                </div>
                                
                                {['agendamentos', 'comparecimentos', 'fechamentos'].includes(goal.key) && (
                                  <div className="space-y-2">
                                    <Label>Taxa de Conversão Esperada (%)</Label>
                                    <Input
                                      type="number"
                                      value={editingGoal?.rate || 0}
                                      onChange={(e) => setEditingGoal(prev => prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null)}
                                      min={0}
                                      max={100}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Defina a taxa de conversão ideal para esta etapa
                                    </p>
                                  </div>
                                )}
                                
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
