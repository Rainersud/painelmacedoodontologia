import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import { useCACMonthly, useLTVMonthly, useGlobalCAC } from '@/hooks/useRevenueProjection';
import { formatCurrency } from '@/lib/currency';

export function FinancialDashboard() {
  const { data: cacData, isLoading: cacLoading } = useCACMonthly();
  const { data: ltvData, isLoading: ltvLoading } = useLTVMonthly();
  const { data: globalCAC } = useGlobalCAC();

  // Faturamento Comercial 1 = soma de pagamentos pagos sem upsell_opportunity_id (vendas realizadas no Comercial 1)
  const faturamentoCom1 = useMemo(
    () => (cacData || []).reduce((sum, m) => sum + m.total, 0),
    [cacData]
  );
  const ltvTotal = useMemo(
    () => (ltvData || []).reduce((sum, m) => sum + m.total, 0),
    [ltvData]
  );

  // Merge data for comparative chart by month
  const comparativeData = useMemo(() => {
    const map: Record<string, { label: string; month: string; com1: number; com2: number }> = {};
    (cacData || []).forEach(m => {
      map[m.month] = { label: m.label, month: m.month, com1: m.total, com2: 0 };
    });
    (ltvData || []).forEach(m => {
      if (!map[m.month]) map[m.month] = { label: m.label, month: m.month, com1: 0, com2: 0 };
      map[m.month].com2 = m.total;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [cacData, ltvData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Dashboard Financeiro
        </h2>
        <p className="text-sm text-muted-foreground">
          Comparativo entre Comercial 1 (Aquisição) e Comercial 2 (LTV)
        </p>
      </div>

      {/* KPI Cards: Faturamento, CAC, LTV */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Faturamento (Comercial 1)</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(faturamentoCom1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Vendas realizadas (pagas)</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">CAC</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(globalCAC?.cac || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {globalCAC?.salesCount || 0} fechamentos · custo médio por aquisição
            </p>
          </CardContent>
        </Card>

        <Card className="border-chart-5/30 bg-chart-5/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-chart-5" />
              <span className="text-xs font-medium text-muted-foreground">LTV (Comercial 2)</span>
            </div>
            <p className="text-2xl font-bold text-chart-5">{formatCurrency(ltvTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Recorrência pós-venda</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparative Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparativo: Comercial 1 vs Comercial 2 (LTV)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(cacLoading || ltvLoading) ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
          ) : comparativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparativeData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="com1" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Comercial 1" />
                <Bar dataKey="com2" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Comercial 2 (LTV)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de faturamento ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
