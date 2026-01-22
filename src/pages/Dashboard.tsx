import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalsWidget } from '@/components/goals/GoalsWidget';
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

// Mock data for charts
const leadsOverTime = [
  { name: 'Seg', leads: 12, consultas: 8 },
  { name: 'Ter', leads: 19, consultas: 14 },
  { name: 'Qua', leads: 15, consultas: 10 },
  { name: 'Qui', leads: 22, consultas: 18 },
  { name: 'Sex', leads: 28, consultas: 22 },
  { name: 'Sáb', leads: 18, consultas: 12 },
  { name: 'Dom', leads: 8, consultas: 5 },
];

const conversionByMonth = [
  { name: 'Jan', taxa: 62 },
  { name: 'Fev', taxa: 68 },
  { name: 'Mar', taxa: 72 },
  { name: 'Abr', taxa: 65 },
  { name: 'Mai', taxa: 78 },
  { name: 'Jun', taxa: 75 },
];

const leadsBySource = [
  { name: 'WhatsApp', value: 45, color: 'hsl(142, 70%, 45%)' },
  { name: 'Telefone', value: 25, color: 'hsl(199, 89%, 48%)' },
  { name: 'Instagram', value: 15, color: 'hsl(340, 75%, 55%)' },
  { name: 'Google Ads', value: 10, color: 'hsl(38, 92%, 50%)' },
  { name: 'Indicação', value: 5, color: 'hsl(262, 80%, 55%)' },
];

const kpiCards = [
  {
    title: 'Leads Recebidos',
    value: '248',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    description: 'Este mês',
  },
  {
    title: 'Leads Atendidos',
    value: '215',
    change: '+8%',
    changeType: 'positive' as const,
    icon: Phone,
    description: 'Taxa de 87%',
  },
  {
    title: 'Consultas Agendadas',
    value: '156',
    change: '+15%',
    changeType: 'positive' as const,
    icon: Calendar,
    description: 'Este mês',
  },
  {
    title: 'Taxa de Conversão',
    value: '72%',
    change: '+5%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    description: 'Meta: 70%',
  },
  {
    title: 'Receita Gerada',
    value: 'R$ 89.450',
    change: '+22%',
    changeType: 'positive' as const,
    icon: DollarSign,
    description: 'Este mês',
  },
  {
    title: 'Taxa Comparecimento',
    value: '85%',
    change: '-2%',
    changeType: 'negative' as const,
    icon: UserCheck,
    description: 'Meta: 90%',
  },
  {
    title: 'Tempo Médio Resposta',
    value: '4 min',
    change: '-15%',
    changeType: 'positive' as const,
    icon: Clock,
    description: 'SLA: 5 min',
  },
  {
    title: 'ROI Marketing',
    value: '4.2x',
    change: '+18%',
    changeType: 'positive' as const,
    icon: Target,
    description: 'Retorno sobre investimento',
  },
];

const Dashboard = () => {
  const { isAdmin } = useAuth();

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
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
                <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    kpi.changeType === 'positive' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {kpi.changeType === 'positive' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {kpi.change}
                  </span>
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
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadsOverTime}>
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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionByMonth}>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Goals Widget - Metas em Tempo Real */}
          <GoalsWidget />

          {/* Lead Sources Pie Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {leadsBySource.map((entry, index) => (
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
              </div>
              <div className="mt-4 space-y-2.5">
                {leadsBySource.map((source) => (
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
                {[
                  { name: 'Maria Silva', source: 'WhatsApp', time: '2 min', status: 'novo_lead' },
                  { name: 'João Santos', source: 'Telefone', time: '15 min', status: 'em_atendimento' },
                  { name: 'Ana Costa', source: 'Instagram', time: '1 hora', status: 'consulta_agendada' },
                  { name: 'Pedro Oliveira', source: 'Google Ads', time: '2 horas', status: 'confirmado' },
                  { name: 'Carla Lima', source: 'Indicação', time: '3 horas', status: 'compareceu' },
                ].map((lead, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.source} • {lead.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                      lead.status === 'novo_lead' ? 'bg-chart-2/10 text-chart-2' :
                      lead.status === 'em_atendimento' ? 'bg-warning/10 text-warning' :
                      lead.status === 'consulta_agendada' ? 'bg-primary/10 text-primary' :
                      lead.status === 'confirmado' ? 'bg-success/10 text-success' :
                      'bg-success/20 text-success'
                    }`}>
                      {lead.status === 'novo_lead' ? 'Novo' :
                       lead.status === 'em_atendimento' ? 'Atendendo' :
                       lead.status === 'consulta_agendada' ? 'Agendado' :
                       lead.status === 'confirmado' ? 'Confirmado' :
                       'Compareceu'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
