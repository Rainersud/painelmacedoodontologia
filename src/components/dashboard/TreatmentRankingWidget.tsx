import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const TREATMENT_LABELS: Record<string, string> = {
  implante: 'Implante',
  protese_flexivel: 'Prótese Flexível',
  protese_total: 'Prótese Total',
  outro: 'Outro',
};

const PERIOD_OPTIONS = [
  { value: '30', label: 'Mês atual' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
];

interface TreatmentStat {
  treatment: string;
  label: string;
  leads: number;
  attended: number;
  closed: number;
  revenue: number;
}

export function TreatmentRankingWidget() {
  const [periodDays, setPeriodDays] = useState('30');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['treatment-ranking', periodDays],
    queryFn: async (): Promise<TreatmentStat[]> => {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(periodDays));

      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, interest_product, status, created_at')
        .gte('created_at', since.toISOString())
        .not('interest_product', 'is', null);

      if (error) throw error;

      // Get real revenue from payments for closed leads
      const closedLeadIds = (leads || []).filter(l => l.status === 'fechado').map(l => l.id);
      let revenueMap: Record<string, number> = {};
      if (closedLeadIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('lead_id, net_value')
          .eq('status', 'pago')
          .in('lead_id', closedLeadIds);
        (payments || []).forEach(p => {
          revenueMap[p.lead_id] = (revenueMap[p.lead_id] || 0) + (p.net_value || 0);
        });
      }

      const map: Record<string, { leads: number; attended: number; closed: number; revenue: number }> = {};

      for (const lead of leads || []) {
        const key = lead.interest_product || 'outro';
        if (!map[key]) map[key] = { leads: 0, attended: 0, closed: 0, revenue: 0 };
        map[key].leads++;
        if (lead.status === 'compareceu' || lead.status === 'fechado') map[key].attended++;
        if (lead.status === 'fechado') {
          map[key].closed++;
          map[key].revenue += revenueMap[lead.id] || 0;
        }
      }

      return Object.entries(map)
        .map(([treatment, data]) => ({
          treatment,
          label: TREATMENT_LABELS[treatment] || treatment,
          ...data,
        }))
        .sort((a, b) => b.leads - a.leads);
    },
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  return (
    <Card className="monday-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">🦷 Ranking de Tratamentos Mais Procurados</CardTitle>
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : !stats?.length ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum dado de tratamento encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Tratamento</th>
                  <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Leads</th>
                  <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Comparecimentos</th>
                  <th className="text-center py-3 px-2 font-semibold text-muted-foreground">Vendas</th>
                  <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, i) => (
                  <tr key={stat.treatment} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <span className="text-lg">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                        🦷 {stat.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">{stat.leads}</td>
                    <td className="py-3 px-2 text-center font-semibold">{stat.attended}</td>
                    <td className="py-3 px-2 text-center font-semibold">{stat.closed}</td>
                    <td className="py-3 px-2 text-right font-bold text-success">{formatCurrency(stat.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
