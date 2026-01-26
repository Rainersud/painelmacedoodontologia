import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useIncentiveTiers, useAllAgentsIncentives } from '@/hooks/useIncentiveTiers';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Settings, Trophy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PlanoIncentivoV2() {
  const { isAdmin } = useAuth();
  const { data, isLoading, updateTierPercentage } = useIncentiveTiers();
  const { data: allAgents } = useAllAgentsIncentives();
  const [editingTier, setEditingTier] = useState<{ index: number; percentage: number } | null>(null);

  const handleSaveTier = async () => {
    if (!editingTier) return;
    try {
      await updateTierPercentage.mutateAsync({ tierIndex: editingTier.index, percentage: editingTier.percentage });
      toast.success('Percentual atualizado!');
      setEditingTier(null);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const tierColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--warning))', 'hsl(var(--success))'];

  return (
    <AppLayout title="Plano de Incentivo">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Plano de Incentivo</h2>
              <p className="text-sm text-muted-foreground">Metas progressivas por faturamento</p>
            </div>
          </div>
        </div>

        {/* Current Revenue Summary */}
        {data && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-success/10 to-success/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Atual</p>
                  <p className="text-3xl font-bold">R$ {data.currentRevenue.toLocaleString('pt-BR')}</p>
                  {data.currentTier && (
                    <Badge className="mt-2 bg-success">{data.currentTier.name} Atingida!</Badge>
                  )}
                </div>
                <Trophy className="h-16 w-16 text-success/30" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            data?.tiers.map((tier, index) => (
              <Card key={tier.id} className={cn(
                "border-2 transition-all",
                tier.isAchieved ? "border-success bg-success/5" : "border-border"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-2xl font-bold" style={{ color: tierColors[index] }}>
                        {tier.percentage}%
                      </p>
                    </div>
                    {isAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTier({ index: index + 1, percentage: tier.percentage })}>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar {tier.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Percentual (%)</Label>
                              <Input type="number" step="0.1" value={editingTier?.percentage || tier.percentage} onChange={(e) => setEditingTier(prev => prev ? { ...prev, percentage: parseFloat(e.target.value) } : null)} />
                            </div>
                            <Button className="w-full" onClick={handleSaveTier}>Salvar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Meta: R$ {tier.targetRevenue.toLocaleString('pt-BR')}
                    </div>
                    <Progress value={tier.progress} className={cn("h-2", tier.isAchieved && "[&>div]:bg-success")} />
                    <div className="flex justify-between text-xs">
                      <span className={tier.isAchieved ? "text-success font-semibold" : "text-muted-foreground"}>
                        {tier.progress}%
                      </span>
                      {!tier.isAchieved && (
                        <span className="text-muted-foreground">
                          Falta: R$ {tier.remaining.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                    {tier.isAchieved && (
                      <div className="text-center pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Bônus</p>
                        <p className="text-lg font-bold text-success">
                          R$ {tier.bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* All Agents (Admin) */}
        {isAdmin && allAgents && allAgents.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Incentivos por Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allAgents.map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{agent.agentName}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {agent.currentRevenue.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {agent.currentTier ? (
                        <>
                          <Badge className="bg-success">{agent.currentTier.name}</Badge>
                          <p className="text-sm font-bold text-success mt-1">
                            R$ {agent.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem meta atingida</span>
                      )}
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
