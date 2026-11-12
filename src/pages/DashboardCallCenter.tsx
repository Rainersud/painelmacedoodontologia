import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAgentMetricsRange, useAgentRankingsRange, AgentMetrics } from '@/hooks/useAgentMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCalendar } from '@/hooks/useBusinessCalendar';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from 'date-fns';
import { ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type Period = 'hoje' | 'semana' | 'mes';

const periodLabels: Record<Period, string> = { hoje: 'Hoje', semana: 'Esta semana', mes: 'Este mês' };

function getRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'hoje': return { start: startOfDay(now), end: endOfDay(now) };
    case 'semana': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'mes': return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

/** Etapas do funil do atendente, na ordem. Indicações ficam à parte. */
const kpiCards = [
  { key: 'leadsReceived', label: 'Novos leads' },
  { key: 'appointmentsScheduled', label: 'Agendamentos' },
  { key: 'attendedAppointments', label: 'Comparecimentos' },
  { key: 'closed', label: 'Vendas realizadas' },
  { key: 'referrals', label: 'Indicações' },
] as const;

/** Séries de gráfico em ordem fixa (paleta validada para daltonismo). */
const SERIES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-6'];

/** Partes do faturamento por atendente: barra empilhada + legenda com valores. */
function RevenueShare({ agents }: { agents: AgentMetrics[] }) {
  const sorted = [...agents].filter(a => a.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const top = sorted.slice(0, 4).map(a => ({ name: a.agentName, value: a.revenue }));
  const rest = sorted.slice(4).reduce((s, a) => s + a.revenue, 0);
  const parts = rest > 0 ? [...top, { name: 'Outros', value: rest }] : top;
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return null;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-sm" role="img"
        aria-label={parts.map(p => `${p.name}: ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {parts.map((p, i) => (
          <div key={p.name} className={cn('h-full first:rounded-l-sm last:rounded-r-sm', SERIES[i])}
            style={{ width: `${(p.value / total) * 100}%` }} title={`${p.name}: ${brl(p.value)}`} />
        ))}
      </div>
      <ul className="space-y-1.5 text-sm">
        {parts.map((p, i) => (
          <li key={p.name} className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-sm shrink-0', SERIES[i])} aria-hidden />
            <span className="truncate">{p.name}</span>
            <span className="ml-auto font-medium">{brl(p.value)}</span>
            <span className="w-10 text-right text-muted-foreground">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

function RankingTable({ rankings, formatter }: { rankings: { agentId: string; agentName: string; rank: number; value: number }[]; formatter: (v: number) => string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Posição</TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead className="text-right">Resultado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.slice(0, 8).map(item => (
          <TableRow key={item.agentId} className={cn(item.rank === 1 && item.value > 0 && 'bg-accent/60 hover:bg-accent/60')}>
            <TableCell className="font-semibold text-muted-foreground">{item.rank}º</TableCell>
            <TableCell className="font-medium">{item.agentName}</TableCell>
            <TableCell className="text-right font-semibold">{formatter(item.value)}</TableCell>
          </TableRow>
        ))}
        {rankings.length === 0 && (
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Ainda não há resultados neste período.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function Highlights({ rankings }: { rankings: ReturnType<typeof useAgentRankingsRange> }) {
  const items = [
    { label: 'Maior faturamento', leader: rankings.byRevenue[0], format: brl },
    { label: 'Mais vendas', leader: rankings.byClosed[0], format: (v: number) => `${v} ${v === 1 ? 'venda' : 'vendas'}` },
    { label: 'Mais comparecimentos', leader: rankings.byAttended[0], format: (v: number) => `${v}` },
    { label: 'Maior conversão', leader: rankings.byConversion[0], format: (v: number) => `${v}%` },
    { label: 'Mais indicações', leader: rankings.byReferrals[0], format: (v: number) => `${v}` },
  ];
  return (
    <dl className="divide-y divide-border">
      {items.map(it => {
        const has = it.leader && it.leader.value > 0;
        return (
          <div key={it.label} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
            <dt className="text-muted-foreground">{it.label}</dt>
            <dd className="text-right">
              {has ? <><span className="font-medium">{it.leader.agentName}</span> <span className="font-semibold">{it.format(it.leader.value)}</span></> : <span className="text-muted-foreground">Sem resultado ainda</span>}
            </dd>
          </div>
        );
      })}
    </dl>
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

  const funnelKeys = kpiCards.slice(0, 4);
  const teamRevenue = activeMetrics.reduce((s, m) => s + m.revenue, 0);
  const shownAgents = [...activeMetrics].sort((a, b) => b.revenue - a.revenue);

  return (
    <AppLayout title="Call Center">
      <div className="space-y-4">
        {/* Cabeçalho + filtros */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {isAdmin ? 'Equipe do call center' : `Olá, ${fullName?.split(' ')[0]}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {periodLabels[period]}, {businessDays} {businessDays === 1 ? 'dia útil' : 'dias úteis'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Select value={selectedAgent || 'all'} onValueChange={(v) => setSelectedAgent(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[200px]" aria-label="Atendente"><SelectValue placeholder="Todos os atendentes" /></SelectTrigger>
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
              <Button asChild variant="outline" size="sm" className="gap-2 h-10">
                <Link to="/configuracoes"><Settings className="h-4 w-4" aria-hidden /> Gerenciar atendentes</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Funil do período + indicações */}
        <Card className="monday-card overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-border">
            {funnelKeys.map((k, i) => (
              <div key={k.key} className="relative p-4">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{isLoading ? '–' : totals[k.key] ?? 0}</p>
                {i < funnelKeys.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-card text-muted-foreground z-10" aria-hidden />
                )}
              </div>
            ))}
            <div className="p-4 bg-muted/40">
              <p className="text-sm text-muted-foreground">Indicações</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{isLoading ? '–' : totals.referrals ?? 0}</p>
            </div>
          </div>
        </Card>

        {showTeam && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="monday-card lg:col-span-1">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Faturamento do call center</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">{brl(teamRevenue)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeMetrics.length} {activeMetrics.length === 1 ? 'atendente ativo' : 'atendentes ativos'}. Receita dos leads de cada atendente.
                </p>
                <RevenueShare agents={activeMetrics} />
              </CardContent>
            </Card>
            <Card className="monday-card lg:col-span-2">
              <CardContent className="px-5 py-3">
                <h3 className="text-sm font-semibold pt-1 pb-1">Destaques do período</h3>
                <Highlights rankings={rankings} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Desempenho por atendente: tabela para comparar lado a lado */}
        {showTeam && (
          <Card className="monday-card">
            <CardContent className="p-0">
              <h3 className="px-5 pt-4 pb-2 text-sm font-semibold">Desempenho por atendente</h3>
              {isLoading ? (
                <div className="h-40 m-5 rounded-md bg-muted/60 animate-pulse" />
              ) : shownAgents.length === 0 ? (
                <p className="px-5 pb-6 text-sm text-muted-foreground">Nenhum atendente ativo. Cadastre a equipe em Gerenciar atendentes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[820px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-5 sticky left-0 bg-card">Atendente</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Agend.</TableHead>
                        <TableHead className="text-right">Compar.</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                        <TableHead className="text-right">Comparec. (%)</TableHead>
                        <TableHead className="text-right">Fechamento</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right pr-5">Ticket médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shownAgents.map(a => (
                        <TableRow key={a.agentId} className={cn(a.agentId === topAgentId && a.revenue > 0 && 'bg-accent/60 hover:bg-accent/60')}>
                          <TableCell className="pl-5 font-medium sticky left-0 bg-card">{a.agentName}</TableCell>
                          <TableCell className="text-right">{a.leadsReceived}</TableCell>
                          <TableCell className="text-right">{a.appointmentsScheduled}</TableCell>
                          <TableCell className="text-right">{a.attendedAppointments}</TableCell>
                          <TableCell className="text-right">{a.closed}</TableCell>
                          <TableCell className="text-right">{a.conversionRate}%</TableCell>
                          <TableCell className="text-right">{a.attendanceRate}%</TableCell>
                          <TableCell className="text-right">{a.closingRate}%</TableCell>
                          <TableCell className="text-right font-semibold">{brl(a.revenue)}</TableCell>
                          <TableCell className="text-right pr-5">{a.closed > 0 ? brl(a.revenue / a.closed) : '–'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ranking */}
        <Card className="monday-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">Ranking</h3>
            <Tabs defaultValue="revenue">
              <TabsList className="flex flex-wrap h-auto justify-start">
                <TabsTrigger value="revenue">Faturamento</TabsTrigger>
                <TabsTrigger value="closed">Vendas</TabsTrigger>
                <TabsTrigger value="ticket">Ticket médio</TabsTrigger>
                <TabsTrigger value="attended">Comparecimentos</TabsTrigger>
                <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
                <TabsTrigger value="conversion">Conversão</TabsTrigger>
                <TabsTrigger value="referrals">Indicações</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue" className="mt-4"><RankingTable rankings={rankings.byRevenue} formatter={brl} /></TabsContent>
              <TabsContent value="closed" className="mt-4"><RankingTable rankings={rankings.byClosed} formatter={v => `${v}`} /></TabsContent>
              <TabsContent value="ticket" className="mt-4"><RankingTable rankings={ticketRanking} formatter={brl} /></TabsContent>
              <TabsContent value="attended" className="mt-4"><RankingTable rankings={rankings.byAttended} formatter={v => `${v}`} /></TabsContent>
              <TabsContent value="appointments" className="mt-4"><RankingTable rankings={rankings.byAppointments} formatter={v => `${v}`} /></TabsContent>
              <TabsContent value="conversion" className="mt-4"><RankingTable rankings={rankings.byConversion} formatter={v => `${v}%`} /></TabsContent>
              <TabsContent value="referrals" className="mt-4"><RankingTable rankings={rankings.byReferrals} formatter={v => `${v}`} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
