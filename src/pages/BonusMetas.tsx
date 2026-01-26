import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAgentBonus, useAllAgentsBonus } from '@/hooks/useAgentBonus';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Award, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users,
  Calendar,
  UserCheck,
  DollarSign,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Period = 'diario' | 'semanal' | 'mensal';

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

const metricConfig: Record<string, { icon: React.ElementType; color: string }> = {
  novos_leads: { icon: Users, color: mondayColors.blue },
  agendamentos: { icon: Calendar, color: mondayColors.purple },
  comparecimentos: { icon: UserCheck, color: mondayColors.green },
  resgatados: { icon: Sparkles, color: mondayColors.orange },
  fechados: { icon: DollarSign, color: mondayColors.pink },
};

export default function BonusMetas() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>('diario');
  const { agentData, bonusTargets, isLoading, updateBonusTarget } = useAgentBonus(undefined, period);
  const { data: allAgents } = useAllAgentsBonus(period);
  const [editingTarget, setEditingTarget] = useState<{ type: string; target: number; bonusValue: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveTarget = async () => {
    if (!editingTarget) return;
    try {
      await updateBonusTarget.mutateAsync(editingTarget);
      toast.success('Meta atualizada!');
      setEditingTarget(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  return (
    <AppLayout title="Bônus por Metas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bônus por Metas</h1>
            <p className="text-muted-foreground">Acompanhamento de metas individuais</p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="diario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Diário
              </TabsTrigger>
              <TabsTrigger value="semanal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Semanal
              </TabsTrigger>
              <TabsTrigger value="mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Mensal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* My Bonus Summary - Monday Style */}
        {agentData && (
          <Card className="monday-card overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: mondayColors.orange }} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Bônus Ganho</p>
                  <p className="text-4xl font-bold" style={{ color: mondayColors.orange }}>
                    R$ {agentData.earnedBonus.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    de R$ {agentData.totalBonus.toFixed(2)} possível
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-success/15 text-success">
                      {agentData.metrics.filter(m => m.completed).length} metas batidas
                    </span>
                  </div>
                </div>
                <div 
                  className="h-20 w-20 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: mondayColors.orange }}
                >
                  <Award className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funnel Visual - Monday Pipeline */}
        <Card className="monday-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Funil de Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-32 flex-1 min-w-[120px] bg-muted/50 rounded-xl animate-pulse" />
                ))
              ) : (
                agentData?.metrics.map((metric, index, arr) => {
                  const config = metricConfig[metric.type] || { icon: TrendingUp, color: mondayColors.blue };
                  const Icon = config.icon;

                  return (
                    <div key={metric.type} className="flex items-center flex-1 min-w-[120px]">
                      <div className="flex-1">
                        <div 
                          className={cn(
                            "rounded-xl p-4 text-center transition-all hover:scale-105 relative overflow-hidden",
                            metric.completed ? "text-white" : "bg-muted/50"
                          )}
                          style={{ backgroundColor: metric.completed ? config.color : undefined }}
                        >
                          {metric.completed && (
                            <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-white/80" />
                          )}
                          <Icon className={cn("h-6 w-6 mx-auto mb-2", !metric.completed && "text-muted-foreground")} />
                          <p className="text-2xl font-bold">{metric.current}</p>
                          <p className={cn("text-xs", metric.completed ? "opacity-90" : "text-muted-foreground")}>
                            / {metric.target}
                          </p>
                          <p className="text-xs font-medium mt-1">{metric.label}</p>
                          <div 
                            className={cn(
                              "mt-2 inline-block rounded-full px-2 py-0.5",
                              metric.completed ? "bg-white/20" : "bg-muted"
                            )}
                          >
                            <span className="text-xs font-semibold">R$ {metric.bonusValue.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                      {index < arr.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground mx-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {isLoading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
            ))
          ) : (
            agentData?.metrics.map((metric) => {
              const config = metricConfig[metric.type] || { icon: TrendingUp, color: mondayColors.blue };
              const Icon = config.icon;

              return (
                <Card key={metric.type} className="monday-card overflow-hidden group">
                  <div 
                    className="h-1.5 w-full"
                    style={{ backgroundColor: metric.completed ? config.color : 'hsl(var(--muted))' }}
                  />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div 
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          metric.completed ? "text-white" : "bg-muted"
                        )}
                        style={{ backgroundColor: metric.completed ? config.color : undefined }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        {metric.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        {isAdmin && (
                          <Dialog open={isDialogOpen && editingTarget?.type === metric.type} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingTarget(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => setEditingTarget({ type: metric.type, target: metric.target, bonusValue: metric.bonusValue })}
                              >
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
                                  <Input 
                                    type="number" 
                                    value={editingTarget?.target || 0} 
                                    onChange={(e) => setEditingTarget(prev => prev ? { ...prev, target: parseInt(e.target.value) } : null)} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Valor do Bônus (R$)</Label>
                                  <Input 
                                    type="number" 
                                    value={editingTarget?.bonusValue || 0} 
                                    onChange={(e) => setEditingTarget(prev => prev ? { ...prev, bonusValue: parseFloat(e.target.value) } : null)} 
                                  />
                                </div>
                                <Button className="w-full" onClick={handleSaveTarget}>Salvar</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{metric.current}</span>
                        <span className="text-sm text-muted-foreground">/ {metric.target}</span>
                      </div>
                      
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(metric.percentage, 100)}%`,
                            backgroundColor: config.color 
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: config.color }}>{metric.percentage}%</span>
                        <span 
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            metric.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                          )}
                        >
                          R$ {metric.bonusValue.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* All Agents (Admin Only) */}
        {isAdmin && allAgents && allAgents.length > 0 && (
          <Card className="monday-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Todos os Colaboradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAgents.map((agent, index) => {
                  const completedCount = agent.metrics.filter(m => m.completed).length;
                  const totalCount = agent.metrics.length;
                  const progressPercent = (completedCount / totalCount) * 100;

                  return (
                    <div 
                      key={agent.agent.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2" style={{ borderColor: mondayColors.blue }}>
                            <AvatarFallback className="text-sm font-semibold">
                              {agent.agent.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card border-2 border-background flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{agent.agent.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {agent.metrics.slice(0, 5).map((m, i) => (
                              <div 
                                key={i}
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  m.completed ? "bg-success" : "bg-muted-foreground/30"
                                )}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              {completedCount}/{totalCount} metas
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: mondayColors.orange }}>
                          R$ {agent.earnedBonus.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">bônus ganho</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}