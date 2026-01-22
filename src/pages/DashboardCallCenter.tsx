import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAgentMetrics, useAgentRankings, AgentMetrics } from '@/hooks/useAgentMetrics';
import { useIncentiveGoals } from '@/hooks/useIncentiveGoals';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Phone, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  UserCheck,
  Clock,
  Trophy,
  Target,
  Award,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const metricCards = [
  { key: 'leadsReceived', label: 'Leads Recebidos', icon: Users, color: 'chart-2' },
  { key: 'leadsAttended', label: 'Leads Atendidos', icon: UserCheck, color: 'success' },
  { key: 'callsMade', label: 'Ligações Feitas', icon: Phone, color: 'warning' },
  { key: 'appointmentsScheduled', label: 'Agendamentos', icon: Calendar, color: 'primary' },
  { key: 'attendedAppointments', label: 'Comparecimentos', icon: TrendingUp, color: 'success' },
  { key: 'closed', label: 'Fechados', icon: DollarSign, color: 'success' },
];

function AgentCard({ agent }: { agent: AgentMetrics }) {
  const initials = agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{agent.agentName}</h3>
            <p className="text-sm text-muted-foreground">Atendente</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{agent.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{agent.attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Comparecimento</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">R$ {(agent.revenue / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">Receita</p>
          </div>
        </div>

        <div className="space-y-3">
          {metricCards.slice(0, 4).map((metric) => (
            <div key={metric.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className="font-semibold">{agent[metric.key as keyof AgentMetrics]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingTable({ rankings, metric }: { rankings: any[]; metric: string }) {
  const formatValue = (value: number) => {
    if (metric === 'revenue') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (metric === 'conversion') return `${value}%`;
    return value.toString();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.map((item) => (
          <TableRow key={item.agentId}>
            <TableCell>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                item.rank === 1 ? "bg-warning/20 text-warning" :
                item.rank === 2 ? "bg-muted text-muted-foreground" :
                item.rank === 3 ? "bg-warning/10 text-warning/80" :
                "bg-muted/50 text-muted-foreground"
              )}>
                {item.rank === 1 ? <Trophy className="h-4 w-4" /> : item.rank}
              </div>
            </TableCell>
            <TableCell className="font-medium">{item.agentName}</TableCell>
            <TableCell className="text-right font-semibold">
              {formatValue(item.value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function IncentiveWidget({ agentId }: { agentId?: string }) {
  const { data } = useIncentiveGoals(agentId);

  if (!data || data.goals.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center">
          <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhum plano de incentivo ativo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          Plano de Incentivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.goals.map((goal, idx) => (
          <div key={idx} className={cn(
            "p-4 rounded-xl border",
            goal.bonusEarned ? "bg-success/10 border-success/20" : "bg-muted/30 border-border"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium capitalize">{goal.type.replace('_', ' ')}</span>
              <Badge variant="outline" className={goal.bonusEarned ? "bg-success/20 text-success border-success/30" : ""}>
                R$ {goal.bonusValue.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{goal.current}</span>
              <span className="text-muted-foreground">/ {goal.target}</span>
            </div>
            <Progress 
              value={goal.percentage} 
              className={cn("h-2", goal.bonusEarned ? "[&>div]:bg-success" : "")}
            />
            {!goal.bonusEarned && goal.remaining > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Faltam <span className="font-semibold">{goal.remaining}</span> para ganhar o bônus
              </p>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Bônus Ganho Hoje:</span>
            <span className="text-xl font-bold text-success">
              R$ {data.weeklySummary.earnedBonus.toFixed(2)}
            </span>
          </div>
          {data.weeklySummary.allGoalsMet && (
            <p className="text-sm text-success mt-2 flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Parabéns! Todas as metas do dia foram batidas!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardCallCenter() {
  const { user, isAdmin, fullName } = useAuth();
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  
  const { data: metrics, isLoading } = useAgentMetrics(period, isAdmin ? selectedAgent : user?.id);
  const { byAppointments, byRevenue, byConversion } = useAgentRankings(period);

  const currentAgentMetrics = metrics?.find(m => m.agentId === (selectedAgent || user?.id));

  return (
    <AppLayout title="Dashboard Call Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isAdmin ? 'Visão Geral do Call Center' : `Olá, ${fullName?.split(' ')[0]}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe seu desempenho e metas em tempo real
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Select value={selectedAgent || 'all'} onValueChange={(v) => setSelectedAgent(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os atendentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os atendentes</SelectItem>
                  {metrics?.map((m) => (
                    <SelectItem key={m.agentId} value={m.agentId}>{m.agentName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Hoje</SelectItem>
                <SelectItem value="semanal">Esta Semana</SelectItem>
                <SelectItem value="mensal">Este Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const value = currentAgentMetrics?.[metric.key as keyof AgentMetrics] ?? 
              metrics?.reduce((sum, m) => sum + (m[metric.key as keyof AgentMetrics] as number || 0), 0) ?? 0;

            return (
              <Card key={metric.key} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-${metric.color}/10 flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 text-${metric.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Incentive Widget */}
          <IncentiveWidget agentId={selectedAgent || user?.id} />

          {/* Rankings */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                Ranking de Desempenho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="appointments">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
                  <TabsTrigger value="revenue">Faturamento</TabsTrigger>
                  <TabsTrigger value="conversion">Conversão</TabsTrigger>
                </TabsList>
                <TabsContent value="appointments" className="mt-4">
                  <RankingTable rankings={byAppointments} metric="appointments" />
                </TabsContent>
                <TabsContent value="revenue" className="mt-4">
                  <RankingTable rankings={byRevenue} metric="revenue" />
                </TabsContent>
                <TabsContent value="conversion" className="mt-4">
                  <RankingTable rankings={byConversion} metric="conversion" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Agent Cards (Admin only) */}
        {isAdmin && !selectedAgent && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Desempenho por Atendente</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics?.map((agent) => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
