import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
} from 'recharts';

const statusConfig = {
  healthy: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: CheckCircle2 },
  warning: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: AlertCircle },
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: XCircle },
};

const goalIcons: Record<string, React.ElementType> = {
  leads: Users,
  agendamentos: Calendar,
  comparecimentos: UserCheck,
  fechamentos: DollarSign,
  ticket_medio: DollarSign,
  faturamento: DollarSign,
  investimento: TrendingUp,
  roi: Target,
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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Metas Mensais da Clínica</h2>
              <p className="text-sm text-muted-foreground">
                Acompanhamento das taxas saudáveis de conversão
              </p>
            </div>
          </div>
        </div>

        {/* Healthy Rates Reference */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">TAXAS SAUDÁVEIS DE REFERÊNCIA</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{HEALTHY_RATES.leads.target}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
                <p className="text-xs font-semibold text-primary">{HEALTHY_RATES.leads.rate}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{HEALTHY_RATES.agendamentos.target}</p>
                <p className="text-xs text-muted-foreground">Agendamentos</p>
                <p className="text-xs font-semibold text-primary">{HEALTHY_RATES.agendamentos.rate}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{HEALTHY_RATES.comparecimentos.target}</p>
                <p className="text-xs text-muted-foreground">Comparecimentos</p>
                <p className="text-xs font-semibold text-primary">{HEALTHY_RATES.comparecimentos.rate}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{HEALTHY_RATES.fechamentos.target}</p>
                <p className="text-xs text-muted-foreground">Fechamentos</p>
                <p className="text-xs font-semibold text-primary">{HEALTHY_RATES.fechamentos.rate}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ 6.5k</p>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ 130k</p>
                <p className="text-xs text-muted-foreground">Faturamento</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ 10k</p>
                <p className="text-xs text-muted-foreground">Investimento</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{HEALTHY_RATES.roi.target}x</p>
                <p className="text-xs text-muted-foreground">ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funnel Visualization */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Funil de Conversão</CardTitle>
            <CardDescription>Visualização do fluxo de leads até o fechamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="w-full h-full bg-muted/50 animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name, props) => [
                        `${value} (${props.payload.rate}%)`,
                        props.payload.stage
                      ]}
                    />
                    <Funnel
                      data={data?.funnelData || []}
                      dataKey="value"
                      nameKey="stage"
                      isAnimationActive
                    >
                      <LabelList 
                        position="right" 
                        fill="hsl(var(--foreground))"
                        fontSize={12}
                        formatter={(value: number) => value}
                      />
                      <LabelList 
                        position="left" 
                        fill="hsl(var(--muted-foreground))"
                        fontSize={12}
                        dataKey="stage"
                      />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            (data?.goals || []).map((goal) => {
              const Icon = goalIcons[goal.key] || Target;
              const status = statusConfig[goal.status];
              const StatusIcon = status.icon;

              return (
                <Card 
                  key={goal.key} 
                  className={cn(
                    "border transition-all duration-200 hover:shadow-md",
                    status.bg,
                    status.border
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", status.bg)}>
                          <Icon className={cn("h-5 w-5", status.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{goal.label}</h3>
                          {goal.rate !== undefined && (
                            <p className="text-xs text-muted-foreground">Taxa: {goal.rate}%</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-5 w-5", status.color)} />
                        {isAdmin && goal.isEditable && (
                          <Dialog open={isDialogOpen && editingGoal?.key === goal.key} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingGoal(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setEditingGoal({ key: goal.key, value: goal.target })}
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
                                  <Label>Valor da Meta</Label>
                                  <Input
                                    type="number"
                                    value={editingGoal?.value || 0}
                                    onChange={(e) => setEditingGoal(prev => prev ? { ...prev, value: parseFloat(e.target.value) } : null)}
                                  />
                                </div>
                                <Button 
                                  className="w-full" 
                                  onClick={handleSaveGoal}
                                  disabled={updateGoal.isPending}
                                >
                                  {updateGoal.isPending ? 'Salvando...' : 'Salvar'}
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

                      <Progress 
                        value={goal.percentage} 
                        className={cn(
                          "h-2",
                          goal.status === 'healthy' ? '[&>div]:bg-success' :
                          goal.status === 'warning' ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                        )}
                      />

                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-semibold", status.color)}>
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

        {/* Conversion Flow */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Fluxo de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {(data?.funnelData || []).map((stage, index, arr) => (
                <div key={stage.stage} className="flex items-center">
                  <div className="text-center min-w-[120px]">
                    <div 
                      className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${stage.color}20` }}
                    >
                      <span className="text-lg font-bold" style={{ color: stage.color }}>
                        {stage.value}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{stage.stage}</p>
                    <Badge variant="outline" className="mt-1">
                      {stage.rate}%
                    </Badge>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground mx-4 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
