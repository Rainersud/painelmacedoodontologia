import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Users, Target, Lightbulb } from 'lucide-react';
import { useLTVMetrics } from '@/hooks/useLTVMetrics';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const HEALTH_STYLES = {
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
} as const;

const HEALTH_LABELS = {
  success: '🟢 Saudável',
  warning: '🟡 Atenção',
  destructive: '🔴 Prejuízo',
} as const;

export function LTVRecurrencePanel() {
  const { data: metrics, isLoading } = useLTVMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const totalClients = metrics.groups.reduce((sum, g) => sum + g.clientCount, 0);
  const totalRevenue = metrics.groups.reduce((sum, g) => sum + g.totalRevenue, 0);
  const overallLTV = totalClients > 0 ? totalRevenue / totalClients : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="monday-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Total Pacientes</p>
                <p className="text-lg font-bold">{totalClients}</p>
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
                <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
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
                <p className="text-lg font-bold">{formatCurrency(overallLTV)}</p>
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
            📊 Geração de Caixa por Recorrência (LTV Inteligente)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Recorrência</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap">Clientes</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">Ticket Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">LTV Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">CAC Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">Lucro Médio</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">Receita Total</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap">Saúde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.groups.map((group) => (
                  <TableRow
                    key={group.label}
                    className={cn(
                      group.clientCount === 0 && 'opacity-50',
                      group.label === metrics.bestProfitGroup && 'bg-success/5'
                    )}
                  >
                    <TableCell className="font-medium text-sm whitespace-nowrap">
                      {group.label}
                      {group.label === metrics.bestProfitGroup && (
                        <span className="ml-1.5 text-[10px]">⭐</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold">{group.clientCount}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(group.avgTicket)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(group.avgLTV)}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{formatCurrency(group.avgCAC)}</TableCell>
                    <TableCell className={cn(
                      'text-right text-sm font-bold',
                      group.avgProfit > 0 ? 'text-success' : group.avgProfit < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(group.avgProfit)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(group.totalRevenue)}</TableCell>
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
                <span className="shrink-0">💡</span>
                <p className="text-muted-foreground">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
