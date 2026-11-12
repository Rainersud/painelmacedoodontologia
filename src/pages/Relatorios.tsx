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
import { chartGrid, chartAxis, chartTooltipProps, originColor, SERIES_OTHER } from '@/lib/chartStyle';
import { FUNNEL_STAGES } from '@/types/crm';
import {
  ARRIVAL_SOURCE_LABELS, agentRevenue, bookedAppointments, conversionRate as conversionRate_, fetchMetricsData,
  leadOrigin, newLeads, normalizeStatus, summarize,
} from '@/lib/metrics';


export default function Relatorios() {
  const [period, setPeriod] = useState('30');

  const startDate = period === 'month' 
    ? startOfMonth(new Date()) 
    : subDays(new Date(), parseInt(period));
  const endDate = period === 'month' ? endOfMonth(new Date()) : new Date();

  const range = { start: startDate, end: endDate };

  // Todos os números pela camada única (as mesmas regras do Dashboard e do BI)
  const { data: metrics } = useQuery({
    queryKey: ['report-metrics', period],
    queryFn: () => fetchMetricsData(range),
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
  const leads = metrics ? newLeads(metrics.leads, range) : [];
  const summary = metrics ? summarize(metrics, range) : null;
  const totalLeads = summary?.newLeads ?? 0;
  const conversionRate = Math.round(summary?.conversionRate ?? 0);  // vendas ÷ novos leads
  const totalAppointments = summary?.booked ?? 0;                   // marcados no período
  const attendanceRate = Math.round(summary?.attendanceRate ?? 0);
  const totalRevenue = summary?.revenue ?? 0;                        // pagamentos recebidos

  // Leads by source
  const leadsBySource = leads.reduce((acc, lead) => {
    const k = leadOrigin(lead);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Cinco origens com cor própria; o resto vira "Outras origens" (cinza)
  const MAIN_ORIGINS = ['facebook', 'instagram', 'google', 'indicacao_pac', 'passou_na_frente'];
  const otherCount = Object.entries(leadsBySource).filter(([k]) => !MAIN_ORIGINS.includes(k)).reduce((s, [, n]) => s + n, 0);
  const sourceChartData = [
    ...MAIN_ORIGINS.filter(k => leadsBySource[k]).map(k => ({ name: ARRIVAL_SOURCE_LABELS[k] || k, value: leadsBySource[k], color: originColor(k) })),
    ...(otherCount ? [{ name: 'Outras origens', value: otherCount, color: SERIES_OTHER }] : []),
  ];

  // Leads by status (etapas com o mesmo nome do Funil)
  const leadsByStatus = leads.reduce((acc, lead) => {
    const k = String(normalizeStatus(lead.status) ?? 'novo_lead');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusLabels: Record<string, string> = {
    ...Object.fromEntries(FUNNEL_STAGES.map(st => [st.key, st.label])),
    em_atendimento: 'Em Atendimento',
    confirmado: 'Confirmado',
    nao_convertido: 'Não Convertido',
  };

  const statusChartData = Object.entries(leadsByStatus).map(([status, count]) => ({
    name: statusLabels[status] || status,
    count,
  }));

  // Agent performance
  const agentPerformance = profiles?.map(profile => {
    const id = profile.user_id;
    return {
      name: profile.full_name,
      leads: metrics ? newLeads(metrics.leads, range, id).length : 0,
      appointments: metrics ? bookedAppointments(metrics.appointments, range, id).length : 0,
      revenue: metrics ? agentRevenue(metrics.payments, metrics.leads, id, range) : 0,
      conversion: metrics ? Math.round(conversionRate_(metrics.leads, range, id)) : 0,
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
          <Card className="monday-card">
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
          <Card className="monday-card">
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
          <Card className="monday-card">
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
          <Card className="monday-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-warning-strong" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{attendanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Comparecimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="monday-card">
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
            <Card className="monday-card">
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
                      <Tooltip {...chartTooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card className="monday-card">
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
                      <CartesianGrid {...chartGrid} />
                      <XAxis {...chartAxis} type="number" />
                      <YAxis {...chartAxis} dataKey="name" 
                        type="category" 
                        width={120} />
                      <Tooltip {...chartTooltipProps} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card className="monday-card">
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
                            agent.conversion >= 50 ? 'bg-warning/10 text-warning-strong' :
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
