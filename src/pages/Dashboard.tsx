import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useReferralDashboard } from '@/hooks/useReferrals';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { 
  Users, 
  Phone, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  UserCheck,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Gift,
  UserPlus,
  HeartHandshake
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { KeyMetricsWidget } from '@/components/dashboard/KeyMetricsWidget';
import { ClinicGoalsWidget } from '@/components/dashboard/ClinicGoalsWidget';
import { ReferralRankingWidget } from '@/components/crm/ReferralRankingWidget';
import { TreatmentRankingWidget } from '@/components/dashboard/TreatmentRankingWidget';
import { FunnelConversionWidget } from '@/components/dashboard/FunnelConversionWidget';

type Period = 'diario' | 'semanal' | 'mensal';

const periodLabels: Record<Period, string> = {
  diario: 'Hoje',
  semanal: 'Esta Semana',
  mensal: 'Este Mês',
};

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

const Dashboard = () => {
  const [period, setPeriod] = useState<Period>('mensal');
  const { data: metrics, isLoading } = useDashboardMetrics(period);
  const { data: referralMetrics } = useReferralDashboard();

  const kpiCards = [
    {
      title: 'Leads Recebidos',
      value: metrics?.newLeads || 0,
      change: metrics?.newLeadsChange || 0,
      icon: Users,
      description: periodLabels[period],
      format: (v: number) => v.toString(),
      color: mondayColors.blue,
      bgClass: 'bg-[hsl(213_94%_58%)]',
    },
    {
      title: 'Leads Atendidos',
      value: metrics?.attendedLeads || 0,
      change: metrics?.attendedLeadsChange || 0,
      icon: Phone,
      description: `Taxa de ${metrics?.newLeads ? Math.round((metrics.attendedLeads / metrics.newLeads) * 100) : 0}%`,
      format: (v: number) => v.toString(),
      color: mondayColors.green,
      bgClass: 'bg-[hsl(156_72%_45%)]',
    },
    {
      title: 'Consultas Agendadas',
      value: metrics?.scheduledAppointments || 0,
      change: metrics?.scheduledAppointmentsChange || 0,
      icon: Calendar,
      description: periodLabels[period],
      format: (v: number) => v.toString(),
      color: mondayColors.purple,
      bgClass: 'bg-[hsl(270_75%_60%)]',
    },
    {
      title: 'Taxa de Conversão',
      value: metrics?.conversionRate || 0,
      change: metrics?.conversionRateChange || 0,
      icon: TrendingUp,
      description: 'Meta: 25%',
      format: (v: number) => `${v}%`,
      color: mondayColors.orange,
      bgClass: 'bg-[hsl(32_95%_55%)]',
    },
    {
      title: 'Receita Gerada',
      value: metrics?.revenue || 0,
      change: metrics?.revenueChange || 0,
      icon: DollarSign,
      description: periodLabels[period],
      format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
      color: mondayColors.teal,
      bgClass: 'bg-[hsl(180_70%_50%)]',
    },
    {
      title: 'Taxa Comparecimento',
      value: metrics?.attendanceRate || 0,
      change: metrics?.attendanceRateChange || 0,
      icon: UserCheck,
      description: 'Meta: 75%',
      format: (v: number) => `${v}%`,
      color: mondayColors.pink,
      bgClass: 'bg-[hsl(340_82%_60%)]',
    },
    {
      title: 'Tempo Médio Resposta',
      value: metrics?.avgResponseTime || 0,
      change: metrics?.avgResponseTimeChange || 0,
      icon: Clock,
      description: 'SLA: 5 min',
      format: (v: number) => `${v} min`,
      invertChange: true,
      color: mondayColors.yellow,
      bgClass: 'bg-[hsl(45_93%_58%)]',
    },
    {
      title: 'ROI Marketing',
      value: metrics?.marketingROI || 0,
      change: metrics?.marketingROIChange || 0,
      icon: Target,
      description: 'Retorno sobre investimento',
      format: (v: number) => `${v}x`,
      color: mondayColors.blue,
      bgClass: 'bg-[hsl(213_94%_58%)]',
    },
  ];

  const getStatusBadge = (lead: { status: string }) => {
    const statusConfig: Record<string, { label: string; bgColor: string }> = {
      novo_lead: { label: 'Novo', bgColor: mondayColors.blue },
      em_atendimento: { label: 'Atendendo', bgColor: mondayColors.orange },
      consulta_agendada: { label: 'Agendado', bgColor: mondayColors.purple },
      confirmado: { label: 'Confirmado', bgColor: mondayColors.teal },
      compareceu: { label: 'Compareceu', bgColor: mondayColors.green },
      fechado: { label: 'Fechado', bgColor: mondayColors.green },
    };
    return statusConfig[lead.status] || { label: lead.status, bgColor: mondayColors.blue };
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header with Period Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Visão Geral</h1>
            <p className="text-muted-foreground">Acompanhe os principais indicadores</p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="bg-card border shadow-sm">
              <TabsTrigger value="diario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Hoje
              </TabsTrigger>
              <TabsTrigger value="semanal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Semana
              </TabsTrigger>
              <TabsTrigger value="mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Cards Grid - Monday.com Style */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi, index) => (
            <Card 
              key={kpi.title} 
              className="monday-card overflow-hidden group"
            >
              <div 
                className="h-1.5 w-full" 
                style={{ backgroundColor: kpi.color }}
              />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    {isLoading ? (
                      <Skeleton className="h-9 w-24" />
                    ) : (
                      <p className="text-3xl font-bold">{kpi.format(kpi.value)}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {!isLoading && (
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                          (kpi.invertChange ? kpi.change <= 0 : kpi.change >= 0)
                            ? 'bg-success/15 text-success' 
                            : 'bg-destructive/15 text-destructive'
                        )}>
                          {(kpi.invertChange ? kpi.change <= 0 : kpi.change >= 0) ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(kpi.change)}%
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{kpi.description}</span>
                    </div>
                  </div>
                  <div 
                    className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform")}
                    style={{ backgroundColor: kpi.color }}
                  >
                    <kpi.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leads Performance Chart */}
          <Card className="monday-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Performance de Leads</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.leadsOverTime || []}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={mondayColors.blue} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={mondayColors.blue} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={mondayColors.green} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={mondayColors.green} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="leads" 
                        stroke={mondayColors.blue}
                        strokeWidth={2}
                        fill="url(#colorLeads)"
                        name="Leads"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="consultas" 
                        stroke={mondayColors.green}
                        strokeWidth={2}
                        fill="url(#colorConsultas)"
                        name="Consultas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: mondayColors.blue }} />
                  <span className="text-sm text-muted-foreground">Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: mondayColors.green }} />
                  <span className="text-sm text-muted-foreground">Consultas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate Chart */}
          <Card className="monday-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Taxa de Conversão Mensal</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics?.conversionByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value) => [`${value}%`, 'Taxa']}
                      />
                      <Bar 
                        dataKey="taxa" 
                        fill={mondayColors.purple}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <KeyMetricsWidget 
            cpl={25}
            custoAgendamento={100}
            custoFechamento={430}
            breakEven={2}
          />
          <ClinicGoalsWidget 
            currentLeads={metrics?.newLeads || 0}
            currentAgendamentos={metrics?.scheduledAppointments || 0}
            currentComparecimentos={0}
            currentFechamentos={0}
            currentFaturamento={metrics?.revenue || 0}
            period={period}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lead Sources Pie Chart */}
          <Card className="monday-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Origem dos Leads</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics?.leadsBySource || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {(metrics?.leadsBySource || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                        formatter={(value) => [`${value}%`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(metrics?.leadsBySource || []).map((source) => (
                  <div key={source.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-muted-foreground truncate">{source.name}</span>
                    <span className="font-semibold ml-auto">{source.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="lg:col-span-2 monday-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))
                ) : (
                  (metrics?.recentLeads || []).slice(0, 5).map((lead, index) => {
                    const badge = getStatusBadge(lead);
                    return (
                      <div 
                        key={lead.id || index}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: badge.bgColor }}
                          >
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.source} • {lead.time}</p>
                          </div>
                        </div>
                        <span 
                          className="text-xs px-3 py-1.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: badge.bgColor }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })
                )}
                {!isLoading && (!metrics?.recentLeads || metrics.recentLeads.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum lead recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Discount Metrics */}
        <Card className="monday-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-warning" />
              Descontos por Comparecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const allLeads = metrics?.allLeads || [];
                const liberados = allLeads.filter((l: any) => l.attendance_discount_status === 'liberado').length;
                const cancelados = allLeads.filter((l: any) => l.attendance_discount_status === 'cancelado').length;
                const elegiveis = allLeads.filter((l: any) => (l.attendance_discount_status || 'elegivel') === 'elegivel').length;
                const impacto = allLeads
                  .filter((l: any) => l.attendance_discount_status === 'liberado')
                  .reduce((sum: number, l: any) => sum + (Number(l.treatment_value || l.estimated_value || 0) * 0.05), 0);
                return [
                  { label: 'Descontos Liberados', value: liberados, icon: UserCheck, color: 'hsl(var(--success))' },
                  { label: 'Cancelados por Falta', value: cancelados, icon: Target, color: 'hsl(var(--destructive))' },
                  { label: 'Elegíveis', value: elegiveis, icon: Clock, color: 'hsl(var(--warning))' },
                  { label: 'Impacto Financeiro', value: `R$ ${impacto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'hsl(var(--chart-5))' },
                ];
              })().map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-muted/30 text-center">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${item.color}20` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <p className="text-xl font-bold">{typeof item.value === 'number' ? item.value : item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Metrics */}
        <Card className="monday-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-chart-5" />
              Desempenho das Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Indicações no Mês', value: referralMetrics?.totalReferralsMonth || 0, icon: UserPlus, color: 'hsl(var(--chart-5))' },
                { label: 'Total Indicações', value: referralMetrics?.totalReferralsAll || 0, icon: Users, color: 'hsl(var(--primary))' },
                { label: 'Convertidas em Venda', value: referralMetrics?.convertedByReferral || 0, icon: TrendingUp, color: 'hsl(var(--success))' },
                { label: 'Recompensas Pagas', value: `R$ ${(referralMetrics?.totalRewardsPaid || 0).toLocaleString('pt-BR')}`, icon: Gift, color: 'hsl(var(--warning))' },
                { label: 'Faturamento Indicações', value: `R$ ${(referralMetrics?.revenueFromReferrals || 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'hsl(var(--success))' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-muted/30 text-center">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${item.color}20` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <p className="text-xl font-bold">{typeof item.value === 'number' ? item.value : item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Funnel Conversion Analytics */}
        <FunnelConversionWidget />

        {/* Treatment Ranking */}
        <TreatmentRankingWidget />

        {/* Referral Ranking */}
        <ReferralRankingWidget />
      </div>
    </AppLayout>
  );
};

export default Dashboard;