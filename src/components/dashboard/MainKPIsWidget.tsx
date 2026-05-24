import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { Users, Phone, Calendar, UserCheck, TrendingUp, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

export function MainKPIsWidget() {
  const { data, isLoading } = useDashboardKPIs();

  const kpis = [
    { title: 'Leads Recebidos', value: data?.leadsRecebidos.value ?? 0, change: data?.leadsRecebidos.change ?? 0, icon: Users, color: 'hsl(213 94% 58%)', format: (v: number) => v.toString() },
    { title: 'Leads Atendidos', value: data?.leadsAtendidos.value ?? 0, change: data?.leadsAtendidos.change ?? 0, icon: Phone, color: 'hsl(156 72% 45%)', format: (v: number) => v.toString() },
    { title: 'Consultas Agendadas', value: data?.consultasAgendadas.value ?? 0, change: data?.consultasAgendadas.change ?? 0, icon: Calendar, color: 'hsl(270 75% 60%)', format: (v: number) => v.toString() },
    { title: 'Taxa de Comparecimento', value: data?.taxaComparecimento.value ?? 0, change: data?.taxaComparecimento.change ?? 0, icon: UserCheck, color: 'hsl(340 82% 60%)', format: (v: number) => `${v}%` },
    { title: 'Taxa de Conversão', value: data?.taxaConversao.value ?? 0, change: data?.taxaConversao.change ?? 0, icon: TrendingUp, color: 'hsl(32 95% 55%)', format: (v: number) => `${v}%` },
    { title: 'ROI', value: data?.roi.value ?? 0, change: data?.roi.change ?? 0, icon: Target, color: 'hsl(180 70% 50%)', format: (v: number) => `${v}%`, footer: data ? `Receita ${formatCurrency(data.receita.value)} · Inv. ${formatCurrency(data.investimento.value)}` : '' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map(kpi => {
        const positive = kpi.change >= 0;
        return (
          <Card key={kpi.title} className="monday-card overflow-hidden group transition-all hover:shadow-lg">
            <div className="h-1 w-full" style={{ backgroundColor: kpi.color }} />
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: kpi.color }}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{kpi.format(kpi.value)}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                {!isLoading && (
                  <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(kpi.change)}%
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">vs período anterior</span>
              </div>
              {kpi.footer && <p className="text-[10px] text-muted-foreground mt-1 truncate">{kpi.footer}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
