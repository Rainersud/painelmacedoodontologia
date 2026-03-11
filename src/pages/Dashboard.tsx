import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useReferralDashboard } from '@/hooks/useReferrals';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { useStagnationAlerts, useAppointmentMetrics } from '@/hooks/useStagnationAlerts';
import { FUNNEL_STAGES } from '@/types/crm';
import { 
  Users, Calendar, TrendingUp, DollarSign, UserCheck, Target,
  ArrowRight, Eye, Briefcase, BarChart3, XCircle, CheckCircle,
  HeartHandshake, ArrowUpRight, ArrowDownRight, Clock, CreditCard
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

// ─── Visão Geral Tab ────────────────────────────────────────────────────────

function VisaoGeralTab() {
  const { data: metrics, isLoading } = useDashboardMetrics('mensal');
  const { data: allLeads } = useCRMLeads();
  const { data: referralMetrics } = useReferralDashboard();
  const { data: appointmentData } = useAppointmentMetrics();

  const computedMetrics = useMemo(() => {
    const leads = allLeads || [];
    const comparecimentos = leads.filter(l => l.status === 'compareceu').length + (appointmentData?.attended || 0);
    const faltas = leads.filter(l => l.status === 'faltou' || l.status === 'nao_compareceu').length;
    const vendas = leads.filter(l => l.status === 'fechado' || l.status === 'concluido').length;
    const indicacoes = leads.filter(l => l.source === 'indicacao').length;

    return { comparecimentos, faltas, vendas, indicacoes };
  }, [allLeads, appointmentData]);

  const cards = [
    {
      title: 'Leads do Mês',
      value: metrics?.newLeads || 0,
      icon: Users,
      color: 'hsl(213 94% 58%)',
      change: metrics?.newLeadsChange || 0,
    },
    {
      title: 'Consultas Agendadas',
      value: metrics?.scheduledAppointments || 0,
      icon: Calendar,
      color: 'hsl(270 75% 60%)',
      change: metrics?.scheduledAppointmentsChange || 0,
    },
    {
      title: 'Comparecimentos',
      value: computedMetrics.comparecimentos,
      icon: CheckCircle,
      color: 'hsl(156 72% 45%)',
    },
    {
      title: 'Faltas',
      value: computedMetrics.faltas,
      icon: XCircle,
      color: 'hsl(0 84% 60%)',
    },
    {
      title: 'Vendas Realizadas',
      value: computedMetrics.vendas,
      icon: DollarSign,
      color: 'hsl(180 70% 50%)',
    },
    {
      title: 'Indicações Recebidas',
      value: computedMetrics.indicacoes,
      icon: HeartHandshake,
      color: 'hsl(262 80% 55%)',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="monday-card overflow-hidden group">
          <div className="h-1.5 w-full" style={{ backgroundColor: card.color }} />
          <CardContent className="p-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
                style={{ backgroundColor: card.color }}
              >
                <card.icon className="h-6 w-6" />
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-bold">{card.value}</p>
              )}
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              {card.change !== undefined && card.change !== 0 && !isLoading && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                  card.change >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                )}>
                  {card.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(card.change)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Comercial Tab ──────────────────────────────────────────────────────────

function ComercialTab() {
  const { data: allLeads, isLoading } = useCRMLeads();

  const funnelData = useMemo(() => {
    if (!allLeads) return { stages: [], conversions: [] };

    const stageOrder: Array<{ key: string; label: string; color: string }> = [
      { key: 'novo_lead', label: 'Novos Leads', color: 'hsl(213 94% 58%)' },
      { key: 'em_atendimento', label: 'Em Contato', color: 'hsl(32 95% 55%)' },
      { key: 'agendou', label: 'Agendados', color: 'hsl(270 75% 60%)' },
      { key: 'compareceu', label: 'Compareceram', color: 'hsl(156 72% 45%)' },
      { key: 'orcamentos_abertos', label: 'Orçamentos', color: 'hsl(180 70% 50%)' },
      { key: 'fechado', label: 'Fechados', color: 'hsl(142 70% 45%)' },
      { key: 'followup_1', label: 'Follow-up', color: 'hsl(45 93% 58%)' },
    ];

    const stages = stageOrder.map(s => {
      let count: number;
      if (s.key === 'followup_1') {
        count = allLeads.filter(l =>
          ['followup_1', 'followup_2', 'followup_3', 'followup_4'].includes(l.status)
        ).length;
      } else {
        count = allLeads.filter(l => l.status === s.key).length;
      }
      return { ...s, count };
    });

    // Conversion rates between key stages
    const novos = allLeads.length || 1;
    const agendados = allLeads.filter(l =>
      ['agendou', 'consulta_agendada', 'confirmado', 'compareceu', 'orcamentos_abertos', 'fechado', 'concluido', 'tratamento_andamento', 'pos_venda'].includes(l.status)
    ).length;
    const compareceram = allLeads.filter(l =>
      ['compareceu', 'orcamentos_abertos', 'fechado', 'concluido', 'tratamento_andamento', 'pos_venda'].includes(l.status)
    ).length;
    const vendas = allLeads.filter(l =>
      ['fechado', 'concluido', 'tratamento_andamento', 'pos_venda'].includes(l.status)
    ).length;

    const conversions = [
      {
        from: 'Lead',
        to: 'Agendamento',
        rate: Math.round((agendados / novos) * 100),
        color: 'hsl(270 75% 60%)',
      },
      {
        from: 'Agendamento',
        to: 'Comparecimento',
        rate: agendados > 0 ? Math.round((compareceram / agendados) * 100) : 0,
        color: 'hsl(156 72% 45%)',
      },
      {
        from: 'Comparecimento',
        to: 'Venda',
        rate: compareceram > 0 ? Math.round((vendas / compareceram) * 100) : 0,
        color: 'hsl(142 70% 45%)',
      },
    ];

    return { stages, conversions };
  }, [allLeads]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Funnel Stage Counts */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {funnelData.stages.map((stage) => (
          <Card key={stage.key} className="monday-card overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: stage.color }} />
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stage.count}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">{stage.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Between Stages */}
      <Card className="monday-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Taxa de Conversão por Etapa</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {funnelData.conversions.map((conv) => (
              <div
                key={conv.from + conv.to}
                className="relative p-5 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">{conv.from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{conv.to}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold" style={{ color: conv.color }}>
                    {conv.rate}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${conv.rate}%`, backgroundColor: conv.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Bar Chart */}
      <Card className="monday-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Distribuição do Funil</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData.stages} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28} name="Leads">
                  {funnelData.stages.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Performance Tab ────────────────────────────────────────────────────────

function PerformanceTab() {
  const { data: allLeads } = useCRMLeads();

  // Revenue by period (today, week, month) from appointments
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['performance-revenue'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('revenue')
          .not('attended_at', 'is', null)
          .gte('attended_at', todayStart)
          .lte('attended_at', todayEnd),
        supabase
          .from('appointments')
          .select('revenue')
          .not('attended_at', 'is', null)
          .gte('attended_at', weekStart)
          .lte('attended_at', weekEnd),
        supabase
          .from('appointments')
          .select('revenue')
          .not('attended_at', 'is', null)
          .gte('attended_at', monthStart)
          .lte('attended_at', monthEnd),
      ]);

      const sum = (arr: any[] | null) => (arr || []).reduce((s, a) => s + (a.revenue || 0), 0);

      return {
        today: sum(todayRes.data),
        week: sum(weekRes.data),
        month: sum(monthRes.data),
      };
    },
    refetchInterval: 60000,
  });

  const performanceMetrics = useMemo(() => {
    const leads = allLeads || [];
    const compareceram = leads.filter(l =>
      ['compareceu', 'orcamentos_abertos', 'fechado', 'concluido', 'tratamento_andamento', 'pos_venda'].includes(l.status)
    ).length;
    const vendas = leads.filter(l =>
      ['fechado', 'concluido', 'tratamento_andamento', 'pos_venda'].includes(l.status)
    ).length;

    const taxaConversao = compareceram > 0 ? Math.round((vendas / compareceram) * 100) : 0;
    const faturamento = revenueData?.month || 0;
    const ticketMedio = vendas > 0 ? Math.round(faturamento / vendas) : 0;

    return { compareceram, vendas, taxaConversao, ticketMedio };
  }, [allLeads, revenueData]);

  return (
    <div className="space-y-6">
      {/* Faturamento Card */}
      <Card className="monday-card overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[hsl(156_72%_45%)] to-[hsl(180_70%_50%)]" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            <CardTitle className="text-base font-semibold">Faturamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Hoje', value: revenueData?.today || 0, color: 'hsl(213 94% 58%)' },
              { label: 'Semana', value: revenueData?.week || 0, color: 'hsl(270 75% 60%)' },
              { label: 'Mês', value: revenueData?.month || 0, color: 'hsl(156 72% 45%)' },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-xl bg-muted/30 border border-border/50 text-center">
                <p className="text-xs font-medium text-muted-foreground mb-2">{item.label}</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-32 mx-auto" />
                ) : (
                  <p className="text-3xl font-bold" style={{ color: item.color }}>
                    {formatCurrency(item.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion Rate */}
        <Card className="monday-card overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: 'hsl(32 95% 55%)' }} />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'hsl(32 95% 55%)' }}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">% Atendimento → Venda</p>
                <p className="text-xs text-muted-foreground">
                  {performanceMetrics.compareceram} atendidos → {performanceMetrics.vendas} vendas
                </p>
              </div>
            </div>
            <p className="text-5xl font-bold" style={{ color: 'hsl(32 95% 55%)' }}>
              {performanceMetrics.taxaConversao}%
            </p>
            <div className="mt-4 h-3 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(performanceMetrics.taxaConversao, 100)}%`, backgroundColor: 'hsl(32 95% 55%)' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="monday-card overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: 'hsl(180 70% 50%)' }} />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'hsl(180 70% 50%)' }}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-xs text-muted-foreground">
                  Faturamento ÷ {performanceMetrics.vendas} vendas
                </p>
              </div>
            </div>
            <p className="text-5xl font-bold" style={{ color: 'hsl(180 70% 50%)' }}>
              {formatCurrency(performanceMetrics.ticketMedio)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('visao-geral');
  useStagnationAlerts();

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Painel estratégico da clínica</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border shadow-sm">
            <TabsTrigger value="visao-geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Eye className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="comercial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Briefcase className="h-4 w-4" />
              Comercial
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-6">
            <VisaoGeralTab />
          </TabsContent>
          <TabsContent value="comercial" className="mt-6">
            <ComercialTab />
          </TabsContent>
          <TabsContent value="performance" className="mt-6">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
