import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { startOfDay, endOfDay } from 'date-fns';
import {
  Users,
  ArrowRightLeft,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

export function DailySummaryWidget() {
  const { data } = useQuery({
    queryKey: ['daily-summary', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // Leads created today
      const { count: leadsCreated } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end);

      // Stage transitions today (from activity_logs)
      const { count: leadsMoved } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('activity_type', 'status_changed')
        .gte('created_at', start)
        .lte('created_at', end);

      // Sales today (leads moved to fechado)
      const { count: salesCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fechado')
        .gte('closed_at', start)
        .lte('closed_at', end);

      // Revenue today (payments confirmed)
      const { data: payments } = await supabase
        .from('payments')
        .select('net_value')
        .eq('status', 'pago')
        .gte('paid_at', start)
        .lte('paid_at', end);
      const revenue = (payments || []).reduce((sum, p) => sum + (p.net_value || 0), 0);

      // Tasks completed today
      const { count: tasksCompleted } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido')
        .gte('completed_at', start)
        .lte('completed_at', end);

      return {
        leadsCreated: leadsCreated || 0,
        leadsMoved: leadsMoved || 0,
        salesCount: salesCount || 0,
        revenue,
        tasksCompleted: tasksCompleted || 0,
      };
    },
    refetchInterval: 30000,
  });

  if (!data) return null;

  const items = [
    { label: 'Leads Criados', value: data.leadsCreated, icon: Users, color: 'hsl(var(--primary))' },
    { label: 'Movimentações', value: data.leadsMoved, icon: ArrowRightLeft, color: 'hsl(var(--warning))' },
    { label: 'Vendas Realizadas', value: data.salesCount, icon: TrendingUp, color: 'hsl(var(--success))' },
    { label: 'Faturamento do Dia', value: formatCurrency(data.revenue), icon: DollarSign, color: 'hsl(var(--success))' },
    { label: 'Tarefas Concluídas', value: data.tasksCompleted, icon: CheckCircle2, color: 'hsl(var(--chart-5))' },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Resumo do Dia
          <Badge variant="outline" className="text-[10px] ml-auto">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {items.map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-muted/30 text-center">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-1.5"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <item.icon className="h-4 w-4" style={{ color: item.color }} />
              </div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
