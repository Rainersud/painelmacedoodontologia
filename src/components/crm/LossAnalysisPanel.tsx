import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, TrendingDown, Users, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LossEntry {
  id: string;
  name: string;
  phone: string;
  loss_reason: string;
  source: string;
  assigned_agent_id: string | null;
  stage_entered_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export function LossAnalysisPanel() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: lossLeads = [] } = useQuery({
    queryKey: ['loss-analysis'],
    queryFn: async (): Promise<LossEntry[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, loss_reason, source, assigned_agent_id, stage_entered_at, created_at')
        .eq('status', 'quase_cliente' as any)
        .not('loss_reason', 'is', null)
        .order('stage_entered_at', { ascending: false });

      if (error) throw error;

      const agentIds = [...new Set(data?.map(l => l.assigned_agent_id).filter(Boolean))];
      let agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', agentIds as string[]);
        if (profiles) {
          agentMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      return (data || []).map(l => ({
        ...l,
        loss_reason: l.loss_reason || '',
        profiles: l.assigned_agent_id ? { full_name: agentMap[l.assigned_agent_id] || 'Sem agente' } : null,
      }));
    },
  });

  const filteredLeads = useMemo(() => {
    let filtered = lossLeads;

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let start: Date;
      if (periodFilter === 'this_month') {
        start = startOfMonth(now);
      } else if (periodFilter === 'last_month') {
        start = startOfMonth(subMonths(now, 1));
      } else if (periodFilter === 'last_3_months') {
        start = startOfMonth(subMonths(now, 2));
      } else {
        start = new Date(0);
      }
      const end = periodFilter === 'last_month' ? endOfMonth(subMonths(now, 1)) : now;
      filtered = filtered.filter(l => {
        const d = new Date(l.stage_entered_at || l.created_at);
        return d >= start && d <= end;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.loss_reason.toLowerCase().includes(q) ||
        (l.profiles?.full_name || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [lossLeads, periodFilter, searchQuery]);

  // Group by reason patterns (simple word frequency)
  const reasonPatterns = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const reason = l.loss_reason.toLowerCase().trim();
      if (reason) {
        counts[reason] = (counts[reason] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredLeads]);

  const sourceLabels: Record<string, string> = {
    whatsapp: 'WhatsApp', telefone: 'Telefone', instagram: 'Instagram',
    facebook: 'Facebook', google_ads: 'Google Ads', indicacao: 'Indicação',
    site: 'Site', outro: 'Outro',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-destructive" />
          Análise de Perdas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Motivos pelos quais leads não fecharam — dados para otimizar campanhas e abordagens.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, motivo ou responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_month">Mês passado</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-destructive/5 border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground">Total de Perdas</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{filteredLeads.length}</p>
          </div>
          <div className="p-3 rounded-lg border bg-chart-5/5 border-chart-5/20">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-chart-5" />
              <span className="text-xs font-medium text-muted-foreground">Motivos Distintos</span>
            </div>
            <p className="text-2xl font-bold text-chart-5">{reasonPatterns.length}</p>
          </div>
        </div>

        {/* Top reasons */}
        {reasonPatterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              📊 Motivos mais frequentes
            </h4>
            <div className="space-y-1.5">
              {reasonPatterns.map(([reason, count], i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {count}x
                  </Badge>
                  <span className="capitalize truncate">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full list */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">📋 Todos os registros</h4>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-2">
              {filteredLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum registro de perda encontrado.
                </p>
              ) : (
                filteredLeads.map(lead => (
                  <div key={lead.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{lead.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(lead.stage_entered_at || lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-destructive">
                      ❌ {lead.loss_reason}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lead.profiles && <span>👤 {lead.profiles.full_name}</span>}
                      <span>📍 {sourceLabels[lead.source] || lead.source}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
