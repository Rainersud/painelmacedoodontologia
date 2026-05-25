import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, AlertTriangle, Calendar, Wallet, BarChart3 } from 'lucide-react';
import { useRevenueProjection, useCACMonthly, useLTVMonthly, useGlobalCAC } from '@/hooks/useRevenueProjection';
import { formatCurrency } from '@/lib/currency';

export function FinancialDashboard() {
  const { data: projection, isLoading: projLoading } = useRevenueProjection();
  const { data: cacData, isLoading: cacLoading } = useCACMonthly();
  const { data: ltvData, isLoading: ltvLoading } = useLTVMonthly();
  const { data: globalCAC } = useGlobalCAC();
  const [periodFilter, setPeriodFilter] = useState('all');

  const getFilteredTotal = () => {
    if (!projection) return 0;
    switch (periodFilter) {
      case '30': return projection.next30;
      case '60': return projection.next60;
      case '90': return projection.next90;
      default: return projection.totalFuturo;
    }
  };

  const formatTooltip = (value: number) => formatCurrency(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard Financeiro
          </h2>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de faturamento, aquisição e LTV
          </p>
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Total geral</SelectItem>
            <SelectItem value="30">Próximos 30 dias</SelectItem>
            <SelectItem value="60">Próximos 60 dias</SelectItem>
            <SelectItem value="90">Próximos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Faturamento Futuro</span>
            </div>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(getFilteredTotal())}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {projection?.totalCount || 0} parcelas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Comercial 1 (CAC)</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(globalCAC?.cac || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CAC médio · {globalCAC?.salesCount || 0} fechamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-chart-5/30 bg-chart-5/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-chart-5" />
              <span className="text-xs font-medium text-muted-foreground">Comercial 2 (LTV)</span>
            </div>
            <p className="text-2xl font-bold text-chart-5">
              {formatCurrency(ltvData?.reduce((sum, m) => sum + m.total, 0) || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total vendido (recorrência)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Concentration Alert */}
      {projection?.concentrationAlert && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">
            <strong>⚠️ Alta concentração de recebimentos em {projection.concentrationAlert}</strong> — considere diversificar os vencimentos.
          </p>
        </div>
      )}

      {/* Chart 1: Future Revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-success" />
            Faturamento Futuro (Parcelas a Vencer)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
          ) : projection?.monthlyProjections && projection.monthlyProjections.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projection.monthlyProjections}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'A receber']} />
                  <Bar dataKey="total" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="A receber" />
                </BarChart>
              </ResponsiveContainer>
              {/* Monthly breakdown */}
              <ScrollArea className="max-h-[200px] mt-3">
                <div className="space-y-1">
                  {projection.monthlyProjections.map(m => (
                    <div key={m.month} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="font-medium capitalize">{m.label}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{m.count} parcelas</Badge>
                        <span className="font-semibold text-success">{formatCurrency(m.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma parcela pendente encontrada.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts 2 & 3: CAC and LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 2: Comercial 1 (CAC) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Comercial 1 – Entrada de Caixa (CAC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cacLoading ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
            ) : cacData && cacData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cacData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Recebido']} />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Recebido" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado de vendas (Comercial 1).
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Comercial 2 (LTV) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-5" />
              Comercial 2 – LTV (Total Vendido)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ltvLoading ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
            ) : ltvData && ltvData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={ltvData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Vendido']} />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.15} strokeWidth={2} name="Vendido" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado de LTV (Comercial 2).
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No-date warning */}
      {projection && projection.noDateCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-muted bg-muted/30">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            {projection.noDateCount} parcela(s) sem data de vencimento definida ({formatCurrency(projection.noDateTotal)}) — não incluídas na projeção mensal.
          </p>
        </div>
      )}
    </div>
  );
}
