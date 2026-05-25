import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAgentMetricsRange, useAgentRankingsRange, AgentMetrics } from '@/hooks/useAgentMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCalendar } from '@/hooks/useBusinessCalendar';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from 'date-fns';
import {
  Users, Phone, Calendar, TrendingUp, DollarSign, UserCheck, Trophy,
  Share2, Target, Flame, Crown, Medal, Settings, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type Period = 'hoje' | 'semana' | 'mes';

const periodLabels: Record<Period, string> = { hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês' };

function getRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'hoje': return { start: startOfDay(now), end: endOfDay(now) };
    case 'semana': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'mes': return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

const kpiCards = [
  { key: 'leadsReceived', label: 'Novos Leads', icon: Users, color: 'primary' },
  { key: 'appointmentsScheduled', label: 'Agendamentos', icon: Calendar, color: 'chart-2' },
  { key: 'attendedAppointments', label: 'Comparecimentos', icon: UserCheck, color: 'success' },
  { key: 'closed', label: 'Venda Realizada', icon: DollarSign, color: 'chart-5' },
  { key: 'referrals', label: 'Indicações', icon: Share2, color: 'warning' },
] as const;

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="text-xs font-bold text-muted-foreground">{rank}</span>;
}

function AgentCard({ agent, isLeader }: { agent: AgentMetrics; isLeader?: boolean }) {
  const initials = agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Card className={cn('border-0 shadow-sm relative overflow-hidden', isLeader && 'ring-2 ring-yellow-500/40')}>
      {isLeader && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
          <Crown className="h-3 w-3" /> TOP
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{agent.agentName}</h3>
            <p className="text-xs text-muted-foreground">{agent.isActive ? 'Ativo' : 'Inativo'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div><p className="text-lg font-bold">{agent.conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conv.</p></div>
          <div><p className="text-lg font-bold">{agent.attendanceRate}%</p><p className="text-[10px] text-muted-foreground">Compar.</p></div>
          <div><p className="text-lg font-bold">{agent.closingRate}%</p><p className="text-[10px] text-muted-foreground">Fechto.</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><b>{agent.leadsReceived}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Agend.</span><b>{agent.appointmentsScheduled}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Compar.</span><b>{agent.attendedAppointments}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Venda Real.</span><b>{agent.closed}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Indic.</span><b>{agent.referrals}</b></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Faturam.</span><b>R$ {(agent.revenue / 1000).toFixed(1)}k</b></div>
          <div className="flex justify-between col-span-2 pt-1 border-t"><span className="text-muted-foreground">Ticket Médio</span><b className="text-primary">R$ {agent.closed > 0 ? Math.round(agent.revenue / agent.closed).toLocaleString('pt-BR') : '0'}</b></div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingTable({ rankings, formatter }: { rankings: any[]; formatter: (v: number) => string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">#</TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.slice(0, 8).map(item => (
          <TableRow key={item.agentId}>
            <TableCell>
              <div className="h-7 w-7 rounded-full flex items-center justify-center bg-muted">
                <MedalIcon rank={item.rank} />
              </div>
            </TableCell>
            <TableCell className="font-medium">{item.agentName}</TableCell>
            <TableCell className="text-right font-semibold">{formatter(item.value)}</TableCell>
          </TableRow>
        ))}
        {rankings.length === 0 && (
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}


function HighlightsBar({ rankings }: { rankings: ReturnType<typeof useAgentRankingsRange> }) {
  const items = [
    { label: 'Maior Faturamento', icon: DollarSign, leader: rankings.byRevenue[0], format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` },
    { label: 'Maior Fechamento', icon: Target, leader: rankings.byClosed[0], format: (v: number) => `${v} vendas` },
    { label: 'Mais Indicações', icon: Share2, leader: rankings.byReferrals[0], format: (v: number) => `${v} indic.` },
    { label: 'Mais Comparec.', icon: UserCheck, leader: rankings.byAttended[0], format: (v: number) => `${v} compar.` },
    { label: 'Maior Conversão', icon: Flame, leader: rankings.byConversion[0], format: (v: number) => `${v}%` },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map(it => {
        const Icon = it.icon;
        const hasData = it.leader && it.leader.value > 0;
        return (
          <Card key={it.label} className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{it.label}</span>
              </div>
              {hasData ? (
                <>
                  <p className="text-sm font-bold truncate">{it.leader.agentName}</p>
                  <p className="text-xs text-primary font-semibold">{it.format(it.leader.value)}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function DashboardCallCenter() {
  const { user, isAdmin, fullName } = useAuth();
  const [period, setPeriod] = useState<Period>('hoje');
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);

  const range = useMemo(() => getRange(period), [period]);
  const { data: cal } = useBusinessCalendar();
  const businessDays = cal ? cal.countBusinessDays(range.start, range.end) : 0;

  const { data: metrics, isLoading } = useAgentMetricsRange(range, isAdmin ? selectedAgent : user?.id);
  const rankings = useAgentRankingsRange(range);

  const activeMetrics = (metrics ?? []).filter(m => m.isActive);
  const currentAgent = (metrics ?? []).find(m => m.agentId === (selectedAgent || user?.id));
  const showTeam = isAdmin && !selectedAgent;

  const totals = useMemo(() => {
    const list = showTeam ? activeMetrics : currentAgent ? [currentAgent] : [];
    return kpiCards.reduce((acc, k) => {
      acc[k.key] = list.reduce((s, m) => s + Number(m[k.key as keyof AgentMetrics] || 0), 0);
      return acc;
    }, {} as Record<string, number>);
  }, [activeMetrics, currentAgent, showTeam]);

  const topAgentId = rankings.byRevenue[0]?.agentId;

  const ticketRanking = useMemo(() => {
    const list = (metrics ?? []).filter(m => m.isActive);
    return [...list]
      .map(m => ({
        agentId: m.agentId,
        agentName: m.agentName,
        value: m.closed > 0 ? Math.round(m.revenue / m.closed) : 0,
        metric: 'ticket',
      }))
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [metrics]);

  return (
    <AppLayout title="Call Center">
      <div className="space-y-6">
        {/* Header + filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              {isAdmin ? 'Visão Geral do Call Center' : `Olá, ${fullName?.split(' ')[0]}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {periodLabels[period]} · {businessDays} {businessDays === 1 ? 'dia útil' : 'dias úteis'} · sincronizado com Dashboard / Comercial 1
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Select value={selectedAgent || 'all'} onValueChange={(v) => setSelectedAgent(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os atendentes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os atendentes</SelectItem>
                  {(metrics ?? []).map(m => (
                    <SelectItem key={m.agentId} value={m.agentId}>
                      {m.agentName}{!m.isActive ? ' (inativo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="hoje">Hoje</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/configuracoes"><Settings className="h-4 w-4" /> Atendentes</Link>
              </Button>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map(metric => {
            const Icon = metric.icon;
            const value = totals[metric.key] ?? 0;
            return (
              <Card key={metric.key} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-${metric.color}/10 flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 text-${metric.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-tight">{value}</p>
                      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Faturamento + indicadores inteligentes */}
        {showTeam && (
          <>
            <Card className="border-0 shadow-sm bg-gradient-to-r from-success/10 via-success/5 to-transparent">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Faturamento do Call Center</p>
                  <p className="text-3xl font-bold text-success">
                    R$ {activeMetrics.reduce((s, m) => s + m.revenue, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{periodLabels[period]} · {activeMetrics.length} atendentes ativos</p>
                </div>
                <TrendingUp className="h-12 w-12 text-success/30" />
              </CardContent>
            </Card>

            <HighlightsBar rankings={rankings} />
          </>
        )}

        {/* Ranking */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" /> Ranking de Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="revenue">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
                <TabsTrigger value="revenue">Faturamento</TabsTrigger>
                <TabsTrigger value="closed">Venda Realizada</TabsTrigger>
                <TabsTrigger value="ticket">Ticket Médio</TabsTrigger>
                <TabsTrigger value="attended">Comparec.</TabsTrigger>
                <TabsTrigger value="appointments">Agendam.</TabsTrigger>
                <TabsTrigger value="conversion">Conversão</TabsTrigger>
                <TabsTrigger value="referrals">Indicações</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue" className="mt-4">
                <RankingTable rankings={rankings.byRevenue} formatter={v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
              </TabsContent>
              <TabsContent value="closed" className="mt-4">
                <RankingTable rankings={rankings.byClosed} formatter={v => `${v} vendas`} />
              </TabsContent>
              <TabsContent value="ticket" className="mt-4">
                <RankingTable rankings={ticketRanking} formatter={v => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
              </TabsContent>
              <TabsContent value="attended" className="mt-4">
                <RankingTable rankings={rankings.byAttended} formatter={v => `${v}`} />
              </TabsContent>
              <TabsContent value="appointments" className="mt-4">
                <RankingTable rankings={rankings.byAppointments} formatter={v => `${v}`} />
              </TabsContent>
              <TabsContent value="conversion" className="mt-4">
                <RankingTable rankings={rankings.byConversion} formatter={v => `${v}%`} />
              </TabsContent>
              <TabsContent value="referrals" className="mt-4">
                <RankingTable rankings={rankings.byReferrals} formatter={v => `${v}`} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


        {/* Cards individuais (visão de equipe) */}
        {showTeam && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex-row flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Desempenho por Atendente</CardTitle>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link to="/configuracoes">Gerenciar <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : activeMetrics.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum atendente ativo</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {activeMetrics.map(a => <AgentCard key={a.agentId} agent={a} isLeader={a.agentId === topAgentId} />)}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
