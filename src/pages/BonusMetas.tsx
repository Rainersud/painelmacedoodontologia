import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAgentBonus, useAllAgentsBonus } from '@/hooks/useAgentBonus';
import { useAuth } from '@/contexts/AuthContext';
import { Award, Settings, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Period = 'diario' | 'semanal' | 'mensal';

export default function BonusMetas() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>('diario');
  const { agentData, bonusTargets, isLoading, updateBonusTarget } = useAgentBonus(undefined, period);
  const { data: allAgents } = useAllAgentsBonus(period);
  const [editingTarget, setEditingTarget] = useState<{ type: string; target: number; bonusValue: number } | null>(null);

  const handleSaveTarget = async () => {
    if (!editingTarget) return;
    try {
      await updateBonusTarget.mutateAsync(editingTarget);
      toast.success('Meta atualizada!');
      setEditingTarget(null);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <AppLayout title="Bônus por Metas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Bônus por Metas Batidas</h2>
              <p className="text-sm text-muted-foreground">Acompanhamento de metas individuais</p>
            </div>
          </div>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="diario">Diário</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* My Bonus Summary */}
        {agentData && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-warning/10 to-warning/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bônus Ganho ({period})</p>
                  <p className="text-3xl font-bold text-warning">R$ {agentData.earnedBonus.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    de R$ {agentData.totalBonus.toFixed(2)} possível
                  </p>
                </div>
                <Award className="h-16 w-16 text-warning/30" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funnel Metrics */}
        <div className="grid gap-4 md:grid-cols-5">
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            agentData?.metrics.map((metric) => (
              <Card key={metric.type} className={cn(
                "border-0 shadow-sm transition-all",
                metric.completed ? "bg-success/10" : "bg-card"
              )}>
                <CardContent className="p-4 text-center">
                  <div className="flex justify-between items-start mb-2">
                    {metric.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    {isAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTarget({ type: metric.type, target: metric.target, bonusValue: metric.bonusValue })}>
                            <Settings className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar {metric.label}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Meta Diária</Label>
                              <Input type="number" value={editingTarget?.target || metric.target} onChange={(e) => setEditingTarget(prev => prev ? { ...prev, target: parseInt(e.target.value) } : null)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor do Bônus (R$)</Label>
                              <Input type="number" value={editingTarget?.bonusValue || metric.bonusValue} onChange={(e) => setEditingTarget(prev => prev ? { ...prev, bonusValue: parseFloat(e.target.value) } : null)} />
                            </div>
                            <Button className="w-full" onClick={handleSaveTarget}>Salvar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{metric.current}</p>
                  <p className="text-xs text-muted-foreground">/ {metric.target}</p>
                  <p className="text-xs font-medium mt-1">{metric.label}</p>
                  <Progress value={metric.percentage} className="h-1 mt-2" />
                  <Badge variant={metric.completed ? "default" : "outline"} className="mt-2 text-xs">
                    R$ {metric.bonusValue.toFixed(2)}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* All Agents (Admin Only) */}
        {isAdmin && allAgents && allAgents.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Todos os Colaboradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAgents.map((agent) => (
                  <div key={agent.agent.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{agent.agent.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{agent.agent.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.metrics.filter(m => m.completed).length}/{agent.metrics.length} metas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-warning">R$ {agent.earnedBonus.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">bônus ganho</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
