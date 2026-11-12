import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, ExternalLink, CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown, Users, Target, DollarSign, BarChart3, Gift, Award, FileText, BookOpen, MessageSquare } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMeetings, useMeetingActionPlans, useMeetingAnnotations, useMeetingTrainingLinks } from '@/hooks/useMeetings';
import { useCACMetrics } from '@/hooks/useAcquisitionCosts';
import { useSalesMetrics } from '@/hooks/useSalesMetrics';
import { useClinicGoalsPanel } from '@/hooks/useClinicGoalsPanel';
import { useAllAgentsBonus } from '@/hooks/useAgentBonus';
import { useReferralDashboard } from '@/hooks/useReferrals';
import { formatCurrency } from '@/lib/currency';
import { safeUrl, isValidHttpUrl } from '@/lib/sanitize';
import { toast } from 'sonner';

const METRIC_OPTIONS = [
  { value: 'indicacoes', label: 'Indicações' },
  { value: 'metas', label: 'Metas da Clínica' },
  { value: 'bonus', label: 'Bônus por Metas' },
  { value: 'incentivo', label: 'Plano de Incentivo' },
  { value: 'cac', label: 'CAC & Financeiro' },
  { value: 'vendas', label: 'Métricas de Vendas' },
  { value: 'financeiro', label: 'Financeiro Geral' },
];

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  concluido: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};

function MetricCard({ icon: Icon, title, value, subtitle, status }: { icon: any; title: string; value: string; subtitle?: string; status?: 'green' | 'red' | 'yellow' }) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      status === 'green' && "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
      status === 'red' && "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
      status === 'yellow' && "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
      !status && "border-border bg-card"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", status === 'green' && "text-green-600", status === 'red' && "text-red-600", status === 'yellow' && "text-yellow-600", !status && "text-muted-foreground")} />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Reunioes() {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>();
  const [newMeetingDate, setNewMeetingDate] = useState<Date>();
  const [newMeetingPeriod, setNewMeetingPeriod] = useState('semanal');
  const [createOpen, setCreateOpen] = useState(false);

  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Integrated metrics
  const { data: cacMetrics } = useCACMetrics();
  const { data: salesMetrics } = useSalesMetrics();
  const { data: referralDashboard } = useReferralDashboard();

  // Metas atuais (meta_settings), as mesmas de Metas da Clínica e Plano de Incentivo
  const { data: monthPanel } = useClinicGoalsPanel('mes');
  const { data: weekPanel } = useClinicGoalsPanel('semana');
  const { data: teamBonus } = useAllAgentsBonus('semanal');
  const GOAL_KEYS = ['leads', 'agendamentos', 'comparecimentos', 'vendas', 'faturamento', 'ticket_medio'];
  const toColor = (st: string) => (st === 'healthy' ? 'green' : st === 'warning' ? 'yellow' : 'red');
  const goalsProgress = (monthPanel?.metrics ?? [])
    .filter(m => GOAL_KEYS.includes(m.key))
    .map(m => ({ type: m.key, label: m.label, current: m.display, target: m.targetDisplay, percentage: m.percentage, status: toColor(m.status) }));
  const weekGoals = (weekPanel?.metrics ?? []).filter(m => ['leads', 'agendamentos', 'comparecimentos', 'vendas'].includes(m.key));
  const incentiveData = weekPanel ? {
    goals: weekGoals.map(m => ({ bonusEarned: m.current >= m.target })),
    weeklySummary: {
      allGoalsMet: weekGoals.length > 0 && weekGoals.every(m => m.current >= m.target),
      earnedBonus: (teamBonus ?? []).reduce((sum, a) => sum + a.earnedBonus, 0),
      totalBonus: (teamBonus ?? []).reduce((sum, a) => sum + a.totalBonus, 0),
    },
  } : undefined;

  const handleCreate = () => {
    if (!newMeetingDate) return;
    createMeeting.mutate({
      meeting_date: format(newMeetingDate, 'yyyy-MM-dd'),
      period_type: newMeetingPeriod,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewMeetingDate(undefined);
      },
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reuniões Semanais</h1>
            <p className="text-sm text-muted-foreground">Gestão estratégica e acompanhamento de métricas</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Reunião</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Reunião</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Data da Reunião</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left mt-1", !newMeetingDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newMeetingDate ? format(newMeetingDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={newMeetingDate} onSelect={setNewMeetingDate} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Período</label>
                  <Select value={newMeetingPeriod} onValueChange={setNewMeetingPeriod}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={!newMeetingDate || createMeeting.isPending} className="w-full">
                  Criar Reunião
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Meeting selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião criada. Clique em "Nova Reunião" para começar.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {meetings.map(m => (
                  <Button
                    key={m.id}
                    variant={selectedMeetingId === m.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMeetingId(m.id)}
                    className="text-xs"
                  >
                    {format(new Date(m.meeting_date + 'T12:00:00'), "dd/MM/yyyy")} - {m.period_type === 'semanal' ? 'Semanal' : 'Mensal'}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected meeting content */}
        {selectedMeeting && (
          <MeetingContent
            meeting={selectedMeeting}
            cacMetrics={cacMetrics}
            salesMetrics={salesMetrics}
            goalsProgress={goalsProgress || []}
            referralDashboard={referralDashboard}
            incentiveData={incentiveData}
            onUpdateNotes={(notes) => updateMeeting.mutate({ id: selectedMeeting.id, general_notes: notes })}
            onDelete={() => { deleteMeeting.mutate(selectedMeeting.id); setSelectedMeetingId(undefined); }}
          />
        )}
      </div>
    </AppLayout>
  );
}

function MeetingContent({ meeting, cacMetrics, salesMetrics, goalsProgress, referralDashboard, incentiveData, onUpdateNotes, onDelete }: {
  meeting: any;
  cacMetrics: any;
  salesMetrics: any;
  goalsProgress: any[];
  referralDashboard: any;
  incentiveData: any;
  onUpdateNotes: (notes: string) => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState('metricas');
  const [notes, setNotes] = useState(meeting.general_notes || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Reunião {meeting.period_type === 'semanal' ? 'Semanal' : 'Mensal'} — {format(new Date(meeting.meeting_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 sm:w-full">
            <TabsTrigger value="metricas" className="text-xs sm:text-sm">Métricas</TabsTrigger>
            <TabsTrigger value="acoes" className="text-xs sm:text-sm">Planos de Ação</TabsTrigger>
            <TabsTrigger value="anotacoes" className="text-xs sm:text-sm">Anotações</TabsTrigger>
            <TabsTrigger value="treinamento" className="text-xs sm:text-sm">Treinamento</TabsTrigger>
            <TabsTrigger value="resumo" className="text-xs sm:text-sm">Resumo</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="metricas">
          <MetricsPanel cacMetrics={cacMetrics} salesMetrics={salesMetrics} goalsProgress={goalsProgress} referralDashboard={referralDashboard} incentiveData={incentiveData} />
        </TabsContent>

        <TabsContent value="acoes">
          <ActionPlansPanel meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="anotacoes">
          <AnnotationsPanel meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="treinamento">
          <TrainingLinksPanel meetingId={meeting.id} />
        </TabsContent>

        <TabsContent value="resumo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Anotações Gerais da Reunião</CardTitle>
              <CardDescription>Resumo, decisões tomadas, direcionamentos e feedback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Registre o resumo da reunião, decisões tomadas, direcionamentos estratégicos e feedback da equipe..."
                className="min-h-[200px]"
              />
              <Button onClick={() => onUpdateNotes(notes)} size="sm">Salvar Anotações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricsPanel({ cacMetrics, salesMetrics, goalsProgress, referralDashboard, incentiveData }: any) {
  const goalTypeLabels: Record<string, string> = {
    leads_atendidos: 'Leads Atendidos', consultas_agendadas: 'Consultas Agendadas',
    taxa_conversao: 'Taxa de Conversão', taxa_comparecimento: 'Taxa de Comparecimento',
    receita: 'Receita', resgatados: 'Resgatados', fechados: 'Fechados',
  };

  return (
    <div className="space-y-6">
      {/* CAC & Financeiro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> CAC & Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          {cacMetrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard icon={DollarSign} title="CAC" value={formatCurrency(cacMetrics.cac)} status={cacMetrics.isProfitable ? 'green' : 'red'} />
              <MetricCard icon={TrendingUp} title="Ticket Médio" value={formatCurrency(cacMetrics.ticketMedio)} status={cacMetrics.isProfitable ? 'green' : 'red'} />
              <MetricCard icon={DollarSign} title="Lucro/Venda" value={formatCurrency(cacMetrics.lucroPorVenda)} status={cacMetrics.lucroPorVenda > 0 ? 'green' : 'red'} subtitle={cacMetrics.isProfitable ? '🟢 Lucro na Venda' : '🔴 Prejuízo na Venda'} />
              <MetricCard icon={BarChart3} title="Faturamento" value={formatCurrency(cacMetrics.totalRevenue)} />
              <MetricCard icon={DollarSign} title="Custos Totais" value={formatCurrency(cacMetrics.totalCosts)} />
              <MetricCard icon={Users} title="Clientes Adquiridos" value={String(cacMetrics.salesCount)} />
              <MetricCard icon={Users} title="Total de Leads" value={String(cacMetrics.totalLeads)} />
              <MetricCard icon={TrendingUp} title="Taxa Conversão" value={`${cacMetrics.conversionRate.toFixed(1)}%`} status={cacMetrics.conversionRate >= 10 ? 'green' : cacMetrics.conversionRate >= 5 ? 'yellow' : 'red'} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando métricas...</p>
          )}
        </CardContent>
      </Card>

      {/* Vendas 1 etapa vs 2 etapas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Métricas de Vendas (1 Etapa vs 2 Etapas)</CardTitle>
        </CardHeader>
        <CardContent>
          {salesMetrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard icon={BarChart3} title="Vendas Totais" value={String(salesMetrics.general.salesCount)} />
                <MetricCard icon={TrendingUp} title="1 Etapa" value={String(salesMetrics.oneStep.salesCount)} subtitle={`Receita: ${formatCurrency(salesMetrics.oneStep.totalRevenue)}`} />
                <MetricCard icon={TrendingDown} title="2 Etapas" value={String(salesMetrics.twoStep.salesCount)} subtitle={`Receita: ${formatCurrency(salesMetrics.twoStep.totalRevenue)}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn("rounded-lg border p-3", salesMetrics.bestProfit === '1_etapa' ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-border")}>
                  <p className="text-xs text-muted-foreground">Lucro/Cliente (1 Etapa)</p>
                  <p className="font-bold">{formatCurrency(salesMetrics.oneStep.lucroPorCliente)}</p>
                  {salesMetrics.bestProfit === '1_etapa' && <Badge className="mt-1 text-xs bg-green-600">🟢 Melhor</Badge>}
                </div>
                <div className={cn("rounded-lg border p-3", salesMetrics.bestProfit === '2_etapas' ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-border")}>
                  <p className="text-xs text-muted-foreground">Lucro/Cliente (2 Etapas)</p>
                  <p className="font-bold">{formatCurrency(salesMetrics.twoStep.lucroPorCliente)}</p>
                  {salesMetrics.bestProfit === '2_etapas' && <Badge className="mt-1 text-xs bg-green-600">🟢 Melhor</Badge>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      {/* Metas da Clínica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Metas da Clínica</CardTitle>
        </CardHeader>
        <CardContent>
          {goalsProgress && goalsProgress.length > 0 ? (
            <div className="space-y-3">
              {goalsProgress.map((g: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.label || goalTypeLabels[g.type] || g.type}</span>
                    <div className="flex items-center gap-2">
                      <span>{g.current}/{g.target}</span>
                      <Badge className={cn("text-xs", g.status === 'green' && "bg-green-600", g.status === 'yellow' && "bg-yellow-600", g.status === 'red' && "bg-red-600")}>
                        {g.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={g.percentage} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma meta configurada</p>
          )}
        </CardContent>
      </Card>

      {/* Indicações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Gift className="h-4 w-4" /> Indicações</CardTitle>
        </CardHeader>
        <CardContent>
          {referralDashboard ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard icon={Gift} title="Indicações (Mês)" value={String(referralDashboard.totalReferralsMonth)} />
              <MetricCard icon={Users} title="Convertidas" value={String(referralDashboard.convertedByReferral)} status={referralDashboard.convertedByReferral > 0 ? 'green' : undefined} />
              <MetricCard icon={DollarSign} title="Receita Indicações" value={formatCurrency(referralDashboard.revenueFromReferrals)} />
              <MetricCard icon={DollarSign} title="Bônus Pagos" value={formatCurrency(referralDashboard.totalRewardsPaid)} />
              <MetricCard icon={Clock} title="Bônus Pendentes" value={formatCurrency(referralDashboard.totalBonusPending)} status={referralDashboard.totalBonusPending > 0 ? 'yellow' : undefined} />
              <MetricCard icon={Users} title="Total Geral" value={String(referralDashboard.totalReferralsAll)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>

      {/* Plano de Incentivo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Plano de Incentivo</CardTitle>
        </CardHeader>
        <CardContent>
          {incentiveData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={Target} title="Metas da Semana" value={String(incentiveData.goals.length)} />
                <MetricCard icon={CheckCircle2} title="Metas Batidas" value={String(incentiveData.goals.filter((g: any) => g.bonusEarned).length)} status={incentiveData.weeklySummary.allGoalsMet ? 'green' : 'yellow'} />
                <MetricCard icon={DollarSign} title="Bônus da Equipe (semana)" value={formatCurrency(incentiveData.weeklySummary.earnedBonus)} />
                <MetricCard icon={DollarSign} title="Bônus Total Possível" value={formatCurrency(incentiveData.weeklySummary.totalBonus)} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionPlansPanel({ meetingId }: { meetingId: string }) {
  const { plans, addPlan, updatePlan, deletePlan } = useMeetingActionPlans(meetingId);
  const [desc, setDesc] = useState('');
  const [responsible, setResponsible] = useState('');
  const [execDate, setExecDate] = useState('');
  const [relatedMetric, setRelatedMetric] = useState('');

  const handleAdd = () => {
    if (!desc || !responsible) return;
    addPlan.mutate({
      meeting_id: meetingId,
      description: desc,
      responsible,
      execution_date: execDate || null,
      completion_date: null,
      status: 'pendente',
      related_metric: relatedMetric || null,
    }, {
      onSuccess: () => { setDesc(''); setResponsible(''); setExecDate(''); setRelatedMetric(''); },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Planos de Ação</CardTitle>
        <CardDescription>Defina ações, responsáveis e prazos vinculados às métricas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
          <Input placeholder="Descrição da ação" value={desc} onChange={e => setDesc(e.target.value)} />
          <Input placeholder="Responsável" value={responsible} onChange={e => setResponsible(e.target.value)} />
          <Input type="date" placeholder="Data de execução" value={execDate} onChange={e => setExecDate(e.target.value)} />
          <Select value={relatedMetric} onValueChange={setRelatedMetric}>
            <SelectTrigger><SelectValue placeholder="Métrica relacionada" /></SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!desc || !responsible || addPlan.isPending} className="sm:col-span-2">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Plano
          </Button>
        </div>

        <Separator />

        {/* List */}
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum plano de ação cadastrado</p>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => (
              <div key={plan.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{plan.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>👤 {plan.responsible}</span>
                    {plan.execution_date && <span>📅 {format(new Date(plan.execution_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>}
                    {plan.related_metric && (
                      <Badge variant="outline" className="text-xs">{METRIC_OPTIONS.find(o => o.value === plan.related_metric)?.label || plan.related_metric}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={plan.status} onValueChange={(s) => updatePlan.mutate({ id: plan.id, status: s, ...(s === 'concluido' ? { completion_date: new Date().toISOString().split('T')[0] } : {}) })}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deletePlan.mutate(plan.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnnotationsPanel({ meetingId }: { meetingId: string }) {
  const { annotations, addAnnotation } = useMeetingAnnotations(meetingId);
  const [metricKey, setMetricKey] = useState('');
  const [content, setContent] = useState('');

  const handleAdd = () => {
    if (!metricKey || !content) return;
    addAnnotation.mutate({ metric_key: metricKey, content }, {
      onSuccess: () => { setContent(''); setMetricKey(''); },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Anotações Estratégicas</CardTitle>
        <CardDescription>Registre observações e comentários para cada métrica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 p-4 border rounded-lg bg-muted/30">
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger><SelectValue placeholder="Selecione a métrica" /></SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Escreva sua anotação estratégica..." value={content} onChange={e => setContent(e.target.value)} />
          <Button onClick={handleAdd} disabled={!metricKey || !content || addAnnotation.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Anotação
          </Button>
        </div>

        <Separator />

        {annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma anotação registrada</p>
        ) : (
          <div className="space-y-3">
            {annotations.map(ann => (
              <div key={ann.id} className="p-3 border rounded-lg space-y-1">
                <Badge variant="outline" className="text-xs">{METRIC_OPTIONS.find(o => o.value === ann.metric_key)?.label || ann.metric_key}</Badge>
                <p className="text-sm">{ann.content}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(ann.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrainingLinksPanel({ meetingId }: { meetingId: string }) {
  const { links, addLink, deleteLink } = useMeetingTrainingLinks(meetingId);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!title || !url) return;
    if (!isValidHttpUrl(url)) { toast.error("Informe uma URL válida (http/https)"); return; }
    addLink.mutate({ title, url }, {
      onSuccess: () => { setTitle(''); setUrl(''); },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Treinamento da Equipe</CardTitle>
        <CardDescription>Links de treinamentos, vídeos e documentos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
          <Input placeholder="Título do conteúdo" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
          <Button onClick={handleAdd} disabled={!title || !url || addLink.isPending} className="sm:col-span-2">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Link
          </Button>
        </div>

        <Separator />

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum link adicionado</p>
        ) : (
          <div className="space-y-2">
            {links.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <a href={safeUrl(link.url) ?? "#"} target="_blank" rel="noopener noreferrer nofollow" className="text-sm font-medium text-primary hover:underline">
                    {link.title}
                  </a>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteLink.mutate(link.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
