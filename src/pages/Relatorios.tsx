import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react';

const sourceColors: Record<string, string> = {
  whatsapp: 'hsl(142, 70%, 45%)',
  telefone: 'hsl(199, 89%, 48%)',
  instagram: 'hsl(340, 75%, 55%)',
  facebook: 'hsl(221, 44%, 41%)',
  google_ads: 'hsl(38, 92%, 50%)',
  site: 'hsl(262, 80%, 55%)',
  indicacao: 'hsl(280, 60%, 55%)',
  outro: 'hsl(240, 5%, 50%)',
};

const sourceLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_ads: 'Google Ads',
  site: 'Site',
  indicacao: 'Indicação',
  outro: 'Outro',
};

export default function Relatorios() {
  const [period, setPeriod] = useState('30');

  const startDate = period === 'month' 
    ? startOfMonth(new Date()) 
    : subDays(new Date(), parseInt(period));
  const endDate = period === 'month' ? endOfMonth(new Date()) : new Date();

  const { data: leads } = useQuery({
    queryKey: ['report-leads', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ['report-appointments', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalLeads = leads?.length || 0;
  const convertedLeads = leads?.filter(l => ['consulta_agendada', 'confirmado', 'compareceu'].includes(l.status)).length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  
  const totalAppointments = appointments?.length || 0;
  const attendedAppointments = appointments?.filter(a => a.attended_at).length || 0;
  const attendanceRate = totalAppointments > 0 ? Math.round((attendedAppointments / totalAppointments) * 100) : 0;
  
  const totalRevenue = appointments?.reduce((sum, a) => sum + (a.revenue || 0), 0) || 0;

  // Leads by source
  const leadsBySource = leads?.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const sourceChartData = Object.entries(leadsBySource).map(([source, count]) => ({
    name: sourceLabels[source] || source,
    value: count,
    color: sourceColors[source] || 'hsl(240, 5%, 50%)',
  }));

  // Leads by status
  const leadsByStatus = leads?.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusLabels: Record<string, string> = {
    novo_lead: 'Novo Lead',
    em_atendimento: 'Em Atendimento',
    consulta_agendada: 'Agendado',
    confirmado: 'Confirmado',
    compareceu: 'Compareceu',
    nao_compareceu: 'Não Compareceu',
    nao_convertido: 'Não Convertido',
  };

  const statusChartData = Object.entries(leadsByStatus).map(([status, count]) => ({
    name: statusLabels[status] || status,
    count,
  }));

  // Agent performance
  const agentPerformance = profiles?.map(profile => {
    const agentLeads = leads?.filter(l => l.assigned_agent_id === profile.user_id) || [];
    const agentAppointments = appointments?.filter(a => a.agent_id === profile.user_id) || [];
    const agentRevenue = agentAppointments.reduce((sum, a) => sum + (a.revenue || 0), 0);
    const agentConverted = agentLeads.filter(l => ['consulta_agendada', 'confirmado', 'compareceu'].includes(l.status)).length;
    const agentConversion = agentLeads.length > 0 ? Math.round((agentConverted / agentLeads.length) * 100) : 0;

    return {
      name: profile.full_name,
      leads: agentLeads.length,
      appointments: agentAppointments.length,
      revenue: agentRevenue,
      conversion: agentConversion,
    };
  }).sort((a, b) => b.revenue - a.revenue) || [];

  // Sanitize CSV values to prevent formula injection attacks
  const sanitizeCSVValue = (value: unknown): string => {
    const str = String(value ?? '');
    // Escape formulas by prefixing dangerous characters with single quote
    // Characters =, +, -, @, tab, carriage return can trigger formula execution in Excel/Sheets
    if (/^[=+\-@\t\r]/.test(str)) {
      return "'" + str;
    }
    // Escape quotes and wrap if contains comma, newline, or quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      return;
    }
    const headers = Object.keys(data[0]).map(sanitizeCSVValue).join(',');
    const rows = data.map(row => 
      Object.values(row).map(sanitizeCSVValue).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Relatórios e Análises</h2>
              <p className="text-sm text-muted-foreground">
                Visualize métricas e exporte dados
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Summary */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                  <p className="text-xs text-muted-foreground">Total de Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Comparecimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Receita Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sources">Por Origem</TabsTrigger>
            <TabsTrigger value="status">Por Status</TabsTrigger>
            <TabsTrigger value="agents">Por Agente</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Leads por Origem</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(sourceChartData, 'leads-por-origem')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {sourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Leads por Status</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(statusChartData, 'leads-por-status')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Performance por Agente</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(agentPerformance, 'performance-agentes')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead className="text-center">Leads</TableHead>
                      <TableHead className="text-center">Agendamentos</TableHead>
                      <TableHead className="text-center">Conversão</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentPerformance.map((agent, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-center">{agent.leads}</TableCell>
                        <TableCell className="text-center">{agent.appointments}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            agent.conversion >= 70 ? 'bg-success/10 text-success' :
                            agent.conversion >= 50 ? 'bg-warning/10 text-warning' :
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {agent.conversion}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {agent.revenue.toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
