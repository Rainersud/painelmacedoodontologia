import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoalsProgress, GoalProgress } from '@/hooks/useGoalsProgress';
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign, 
  UserCheck,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { goalSchema, validateForm } from '@/lib/validations';

type GoalType = Database['public']['Enums']['goal_type'];
type GoalPeriod = Database['public']['Enums']['goal_period'];

const goalTypeConfig: Record<GoalType, { label: string; icon: React.ElementType; unit: string }> = {
  leads_atendidos: { label: 'Leads Atendidos', icon: Users, unit: 'leads' },
  consultas_agendadas: { label: 'Consultas Agendadas', icon: Calendar, unit: 'consultas' },
  taxa_conversao: { label: 'Taxa de Conversão', icon: TrendingUp, unit: '%' },
  taxa_comparecimento: { label: 'Comparecimento', icon: UserCheck, unit: '%' },
  receita: { label: 'Receita', icon: DollarSign, unit: 'R$' },
  resgatados: { label: 'Resgatados', icon: Users, unit: 'resgatados' },
  fechados: { label: 'Fechados', icon: DollarSign, unit: 'fechados' },
};

const periodLabels: Record<GoalPeriod, string> = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

const statusColors = {
  green: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', progress: '[&>div]:bg-success' },
  yellow: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', progress: '[&>div]:bg-warning' },
  red: { bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'text-destructive', progress: '[&>div]:bg-destructive' },
};

function GoalCard({ goal, onDelete }: { goal: GoalProgress & { id?: string }; onDelete?: () => void }) {
  const config = goalTypeConfig[goal.type];
  const Icon = config.icon;
  const colors = statusColors[goal.status];

  const formatValue = (value: number) => {
    if (goal.type === 'receita') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (goal.type === 'taxa_conversao' || goal.type === 'taxa_comparecimento') return `${value}%`;
    return value.toString();
  };

  return (
    <Card className={cn("border transition-all duration-200", colors.bg, colors.border)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", colors.bg)}>
              <Icon className={cn("h-6 w-6", colors.text)} />
            </div>
            <div>
              <h3 className="font-semibold">{config.label}</h3>
              <p className="text-sm text-muted-foreground">{periodLabels[goal.period]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full animate-pulse", 
              goal.status === 'green' ? 'bg-success' :
              goal.status === 'yellow' ? 'bg-warning' : 'bg-destructive'
            )} />
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{formatValue(goal.current)}</span>
            <span className="text-lg text-muted-foreground">/ {formatValue(goal.target)}</span>
          </div>

          <Progress value={goal.percentage} className={cn("h-3", colors.progress)} />

          <div className="flex items-center justify-between text-sm">
            <span className={cn("font-semibold", colors.text)}>
              {goal.percentage}% concluído
            </span>
            <span className="text-muted-foreground">
              Faltam: {formatValue(goal.remaining)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Metas() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: progress, isLoading: progressLoading } = useGoalsProgress();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: '' as GoalType,
    period: '' as GoalPeriod,
    target_value: '',
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createGoal = useMutation({
    mutationFn: async (data: typeof newGoal) => {
      // Validate input before database operation
      const validation = validateForm(goalSchema, data);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const now = new Date();
      let start_date: string, end_date: string;

      switch (data.period) {
        case 'diario':
          start_date = now.toISOString().split('T')[0];
          end_date = now.toISOString().split('T')[0];
          break;
        case 'semanal':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          start_date = weekStart.toISOString().split('T')[0];
          end_date = weekEnd.toISOString().split('T')[0];
          break;
        case 'mensal':
          start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        default:
          throw new Error('Invalid period');
      }

      const targetValue = parseFloat(data.target_value);

      const { error } = await supabase.from('goals').insert({
        type: data.type,
        period: data.period,
        target_value: targetValue,
        start_date,
        end_date,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      setIsDialogOpen(false);
      setNewGoal({ type: '' as GoalType, period: '' as GoalPeriod, target_value: '' });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar meta');
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      toast.success('Meta removida!');
    },
  });

  const groupedProgress = {
    diario: progress?.filter(g => g.period === 'diario') || [],
    semanal: progress?.filter(g => g.period === 'semanal') || [],
    mensal: progress?.filter(g => g.period === 'mensal') || [],
  };

  return (
    <AppLayout title="Metas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Acompanhe o progresso das metas em tempo real
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Meta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Tipo de Meta</Label>
                    <Select
                      value={newGoal.type}
                      onValueChange={(v) => setNewGoal({ ...newGoal, type: v as GoalType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(goalTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select
                      value={newGoal.period}
                      onValueChange={(v) => setNewGoal({ ...newGoal, period: v as GoalPeriod })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(periodLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Valor Alvo 
                      {newGoal.type && ` (${goalTypeConfig[newGoal.type]?.unit})`}
                    </Label>
                    <Input
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                      placeholder="Ex: 100"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => createGoal.mutate(newGoal)}
                    disabled={!newGoal.type || !newGoal.period || !newGoal.target_value}
                  >
                    Criar Meta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Progress Tabs */}
        <Tabs defaultValue="diario" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="diario">Diário</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>

          {Object.entries(groupedProgress).map(([period, periodGoals]) => (
            <TabsContent key={period} value={period} className="space-y-4">
              {progressLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : periodGoals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Nenhuma meta {periodLabels[period as GoalPeriod].toLowerCase()} configurada
                    </p>
                    {isAdmin && (
                      <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Meta
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {periodGoals.map((goal, idx) => {
                    const dbGoal = goals?.find(g => g.type === goal.type && g.period === goal.period);
                    return (
                      <GoalCard 
                        key={`${goal.type}-${goal.period}-${idx}`} 
                        goal={goal}
                        onDelete={isAdmin && dbGoal ? () => deleteGoal.mutate(dbGoal.id) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
