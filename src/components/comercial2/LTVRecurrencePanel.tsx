import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, DollarSign, Users, Target, Lightbulb, BarChart3 } from 'lucide-react';
import { useLTVMetrics, type PeriodFilter, type SaleTypeFilter } from '@/hooks/useLTVMetrics';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const HEALTH_STYLES = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
} as const;

const HEALTH_LABELS = {
  success: '🟢 Lucrativo',
  warning: '🟡 Atenção',
  destructive: '🔴 Prejuízo',
} as const;

const PERIOD_OPTIONS = [
  { value: 'todos', label: 'Todo período' },
  { value: 'mes', label: 'Mês atual' },
  { value: 'trimestre', label: 'Trimestre atual' },
  { value: 'ano', label: 'Ano atual' },
] as const;

const SALE_TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: '1_etapa', label: '1 Etapa' },
  { value: '2_etapas', label: '2 Etapas' },
] as const;

export function LTVRecurrencePanel() {
  const [period, setPeriod] = useState<PeriodFilter>('todos');
  const [saleType, setSaleType] = useState<SaleTypeFilter>('todos');
  const { data: metrics, isLoading } = useLTVMetrics(period, saleType);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const maxRevenue = Math.max(...metrics.groups.map(g => g.totalRevenue), 1);

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Análise de LTV por Recorrência</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALE_TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="monday-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Total Pacientes</p>
                <p className="text-lg font-bold">{metrics.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="monday-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              <div>
                <p className="text-[10px] text-muted-foreground">Receita Total</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="monday-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              <div>
                <p className="text-[10px] text-muted-foreground">LTV Médio</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.overallLTV)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="monday-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-chart-5" />
              <div>
                <p className="text-[10px] text-muted-foreground">Grupo + Lucrativo</p>
                <p className="text-sm font-bold truncate">{metrics.bestProfitGroup || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📊 Geração de Caixa por Recorrência
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs whitespace-nowrap font-semibold">Recorrência</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap font-semibold">Clientes</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap font-semibold">%</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap font-semibold">Ticket Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap font-semibold">LTV Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap font-semibold">CAC Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap font-semibold">Lucro Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap font-semibold">Receita Total</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap font-semibold">Saúde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.groups.map((group) => (
                  <TableRow
                    key={group.label}
                    className={cn(
                      group.clientCount === 0 && 'opacity-40',
                      group.label === metrics.bestProfitGroup && 'bg-success/5 border-l-2 border-l-success'
                    )}
                  >
                    <TableCell className="font-medium text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {group.label}
                        {group.label === metrics.bestProfitGroup && (
                          <span className="text-[10px]">⭐</span>
                        )}
                        {group.label === metrics.bestLTVGroup && group.label !== metrics.bestProfitGroup && (
                          <span className="text-[10px]">📈</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{group.clientCount}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {group.percentOfTotal.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(group.avgTicket)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(group.avgLTV)}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{formatCurrency(group.avgCAC)}</TableCell>
                    <TableCell className={cn(
                      'text-right text-sm font-bold',
                      group.avgProfit > 0 ? 'text-success' : group.avgProfit < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(group.avgProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{formatCurrency(group.totalRevenue)}</span>
                        {group.clientCount > 0 && (
                          <Progress
                            value={(group.totalRevenue / maxRevenue) * 100}
                            className="h-1 w-16"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {group.clientCount > 0 ? (
                        <Badge className={cn('text-[9px]', HEALTH_STYLES[group.healthColor])}>
                          {HEALTH_LABELS[group.healthColor]}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights */}
      {metrics.insights.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Insights Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border text-sm"
              >
                <p className="text-muted-foreground">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
