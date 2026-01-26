import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
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
  ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

type Period = 'diario' | 'semanal' | 'mensal';

const periodLabels: Record<Period, string> = {
  diario: 'Hoje',
  semanal: 'Esta Semana',
  mensal: 'Este Mês',
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>('mensal');
  const { data: metrics, isLoading } = useDashboardMetrics(period);

  const kpiCards = [
    {
      title: 'Leads Recebidos',
      value: metrics?.newLeads || 0,
      change: metrics?.newLeadsChange || 0,
      icon: Users,
      description: periodLabels[period],
      format: (v: number) => v.toString(),
    },
    {
      title: 'Leads Atendidos',
      value: metrics?.attendedLeads || 0,
      change: metrics?.attendedLeadsChange || 0,
      icon: Phone,
      description: `Taxa de ${metrics?.newLeads ? Math.round((metrics.attendedLeads / metrics.newLeads) * 100) : 0}%`,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Consultas Agendadas',
      value: metrics?.scheduledAppointments || 0,
      change: metrics?.scheduledAppointmentsChange || 0,
      icon: Calendar,
      description: periodLabels[period],
      format: (v: number) => v.toString(),
    },
    {
      title: 'Taxa de Conversão',
      value: metrics?.conversionRate || 0,
      change: metrics?.conversionRateChange || 0,
      icon: TrendingUp,
      description: 'Meta: 25%',
      format: (v: number) => `${v}%`,
    },
    {
      title: 'Receita Gerada',
      value: metrics?.revenue || 0,
      change: metrics?.revenueChange || 0,
      icon: DollarSign,
      description: periodLabels[period],
      format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
    },
    {
      title: 'Taxa Comparecimento',
      value: metrics?.attendanceRate || 0,
      change: metrics?.attendanceRateChange || 0,
      icon: UserCheck,
      description: 'Meta: 75%',
      format: (v: number) => `${v}%`,
    },
    {
      title: 'Tempo Médio Resposta',
      value: metrics?.avgResponseTime || 0,
      change: metrics?.avgResponseTimeChange || 0,
      icon: Clock,
      description: 'SLA: 5 min',
      format: (v: number) => `${v} min`,
      invertChange: true,
    },
    {
      title: 'ROI Marketing',
      value: metrics?.marketingROI || 0,
      change: metrics?.marketingROIChange || 0,
      icon: Target,
      description: 'Retorno sobre investimento',
      format: (v: number) => `${v}x`,
    },
  ];

  const getStatusBadge = (lead: { status: string }) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      novo_lead: { label: 'Novo', className: 'bg-chart-2/10 text-chart-2' },
      em_atendimento: { label: 'Atendendo', className: 'bg-warning/10 text-warning' },
      consulta_agendada: { label: 'Agendado', className: 'bg-primary/10 text-primary' },
      confirmado: { label: 'Confirmado', className: 'bg-success/10 text-success' },
      compareceu: { label: 'Compareceu', className: 'bg-success/20 text-success' },
      fechado: { label: 'Fechado', className: 'bg-success/30 text-success' },
    };
    return statusConfig[lead.status] || { label: lead.status, className: 'bg-muted text-muted-foreground' };
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="diario">Hoje</TabsTrigger>
            <TabsTrigger value="semanal">Semana</TabsTrigger>
            <TabsTrigger value="mensal">Mês</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KPI Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight">{kpi.format(kpi.value)}</div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {!isLoading && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      (kpi.invertChange ? kpi.change <= 0 : kpi.change >= 0)
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {(kpi.invertChange ? kpi.change <= 0 : kpi.change >= 0) ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {kpi.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leads vs Consultas Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Leads vs Consultas (Semana)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics?.leadsOverTime || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="leads" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Leads"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="consultas" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--success))', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Consultas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Taxa de Conversão Mensal (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
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
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value) => [`${value}%`, 'Taxa']}
                      />
                      <Bar 
                        dataKey="taxa" 
                        fill="hsl(var(--primary))" 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lead Sources Pie Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics?.leadsBySource || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
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
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value) => [`${value}%`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-2.5">
                {(metrics?.leadsBySource || []).map((source) => (
                  <div key={source.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-muted-foreground">{source.name}</span>
                    </div>
                    <span className="font-semibold">{source.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Leads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : (
                  (metrics?.recentLeads || []).map((lead, index) => {
                    const badge = getStatusBadge(lead);
                    return (
                      <div 
                        key={lead.id || index}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.source} • {lead.time}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${badge.className}`}>
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
      </div>
    </AppLayout>
  );
};

export default Dashboard;
