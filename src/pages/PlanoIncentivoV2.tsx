import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useIncentiveTiers, useAllAgentsIncentives } from '@/hooks/useIncentiveTiers';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Zap, 
  Settings, 
  Trophy, 
  ArrowRight, 
  CheckCircle2,
  Star,
  Crown,
  Gem,
  Target
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

const tierConfig = [
  { icon: Target, color: mondayColors.blue, gradient: 'from-[hsl(213_94%_58%)] to-[hsl(213_94%_45%)]' },
  { icon: Star, color: mondayColors.green, gradient: 'from-[hsl(156_72%_45%)] to-[hsl(156_72%_35%)]' },
  { icon: Gem, color: mondayColors.purple, gradient: 'from-[hsl(270_75%_60%)] to-[hsl(270_75%_45%)]' },
  { icon: Crown, color: mondayColors.orange, gradient: 'from-[hsl(32_95%_55%)] to-[hsl(32_95%_40%)]' },
];

export default function PlanoIncentivoV2() {
  const { isAdmin } = useAuth();
  const { data, isLoading, updateTierPercentage, updateTierTarget } = useIncentiveTiers();
  const { data: allAgents } = useAllAgentsIncentives();
  const [editingTier, setEditingTier] = useState<{ 
    index: number; 
    percentage: number; 
    targetRevenue: number;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveTier = async () => {
    if (!editingTier) return;
    try {
      // Update both percentage and target
      await updateTierPercentage.mutateAsync({ 
        tierIndex: editingTier.index, 
        percentage: editingTier.percentage 
      });
      await updateTierTarget.mutateAsync({ 
        tierIndex: editingTier.index, 
        targetRevenue: editingTier.targetRevenue 
      });
      toast.success('Meta atualizada!');
      setEditingTier(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <AppLayout title="Plano de Incentivo">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Plano de Incentivo</h1>
            <p className="text-muted-foreground">Metas progressivas por faturamento</p>
          </div>
          <div 
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: mondayColors.green }}
          >
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        {/* Current Revenue Summary */}
        {data && (
          <Card className="monday-card overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: mondayColors.green }} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Faturamento Atual</p>
                  <p className="text-4xl font-bold">R$ {data.currentRevenue.toLocaleString('pt-BR')}</p>
                  {data.currentTier && (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span 
                        className="text-sm font-semibold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: mondayColors.green }}
                      >
                        {data.currentTier.name} Atingida!
                      </span>
                    </div>
                  )}
                </div>
                <div 
                  className="h-20 w-20 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: mondayColors.green }}
                >
                  <Trophy className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tier Progress Pipeline */}
        <Card className="monday-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Progresso das Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 flex-1 min-w-[160px] bg-muted/50 rounded-xl animate-pulse" />
                ))
              ) : (
                data?.tiers.map((tier, index, arr) => {
                  const config = tierConfig[index] || tierConfig[0];
                  const Icon = config.icon;

                  return (
                    <div key={tier.id} className="flex items-center flex-1 min-w-[160px]">
                      <div 
                        className={cn(
                          "flex-1 rounded-xl p-4 transition-all hover:scale-105",
                          tier.isAchieved 
                            ? "text-white bg-gradient-to-br " + config.gradient
                            : "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={cn("h-6 w-6", !tier.isAchieved && "text-muted-foreground")} />
                          {tier.isAchieved && <CheckCircle2 className="h-5 w-5" />}
                        </div>
                        <p className="font-bold">{tier.name}</p>
                        <p className="text-2xl font-bold">{tier.percentage}%</p>
                        <p className={cn("text-xs mt-1", tier.isAchieved ? "opacity-80" : "text-muted-foreground")}>
                          R$ {tier.targetRevenue.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {index < arr.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tier Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            data?.tiers.map((tier, index) => {
              const config = tierConfig[index] || tierConfig[0];
              const Icon = config.icon;

              return (
                <Card 
                  key={tier.id} 
                  className={cn(
                    "monday-card overflow-hidden group",
                    tier.isAchieved && "ring-2 ring-success"
                  )}
                >
                  <div 
                    className="h-1.5 w-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110"
                        )}
                        style={{ backgroundColor: config.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-1">
                        {tier.isAchieved && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/15 text-success">
                            ✓ Atingida
                          </span>
                        )}
                        {isAdmin && (
                          <Dialog open={isDialogOpen && editingTier?.index === index + 1} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingTier(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setEditingTier({ 
                                  index: index + 1, 
                                  percentage: tier.percentage,
                                  targetRevenue: tier.targetRevenue
                                })}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar {tier.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label>Meta de Faturamento (R$)</Label>
                                  <Input 
                                    type="number" 
                                    value={editingTier?.targetRevenue || 0} 
                                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, targetRevenue: parseFloat(e.target.value) || 0 } : null)} 
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Valor de faturamento necessário para atingir esta meta
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Percentual de Bônus (%)</Label>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    max="100"
                                    value={editingTier?.percentage || 0} 
                                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, percentage: parseFloat(e.target.value) || 0 } : null)} 
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Percentual do faturamento que será pago como bônus
                                  </p>
                                </div>
                                <Button 
                                  className="w-full" 
                                  onClick={handleSaveTier}
                                  disabled={updateTierPercentage.isPending || updateTierTarget.isPending}
                                >
                                  {(updateTierPercentage.isPending || updateTierTarget.isPending) ? 'Salvando...' : 'Salvar Meta'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg">{tier.name}</h3>
                        <p className="text-3xl font-bold" style={{ color: config.color }}>
                          {tier.percentage}%
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Meta: R$ {tier.targetRevenue.toLocaleString('pt-BR')}
                      </div>

                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(tier.progress, 100)}%`,
                            backgroundColor: config.color 
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-xs">
                        <span style={{ color: config.color }} className="font-semibold">
                          {tier.progress}%
                        </span>
                        {!tier.isAchieved && (
                          <span className="text-muted-foreground">
                            Falta: R$ {tier.remaining.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {tier.isAchieved && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground">Bônus</p>
                          <p className="text-xl font-bold text-success">
                            R$ {tier.bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* All Agents (Admin) */}
        {isAdmin && allAgents && allAgents.length > 0 && (
          <Card className="monday-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Incentivos por Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAgents.map((agent, index) => (
                  <div 
                    key={agent.agentId} 
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2" style={{ borderColor: mondayColors.green }}>
                          <AvatarFallback className="text-sm font-semibold">
                            {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {agent.currentTier && (
                          <span 
                            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: tierConfig[Math.min(data?.tiers.findIndex(t => t.name === agent.currentTier?.name) ?? 0, 3)].color }}
                          >
                            <Trophy className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{agent.agentName}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {agent.currentRevenue.toLocaleString('pt-BR')} faturado
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {agent.currentTier ? (
                        <>
                          <span 
                            className="text-xs font-medium px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: tierConfig[Math.min(data?.tiers.findIndex(t => t.name === agent.currentTier?.name) ?? 0, 3)].color }}
                          >
                            {agent.currentTier.name}
                          </span>
                          <p className="text-lg font-bold text-success mt-1">
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