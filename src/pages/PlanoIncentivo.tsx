import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Award, 
  Trash2, 
  Calendar,
  Users,
  UserCheck,
  DollarSign,
  Zap,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { incentivePlanSchema, validateForm } from '@/lib/validations';

type TargetType = 'agendamentos' | 'comparecimentos' | 'indicacoes' | 'fechados';
type Period = 'diario' | 'semanal' | 'mensal';

const targetTypeConfig: Record<TargetType, { label: string; icon: React.ElementType }> = {
  agendamentos: { label: 'Agendamentos', icon: Calendar },
  comparecimentos: { label: 'Comparecimentos', icon: UserCheck },
  indicacoes: { label: 'Indicações', icon: Share2 },
  fechados: { label: 'Fechados', icon: DollarSign },
};

const periodLabels: Record<Period, string> = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

export default function PlanoIncentivo() {
  const { user, isAdmin, roleLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    period: '' as Period,
    target_type: '' as TargetType,
    target_value: '',
    bonus_value: '',
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['incentive-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incentive_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createPlan = useMutation({
    mutationFn: async (data: typeof newPlan) => {
      // Validate input before database operation
      const validation = validateForm(incentivePlanSchema, data);
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        throw new Error(firstError || 'Dados inválidos');
      }

      const { error } = await supabase.from('incentive_plans').insert({
        name: validation.data!.name.trim(),
        period: validation.data!.period,
        target_type: validation.data!.target_type,
        target_value: parseInt(validation.data!.target_value),
        bonus_value: parseFloat(validation.data!.bonus_value),
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-plans'] });
      setIsDialogOpen(false);
      setNewPlan({ name: '', period: '' as Period, target_type: '' as TargetType, target_value: '', bonus_value: '' });
      toast.success('Plano de incentivo criado!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar plano');
    },
  });

  const togglePlan = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('incentive_plans')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-plans'] });
      toast.success('Plano atualizado!');
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incentive_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentive-plans'] });
      toast.success('Plano removido!');
    },
  });

  if (roleLoading) {
    return (
      <AppLayout title="Plano de Incentivo">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="Plano de Incentivo">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar planos de incentivo
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const activePlans = plans?.filter(p => p.is_active) || [];
  const inactivePlans = plans?.filter(p => !p.is_active) || [];

  // Calculate total potential bonus per week
  const weeklyBonusTotal = activePlans
    .filter(p => p.period === 'diario')
    .reduce((sum, p) => sum + (p.bonus_value * 7), 0) +
    activePlans
      .filter(p => p.period === 'semanal')
      .reduce((sum, p) => sum + p.bonus_value, 0);

  return (
    <AppLayout title="Plano de Incentivo">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Planos de Incentivo</h2>
              <p className="text-sm text-muted-foreground">
                Configure bonificações para atingimento de metas
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Plano de Incentivo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Nome do Plano</Label>
                  <Input
                    id="plan-name"
                    name="plan-name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Bônus por Agendamento"
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-type">Tipo de Meta</Label>
                    <Select
                      value={newPlan.target_type || undefined}
                      onValueChange={(v) => setNewPlan(prev => ({ ...prev, target_type: v as TargetType }))}
                    >
                      <SelectTrigger id="target-type">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendamentos">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Agendamentos
                          </div>
                        </SelectItem>
                        <SelectItem value="comparecimentos">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Comparecimentos
                          </div>
                        </SelectItem>
                        <SelectItem value="indicacoes">
                          <div className="flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            Indicações
                          </div>
                        </SelectItem>
                        <SelectItem value="fechados">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fechados
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Período</Label>
                    <Select
                      value={newPlan.period || undefined}
                      onValueChange={(v) => setNewPlan(prev => ({ ...prev, period: v as Period }))}
                    >
                      <SelectTrigger id="period">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-value">Meta (quantidade)</Label>
                    <Input
                      id="target-value"
                      name="target-value"
                      type="number"
                      min="1"
                      value={newPlan.target_value}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, target_value: e.target.value }))}
                      placeholder="Ex: 10"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus-value">Bônus (R$)</Label>
                    <Input
                      id="bonus-value"
                      name="bonus-value"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newPlan.bonus_value}
                      onChange={(e) => setNewPlan(prev => ({ ...prev, bonus_value: e.target.value }))}
                      placeholder="Ex: 50.00"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createPlan.mutate(newPlan)}
                  disabled={!newPlan.name || !newPlan.target_type || !newPlan.period || !newPlan.target_value || !newPlan.bonus_value || createPlan.isPending}
                >
                  {createPlan.isPending ? 'Criando...' : 'Criar Plano'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-warning/10 to-warning/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potencial de Bônus Semanal</p>
                <p className="text-3xl font-bold text-warning">R$ {weeklyBonusTotal.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activePlans.length} planos ativos
                </p>
              </div>
              <Award className="h-16 w-16 text-warning/30" />
            </div>
          </CardContent>
        </Card>

        {/* Active Plans */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Planos Ativos</CardTitle>
            <CardDescription>
              Incentivos que estão valendo atualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activePlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum plano ativo</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Meta</TableHead>
                    <TableHead className="text-right">Bônus</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePlans.map((plan) => {
                    const config = targetTypeConfig[plan.target_type as TargetType];
                    const Icon = config?.icon || Calendar;
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {config?.label || plan.target_type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {periodLabels[plan.period as Period]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {plan.target_value}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          R$ {plan.bonus_value.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePlan.mutate({ id: plan.id, isActive: plan.is_active })}
                            >
                              Desativar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deletePlan.mutate(plan.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Inactive Plans */}
        {inactivePlans.length > 0 && (
          <Card className="border-0 shadow-sm opacity-70">
            <CardHeader>
              <CardTitle className="text-base">Planos Inativos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {inactivePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{targetTypeConfig[plan.target_type as TargetType]?.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{periodLabels[plan.period as Period]}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{plan.target_value}</TableCell>
                      <TableCell className="text-right">R$ {plan.bonus_value.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlan.mutate({ id: plan.id, isActive: plan.is_active })}
                        >
                          Ativar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
