import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSalesMetrics, type SaleTypeMetrics } from '@/hooks/useSalesMetrics';
import { formatCurrency } from '@/lib/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MetricasVendas = () => {
  const [month, setMonth] = useState(new Date());
  const { data, isLoading } = useSalesMetrics(month);

  if (isLoading) {
    return (
      <AppLayout title="Métricas de Vendas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const { oneStep, twoStep, general, bestProfit, bestCac, bestTicket, bestConversion } = data;

  const comparisonItems = [
    { label: 'Maior Lucro por Cliente', best: bestProfit },
    { label: 'Menor CAC', best: bestCac },
    { label: 'Maior Ticket Médio', best: bestTicket },
    { label: 'Maior Conversão', best: bestConversion },
  ];

  const barData = [
    { name: 'Faturamento', '1 Etapa': oneStep.totalRevenue, '2 Etapas': twoStep.totalRevenue },
    { name: 'CAC', '1 Etapa': oneStep.cac, '2 Etapas': twoStep.cac },
    { name: 'Ticket Médio', '1 Etapa': oneStep.ticketMedio, '2 Etapas': twoStep.ticketMedio },
    { name: 'Lucro/Cliente', '1 Etapa': oneStep.lucroPorCliente, '2 Etapas': twoStep.lucroPorCliente },
  ];

  const pieData = [
    { name: '1 Etapa', value: oneStep.salesCount, fill: 'hsl(var(--primary))' },
    { name: '2 Etapas', value: twoStep.salesCount, fill: 'hsl(var(--chart-2))' },
    { name: 'Sem tipo', value: general.salesCount - oneStep.salesCount - twoStep.salesCount, fill: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0);

  const alerts: { type: 'danger' | 'warning' | 'success'; message: string }[] = [];
  if (oneStep.salesCount > 0 && oneStep.cac > oneStep.ticketMedio)
    alerts.push({ type: 'danger', message: '🔴 Prejuízo na Venda em 1 Etapa: CAC maior que Ticket Médio' });
  if (twoStep.salesCount > 0 && twoStep.cac > twoStep.ticketMedio)
    alerts.push({ type: 'danger', message: '🔴 Prejuízo na Venda em 2 Etapas: CAC maior que Ticket Médio' });
  if (bestProfit !== 'equal' && oneStep.salesCount > 0 && twoStep.salesCount > 0) {
    const bestLabel = bestProfit === '1_etapa' ? '1 Etapa' : '2 Etapas';
    alerts.push({ type: 'success', message: `🟢 Modelo mais lucrativo identificado: ${bestLabel}` });
  }
  if ((oneStep.salesCount > 0 && twoStep.salesCount === 0) || (twoStep.salesCount > 0 && oneStep.salesCount === 0)) {
    alerts.push({ type: 'warning', message: '⚠️ Apenas um modelo de venda utilizado. Compare para tomar melhores decisões.' });
  }

  return (
    <AppLayout title="Métricas de Vendas">
      <div className="space-y-6 pb-8">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded-lg border text-sm font-medium ${
                alert.type === 'danger' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                alert.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
                'bg-success/10 border-success/30 text-success'
              }`}>
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Executive Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Vendas" value={String(general.salesCount)} />
          <SummaryCard label="Vendas 1 Etapa" value={String(oneStep.salesCount)} subtitle={general.salesCount > 0 ? `${((oneStep.salesCount / general.salesCount) * 100).toFixed(0)}%` : '0%'} />
          <SummaryCard label="Vendas 2 Etapas" value={String(twoStep.salesCount)} subtitle={general.salesCount > 0 ? `${((twoStep.salesCount / general.salesCount) * 100).toFixed(0)}%` : '0%'} />
          <SummaryCard label="Faturamento Total" value={formatCurrency(general.totalRevenue)} />
        </div>

        {/* Side by side metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MetricsCard title="Venda em 1 Etapa" metrics={oneStep} highlight="primary" />
          <MetricsCard title="Venda em 2 Etapas" metrics={twoStep} highlight="chart-2" />
        </div>

        {/* Comparison block */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Análise Comparativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comparisonItems.map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <Badge variant={item.best === 'equal' ? 'secondary' : 'default'} className={
                    item.best === '1_etapa' ? 'bg-primary text-primary-foreground' :
                    item.best === '2_etapas' ? 'bg-chart-2 text-white' : ''
                  }>
                    {item.best === '1_etapa' ? '1 Etapa' : item.best === '2_etapas' ? '2 Etapas' : 'Empate'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparativo Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="1 Etapa" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="2 Etapas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

function SummaryCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function MetricsCard({ title, metrics, highlight }: { title: string; metrics: SaleTypeMetrics; highlight: string }) {
  const isProfitable = metrics.ticketMedio > metrics.cac && metrics.salesCount > 0;
  return (
    <Card className={`border-${highlight}/30`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          {title}
          {metrics.salesCount > 0 && (
            isProfitable 
              ? <Badge className="bg-success/10 text-success border-success/30"><TrendingUp className="h-3 w-3 mr-1" />Lucro</Badge>
              : <Badge className="bg-destructive/10 text-destructive border-destructive/30"><TrendingDown className="h-3 w-3 mr-1" />Prejuízo</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricRow label="Vendas" value={String(metrics.salesCount)} />
        <MetricRow label="Faturamento" value={formatCurrency(metrics.totalRevenue)} />
        <MetricRow label="Custo Total" value={formatCurrency(metrics.totalCosts)} />
        <MetricRow label="CAC" value={formatCurrency(metrics.cac)} />
        <MetricRow label="Ticket Médio" value={formatCurrency(metrics.ticketMedio)} />
        <MetricRow label="Lucro/Cliente" value={formatCurrency(metrics.lucroPorCliente)} highlight={metrics.lucroPorCliente >= 0} />
        <MetricRow label="ROI" value={`${metrics.roi.toFixed(1)}%`} />
        <MetricRow label="Conversão" value={`${metrics.conversionRate.toFixed(1)}%`} />
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight !== undefined ? (highlight ? 'text-success' : 'text-destructive') : ''}`}>{value}</span>
    </div>
  );
}

export default MetricasVendas;
