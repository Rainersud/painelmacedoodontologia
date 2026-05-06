import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Filter,
  ArrowRightLeft,
  Users,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FUNNEL_STAGES } from '@/types/crm';
import { formatCurrency } from '@/lib/currency';

const stageLabels: Record<string, string> = Object.fromEntries(
  FUNNEL_STAGES.map(s => [s.key, s.label])
);

type ActivityType = 'all' | 'new_leads' | 'movements' | 'payments' | 'sales' | 'rescued' | 'tasks';

const activityFilters: { key: ActivityType; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Todas', icon: Filter },
  { key: 'new_leads', label: 'Novos', icon: Users },
  { key: 'movements', label: 'Movimentos', icon: ArrowRightLeft },
  { key: 'payments', label: 'Pagamentos', icon: DollarSign },
  { key: 'sales', label: 'Vendas', icon: CheckCircle2 },
  { key: 'rescued', label: 'Resgates', icon: RefreshCw },
  { key: 'tasks', label: 'Tarefas', icon: CheckCircle2 },
];

interface UnifiedActivity {
  id: string;
  type: 'new_lead' | 'movement' | 'payment' | 'sale' | 'rescue' | 'task';
  leadName: string;
  leadId: string | null;
  description: string;
  agentName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface FunnelActivityFilterProps {
  onLeadClick?: (leadId: string) => void;
}

export function FunnelActivityFilter({ onLeadClick }: FunnelActivityFilterProps) {
  const [open, setOpen] = useState(false);
  const [dateMode, setDateMode] = useState<'hoje' | 'ontem' | 'custom'>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType>('all');
  const [sortAsc, setSortAsc] = useState(false);

  const getRange = () => {
    const now = new Date();
    if (dateMode === 'hoje') return { start: startOfDay(now), end: endOfDay(now) };
    if (dateMode === 'ontem') {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    if (customStart && customEnd) return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    return { start: startOfDay(now), end: endOfDay(now) };
  };

  const range = getRange();

  const { data, isLoading } = useQuery({
    queryKey: ['funnel-activity-v2', dateMode, customStart, customEnd],
    queryFn: async () => {
      const start = range.start.toISOString();
      const end = range.end.toISOString();

      const [newLeadsRes, logsRes, salesRes, rescuedRes, paymentsRes, tasksRes] = await Promise.all([
        supabase.from('leads').select('id, name, status, created_at').gte('created_at', start).lte('created_at', end),
        supabase.from('activity_logs').select('id, lead_id, title, old_value, new_value, created_at, agent_id, activity_type, metadata, description')
          .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('leads').select('id, name, closed_at').eq('status', 'fechado').gte('closed_at', start).lte('closed_at', end),
        supabase.from('leads').select('id, name, rescued_at').eq('status', 'resgatado').gte('rescued_at', start).lte('rescued_at', end),
        supabase.from('payments').select('id, lead_id, gross_value, net_value, payment_method, created_at, status, agent_id')
          .gte('created_at', start).lte('created_at', end),
        supabase.from('tasks').select('id, lead_id, title, completed_at, agent_id')
          .eq('status', 'concluido').gte('completed_at', start).lte('completed_at', end),
      ]);

      // Get all agent IDs
      const allAgentIds = new Set<string>();
      (logsRes.data || []).forEach(l => l.agent_id && allAgentIds.add(l.agent_id));
      (paymentsRes.data || []).forEach(p => p.agent_id && allAgentIds.add(p.agent_id));
      (tasksRes.data || []).forEach(t => t.agent_id && allAgentIds.add(t.agent_id));

      let agentMap: Record<string, string> = {};
      if (allAgentIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', [...allAgentIds]);
        if (profiles) agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      }

      // Get lead names for payments/tasks
      const leadIdsNeeded = new Set<string>();
      (paymentsRes.data || []).forEach(p => leadIdsNeeded.add(p.lead_id));
      (tasksRes.data || []).forEach(t => t.lead_id && leadIdsNeeded.add(t.lead_id));

      let leadNameMap: Record<string, string> = {};
      if (leadIdsNeeded.size > 0) {
        const { data: leads } = await supabase.from('leads').select('id, name').in('id', [...leadIdsNeeded]);
        if (leads) leadNameMap = Object.fromEntries(leads.map(l => [l.id, l.name]));
      }

      const activities: UnifiedActivity[] = [];

      // New leads
      (newLeadsRes.data || []).forEach(l => {
        activities.push({
          id: `new-${l.id}`,
          type: 'new_lead',
          leadName: l.name,
          leadId: l.id,
          description: `Lead criado → ${stageLabels[l.status] || l.status}`,
          agentName: 'Sistema',
          timestamp: l.created_at,
        });
      });

      // Movements (status changes)
      (logsRes.data || []).filter(l => l.activity_type === 'status_changed').forEach(l => {
        activities.push({
          id: `mov-${l.id}`,
          type: 'movement',
          leadName: l.title?.replace('Status alterado: ', '') || 'Lead',
          leadId: l.lead_id,
          description: `${stageLabels[l.old_value || ''] || l.old_value || '?'} → ${stageLabels[l.new_value || ''] || l.new_value || '?'}`,
          agentName: agentMap[l.agent_id] || 'Sistema',
          timestamp: l.created_at,
        });
      });

      // Payments
      (paymentsRes.data || []).forEach(p => {
        activities.push({
          id: `pay-${p.id}`,
          type: 'payment',
          leadName: leadNameMap[p.lead_id] || 'Lead',
          leadId: p.lead_id,
          description: `Pagamento ${p.status === 'pago' ? 'confirmado' : 'registrado'} — ${formatCurrency(p.gross_value)} (${p.payment_method})`,
          agentName: agentMap[p.agent_id] || 'Sistema',
          timestamp: p.created_at,
        });
      });

      // Sales
      (salesRes.data || []).forEach(s => {
        if (!activities.some(a => a.type === 'movement' && a.leadId === s.id && a.description.includes('Venda Realizada'))) {
          activities.push({
            id: `sale-${s.id}`,
            type: 'sale',
            leadName: s.name,
            leadId: s.id,
            description: 'Venda Realizada ✅',
            agentName: 'Sistema',
            timestamp: s.closed_at || '',
          });
        }
      });

      // Rescued
      (rescuedRes.data || []).forEach(r => {
        activities.push({
          id: `rescue-${r.id}`,
          type: 'rescue',
          leadName: r.name,
          leadId: r.id,
          description: 'Lead resgatado 🔄',
          agentName: 'Sistema',
          timestamp: r.rescued_at || '',
        });
      });

      // Tasks completed
      (tasksRes.data || []).forEach(t => {
        activities.push({
          id: `task-${t.id}`,
          type: 'task',
          leadName: leadNameMap[t.lead_id || ''] || 'Geral',
          leadId: t.lead_id,
          description: `Tarefa concluída: ${t.title}`,
          agentName: agentMap[t.agent_id] || 'Sistema',
          timestamp: t.completed_at || '',
        });
      });

      return activities;
    },
    enabled: open,
  });

  const filtered = (data || [])
    .filter(a => {
      if (typeFilter === 'all') return true;
      const map: Record<ActivityType, string[]> = {
        all: [],
        new_leads: ['new_lead'],
        movements: ['movement'],
        payments: ['payment'],
        sales: ['sale'],
        rescued: ['rescue'],
        tasks: ['task'],
      };
      return map[typeFilter]?.includes(a.type);
    })
    .sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return sortAsc ? -diff : diff;
    });

  const typeColors: Record<string, string> = {
    new_lead: 'bg-primary text-primary-foreground',
    movement: 'bg-warning text-warning-foreground',
    payment: 'bg-success text-white',
    sale: 'bg-success text-white',
    rescue: 'bg-chart-5 text-white',
    task: 'bg-muted text-muted-foreground',
  };

  const typeLabels: Record<string, string> = {
    new_lead: 'Novo',
    movement: 'Movido',
    payment: 'Pagamento',
    sale: 'Venda',
    rescue: 'Resgate',
    task: 'Tarefa',
  };

  const counts = {
    new_leads: (data || []).filter(a => a.type === 'new_lead').length,
    movements: (data || []).filter(a => a.type === 'movement').length,
    payments: (data || []).filter(a => a.type === 'payment').length,
    sales: (data || []).filter(a => a.type === 'sale').length,
    rescued: (data || []).filter(a => a.type === 'rescue').length,
    tasks: (data || []).filter(a => a.type === 'task').length,
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Atividades do Dia
          {data && data.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">
              {data.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        {/* Date Selector */}
        <div className="flex items-center gap-1 p-3 border-b">
          <Button variant={dateMode === 'hoje' ? 'default' : 'ghost'} size="sm" className="text-xs h-7" onClick={() => setDateMode('hoje')}>Hoje</Button>
          <Button variant={dateMode === 'ontem' ? 'default' : 'ghost'} size="sm" className="text-xs h-7" onClick={() => setDateMode('ontem')}>Ontem</Button>
          <Button variant={dateMode === 'custom' ? 'default' : 'ghost'} size="sm" className="text-xs h-7" onClick={() => setDateMode('custom')}>
            <CalendarDays className="h-3 w-3 mr-1" />Período
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSortAsc(!sortAsc)} title={sortAsc ? 'Mais antigo primeiro' : 'Mais recente primeiro'}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        {dateMode === 'custom' && (
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Input type="date" className="h-8 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" className="h-8 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}

        {/* Summary counters */}
        {data && (
          <div className="grid grid-cols-6 gap-1 p-2 border-b">
            <div className="text-center p-1.5 rounded bg-primary/5 cursor-pointer hover:bg-primary/10" onClick={() => setTypeFilter('new_leads')}>
              <p className="text-sm font-bold text-primary">{counts.new_leads}</p>
              <p className="text-[8px] text-muted-foreground">Novos</p>
            </div>
            <div className="text-center p-1.5 rounded bg-warning/5 cursor-pointer hover:bg-warning/10" onClick={() => setTypeFilter('movements')}>
              <p className="text-sm font-bold text-warning">{counts.movements}</p>
              <p className="text-[8px] text-muted-foreground">Movidos</p>
            </div>
            <div className="text-center p-1.5 rounded bg-success/5 cursor-pointer hover:bg-success/10" onClick={() => setTypeFilter('payments')}>
              <p className="text-sm font-bold text-success">{counts.payments}</p>
              <p className="text-[8px] text-muted-foreground">Pagtos</p>
            </div>
            <div className="text-center p-1.5 rounded bg-success/5 cursor-pointer hover:bg-success/10" onClick={() => setTypeFilter('sales')}>
              <p className="text-sm font-bold text-success">{counts.sales}</p>
              <p className="text-[8px] text-muted-foreground">Vendas</p>
            </div>
            <div className="text-center p-1.5 rounded bg-chart-5/5 cursor-pointer hover:bg-chart-5/10" onClick={() => setTypeFilter('rescued')}>
              <p className="text-sm font-bold text-chart-5">{counts.rescued}</p>
              <p className="text-[8px] text-muted-foreground">Resgates</p>
            </div>
            <div className="text-center p-1.5 rounded bg-muted cursor-pointer hover:bg-muted/80" onClick={() => setTypeFilter('tasks')}>
              <p className="text-sm font-bold">{counts.tasks}</p>
              <p className="text-[8px] text-muted-foreground">Tarefas</p>
            </div>
          </div>
        )}

        {/* Type filter pills */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {activityFilters.map(f => (
            <Button
              key={f.key}
              variant={typeFilter === f.key ? 'default' : 'ghost'}
              size="sm"
              className="text-[10px] h-6 px-2 shrink-0"
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-0.5">
            {isLoading && <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>}

            {filtered.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade encontrada</p>
            )}

            {filtered.map(activity => (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-xs",
                  activity.leadId && onLeadClick && "cursor-pointer"
                )}
                onClick={() => activity.leadId && onLeadClick?.(activity.leadId)}
              >
                {/* Time */}
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-10 pt-0.5">
                  {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>

                {/* Dot */}
                <div className={cn("h-2 w-2 rounded-full mt-1 shrink-0", typeColors[activity.type]?.split(' ')[0] || 'bg-muted')} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{activity.leadName}</span>
                    <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">{typeLabels[activity.type]}</Badge>
                  </div>
                  <p className="text-muted-foreground truncate">{activity.description}</p>
                  <p className="text-[10px] text-muted-foreground/60">{activity.agentName}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
