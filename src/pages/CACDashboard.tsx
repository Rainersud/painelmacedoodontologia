import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { formatCurrency } from '@/lib/currency';
import { useAcquisitionCosts, useCACMetrics, COST_CATEGORIES, type AcquisitionCost } from '@/hooks/useAcquisitionCosts';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign,
  Users, Target, AlertTriangle, CheckCircle, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { chartGrid, chartAxis, SERIES, SERIES_OTHER } from '@/lib/chartStyle';

const categoryLabels: Record<string, string> = Object.fromEntries(
  COST_CATEGORIES.map(c => [c.value, c.label])
);

const categoryColors: Record<string, string> = {
  anuncios: SERIES[0],
  salarios_vendas: SERIES[1],
  comissoes: SERIES[2],
  ferramentas: SERIES[3],
  marketing_geral: SERIES[4],
  salarios_operacional: SERIES_OTHER,
  outros: SERIES_OTHER,
};

export default function CACDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const { isAdmin } = useAuth();
  const { costs, totalByCategory, totalCosts, isLoading, addCost, updateCost, deleteCost } = useAcquisitionCosts(selectedMonth);
  const { data: metrics, isLoading: metricsLoading } = useCACMetrics(selectedMonth);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<AcquisitionCost | null>(null);
  const [form, setForm] = useState({ category: '', description: '', amount: 0 });

  const handleSave = () => {
    if (!form.category || form.amount <= 0) {
      toast.error('Preencha categoria e valor');
      return;
    }
    if (editingCost) {
      updateCost.mutate({ id: editingCost.id, ...form });
    } else {
      addCost.mutate({ ...form, reference_month: format(selectedMonth, 'yyyy-MM-dd') });
    }
    setForm({ category: '', description: '', amount: 0 });
    setShowAddDialog(false);
    setEditingCost(null);
  };

  const openEdit = (cost: AcquisitionCost) => {
    setEditingCost(cost);
    setForm({ category: cost.category, description: cost.description || '', amount: cost.amount });
    setShowAddDialog(true);
  };

  // Chart data
  const pieData = totalByCategory.filter(c => c.total > 0).map(c => ({
    name: c.label.split(' (')[0],
    value: c.total,
    fill: categoryColors[c.value] || SERIES_OTHER,
  }));

  const barData = metrics ? [
    { name: 'CAC', value: metrics.cac, fill: 'hsl(var(--destructive))' },
    { name: 'Ticket Médio', value: metrics.ticketMedio, fill: 'hsl(var(--primary))' },
  ] : [];

  // Gauge percentage (0-100, capped)
  const gaugePercent = metrics && metrics.ticketMedio > 0
    ? Math.min(Math.max(((metrics.ticketMedio - metrics.cac) / metrics.ticketMedio) * 100, -100), 100)
    : 0;

  const gaugeData = [{ value: Math.abs(gaugePercent), fill: gaugePercent >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }];

  return (
    <AppLayout title="CAC & Financeiro">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">CAC & Análise Financeira</h2>
            <p className="text-muted-foreground text-sm">Custo de Aquisição de Cliente vs Ticket Médio</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setSelectedMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Alert Banner */}
        {metrics && metrics.salesCount > 0 && (
          <Card className={cn(
            "border-2",
            metrics.isProfitable
              ? "border-success/50 bg-success/5"
              : "border-destructive/50 bg-destructive/5"
          )}>
            <CardContent className="py-4 flex items-center gap-4">
              {metrics.isProfitable ? (
                <>
                  <CheckCircle className="h-8 w-8 text-success shrink-0" />
                  <div>
                    <p className="font-bold text-success text-lg">LUCRO NA VENDA</p>
                    <p className="text-sm text-muted-foreground">
                      Lucro de <span className="font-bold text-success">{formatCurrency(metrics.lucroPorVenda)}</span> por cliente adquirido
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
                  <div>
                    <p className="font-bold text-destructive text-lg">PREJUÍZO NA VENDA</p>
                    <p className="text-sm text-muted-foreground">
                      Prejuízo de <span className="font-bold text-destructive">{formatCurrency(Math.abs(metrics.lucroPorVenda))}</span> por cliente adquirido
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="monday-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground font-medium">CAC</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics?.cac || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Custo por cliente</p>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Ticket Médio</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics?.ticketMedio || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Receita por venda</p>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                {(metrics?.lucroPorVenda || 0) >= 0
                  ? <ArrowUpRight className="h-4 w-4 text-success" />
                  : <ArrowDownRight className="h-4 w-4 text-destructive" />
                }
                <span className="text-xs text-muted-foreground font-medium">Lucro/Venda</span>
              </div>
              <p className={cn("text-2xl font-bold", (metrics?.lucroPorVenda || 0) >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(metrics?.lucroPorVenda || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Líquido por cliente</p>
            </CardContent>
          </Card>
          <Card className="monday-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Clientes</span>
              </div>
              <p className="text-2xl font-bold">{metrics?.salesCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                De {metrics?.totalLeads || 0} leads ({(metrics?.conversionRate || 0).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CAC vs TM Bar Chart */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                CAC vs Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 && (barData[0].value > 0 || barData[1].value > 0) ? (
                <ChartContainer config={{ cac: { label: 'CAC' }, tm: { label: 'Ticket Médio' } }} className="h-[200px]">
                  <BarChart data={barData}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis {...chartAxis} dataKey="name" />
                    <YAxis {...chartAxis} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gauge */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Indicador Lucro/Prejuízo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              {metrics && metrics.salesCount > 0 ? (
                <>
                  <div className="relative h-[160px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%" cy="100%"
                        innerRadius="70%"
                        outerRadius="100%"
                        startAngle={180}
                        endAngle={0}
                        data={gaugeData}
                        barSize={16}
                      >
                        <RadialBar dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                      <p className={cn("text-2xl font-bold", gaugePercent >= 0 ? "text-success" : "text-destructive")}>
                        {gaugePercent >= 0 ? '+' : ''}{gaugePercent.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">margem</p>
                    </div>
                  </div>
                  <Badge className={cn("mt-2", gaugePercent >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {gaugePercent >= 0 ? 'Operação Lucrativa' : 'Operação no Prejuízo'}
                  </Badge>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem vendas no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Distribution Pie */}
          <Card className="monday-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <ChartContainer config={Object.fromEntries(pieData.map(d => [d.name, { label: d.name, color: d.fill }]))} className="h-[160px]">
                    <RechartsPie>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={false}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                    </RechartsPie>
                  </ChartContainer>
                  <div className="space-y-1 mt-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                          <span className="text-muted-foreground truncate max-w-[120px]">{d.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Nenhuma despesa cadastrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expense Management */}
        <Card className="monday-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Despesas de Aquisição</CardTitle>
            {isAdmin && (
              <Dialog open={showAddDialog} onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) { setEditingCost(null); setForm({ category: '', description: '', amount: 0 }); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCost ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {COST_CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <CurrencyInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
                    </div>
                    <div>
                      <Label>Descrição (opcional)</Label>
                      <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes da despesa" />
                    </div>
                    <Button onClick={handleSave} className="w-full" disabled={addCost.isPending || updateCost.isPending}>
                      {editingCost ? 'Salvar Alterações' : 'Adicionar Despesa'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {/* Category Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
              {totalByCategory.filter(c => c.total > 0).map(cat => (
                <div key={cat.value} className="p-2 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-[10px] text-muted-foreground truncate">{cat.label.split(' (')[0]}</p>
                  <p className="text-sm font-bold">{formatCurrency(cat.total)}</p>
                </div>
              ))}
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-[10px] text-primary font-medium">TOTAL GERAL</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(totalCosts)}</p>
              </div>
            </div>

            {/* Costs List */}
            {costs.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {costs.map(cost => (
                  <div key={cost.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {(categoryLabels[cost.category] || cost.category).split(' (')[0]}
                        </Badge>
                        <span className="font-semibold text-sm">{formatCurrency(cost.amount)}</span>
                      </div>
                      {cost.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{cost.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cost)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCost.mutate(cost.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma despesa cadastrada para este mês
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary Footer */}
        <Card className="monday-card bg-muted/30 border-border/50">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Investido</p>
                <p className="text-lg font-bold">{formatCurrency(metrics?.totalCosts || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(metrics?.totalRevenue || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className={cn("text-lg font-bold", (metrics?.totalRevenue || 0) > (metrics?.totalCosts || 0) ? "text-success" : "text-destructive")}>
                  {metrics && metrics.totalCosts > 0 ? `${((metrics.totalRevenue / metrics.totalCosts) * 100).toFixed(0)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                <p className="text-lg font-bold">{(metrics?.conversionRate || 0).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
