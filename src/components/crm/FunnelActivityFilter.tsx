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
  Calendar,
  ArrowRightLeft,
  Users,
  TrendingUp,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FUNNEL_STAGES } from '@/types/crm';

const stageLabels: Record<string, string> = Object.fromEntries(
  FUNNEL_STAGES.map(s => [s.key, s.label])
);

export function FunnelActivityFilter() {
  const [open, setOpen] = useState(false);
  const [dateMode, setDateMode] = useState<'hoje' | 'ontem' | 'custom'>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getRange = () => {
    const now = new Date();
    if (dateMode === 'hoje') {
      return { start: startOfDay(now), end: endOfDay(now) };
    } else if (dateMode === 'ontem') {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    } else if (customStart && customEnd) {
      return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    }
    return { start: startOfDay(now), end: endOfDay(now) };
  };

  const range = getRange();

  const { data, isLoading } = useQuery({
    queryKey: ['funnel-activity', dateMode, customStart, customEnd],
    queryFn: async () => {
      const start = range.start.toISOString();
      const end = range.end.toISOString();

      // Leads added in period
      const { data: newLeads } = await supabase
        .from('leads')
        .select('id, name, status')
        .gte('created_at', start)
        .lte('created_at', end);

      // Status changes in period
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('id, lead_id, title, old_value, new_value, created_at, agent_id')
        .eq('activity_type', 'status_changed')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      // Sales in period
      const { data: sales } = await supabase
        .from('leads')
        .select('id, name')
        .eq('status', 'fechado')
        .gte('closed_at', start)
        .lte('closed_at', end);

      // Rescued in period
      const { data: rescued } = await supabase
        .from('leads')
        .select('id, name')
        .eq('status', 'resgatado')
        .gte('rescued_at', start)
        .lte('rescued_at', end);

      // Fetch agent names for logs
      const agentIds = [...new Set((logs || []).map(l => l.agent_id).filter(Boolean))];
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds);
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      return {
        newLeads: newLeads || [],
        movements: (logs || []).map(l => ({
          ...l,
          agentName: agentMap[l.agent_id] || 'Sistema',
          fromLabel: stageLabels[l.old_value || ''] || l.old_value,
          toLabel: stageLabels[l.new_value || ''] || l.new_value,
        })),
        sales: sales || [],
        rescued: rescued || [],
      };
    },
    enabled: open,
  });

  const dateLabel = dateMode === 'hoje' ? 'Hoje' : dateMode === 'ontem' ? 'Ontem' :
    customStart && customEnd ? `${format(new Date(customStart), 'dd/MM', { locale: ptBR })} - ${format(new Date(customEnd), 'dd/MM', { locale: ptBR })}` : 'Selecionar';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Atividades do Dia
          {data && (data.movements.length + data.newLeads.length) > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">
              {data.movements.length + data.newLeads.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        {/* Date Selector */}
        <div className="flex items-center gap-1 p-3 border-b">
          <Button
            variant={dateMode === 'hoje' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setDateMode('hoje')}
          >
            Hoje
          </Button>
          <Button
            variant={dateMode === 'ontem' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setDateMode('ontem')}
          >
            Ontem
          </Button>
          <Button
            variant={dateMode === 'custom' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setDateMode('custom')}
          >
            <CalendarDays className="h-3 w-3 mr-1" />
            Período
          </Button>
        </div>

        {dateMode === 'custom' && (
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Input type="date" className="h-8 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" className="h-8 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}

        <ScrollArea className="max-h-96">
          <div className="p-3 space-y-4">
            {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}

            {data && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-primary/5">
                    <p className="text-lg font-bold text-primary">{data.newLeads.length}</p>
                    <p className="text-[9px] text-muted-foreground">Novos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-warning/5">
                    <p className="text-lg font-bold text-warning">{data.movements.length}</p>
                    <p className="text-[9px] text-muted-foreground">Movimentos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-success/5">
                    <p className="text-lg font-bold text-success">{data.sales.length}</p>
                    <p className="text-[9px] text-muted-foreground">Vendas</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-chart-5/5">
                    <p className="text-lg font-bold text-chart-5">{data.rescued.length}</p>
                    <p className="text-[9px] text-muted-foreground">Resgates</p>
                  </div>
                </div>

                {/* Movements */}
                {data.movements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3" />
                      Movimentações
                    </h4>
                    <div className="space-y-1.5">
                      {data.movements.slice(0, 20).map(m => (
                        <div key={m.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{m.title}</p>
                            <p className="text-muted-foreground">
                              {m.fromLabel} → {m.toLabel}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Leads */}
                {data.newLeads.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Leads Adicionados
                    </h4>
                    <div className="space-y-1">
                      {data.newLeads.slice(0, 10).map(l => (
                        <div key={l.id} className="text-xs flex items-center justify-between py-1">
                          <span className="font-medium">{l.name}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {stageLabels[l.status] || l.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.movements.length === 0 && data.newLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma atividade registrada neste período
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
