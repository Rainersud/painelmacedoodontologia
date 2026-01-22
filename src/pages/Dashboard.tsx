import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Phone, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  UserCheck,
  Clock,
  Target
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
  { name: 'WhatsApp', value: 45, color: '#25D366' },
  { name: 'Telefone', value: 25, color: '#3B82F6' },
  { name: 'Instagram', value: 15, color: '#E4405F' },
  { name: 'Google Ads', value: 10, color: '#FBBC05' },
  { name: 'Indicação', value: 5, color: '#8B5CF6' },
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
      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${
                    kpi.changeType === 'positive' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Leads vs Consultas (Semana)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="leads" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Leads"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="consultas" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                      name="Consultas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Taxa de Conversão Mensal (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}%`, 'Taxa']}
                    />
                    <Bar 
                      dataKey="taxa" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lead Sources Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {leadsBySource.map((source) => (
                  <div key={source.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-muted-foreground">{source.name}</span>
                    </div>
                    <span className="font-medium">{source.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Leads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Maria Silva', source: 'WhatsApp', time: '2 min', status: 'novo_lead' },
                  { name: 'João Santos', source: 'Telefone', time: '15 min', status: 'em_atendimento' },
                  { name: 'Ana Costa', source: 'Instagram', time: '1 hora', status: 'consulta_agendada' },
                  { name: 'Pedro Oliveira', source: 'Google Ads', time: '2 horas', status: 'confirmado' },
                  { name: 'Carla Lima', source: 'Indicação', time: '3 horas', status: 'compareceu' },
                ].map((lead, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.source} • {lead.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      lead.status === 'novo_lead' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'em_atendimento' ? 'bg-yellow-100 text-yellow-700' :
                      lead.status === 'consulta_agendada' ? 'bg-purple-100 text-purple-700' :
                      lead.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                      'bg-emerald-100 text-emerald-700'
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
