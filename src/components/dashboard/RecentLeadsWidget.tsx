import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { Users, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SOURCE_CONFIG, FUNNEL_STAGES } from '@/types/crm';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { subDays, startOfDay } from 'date-fns';

type Filter = 'hoje' | '7d' | '30d';

export function RecentLeadsWidget() {
  const [filter, setFilter] = useState<Filter>('hoje');
  const { data: leads, isLoading } = useCRMLeads();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!leads) return [];
    const now = new Date();
    const cutoff = filter === 'hoje' ? startOfDay(now) : filter === '7d' ? subDays(now, 7) : subDays(now, 30);
    return leads
      .filter(l => l.status === 'novo_lead' && new Date(l.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [leads, filter]);

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Leads Recentes (Novos Leads · Comercial 1)
          </CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="hoje" className="text-xs h-6">Hoje</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs h-6">7 dias</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs h-6">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead novo no período</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(lead => {
              const stage = FUNNEL_STAGES.find(s => s.key === lead.status);
              const src = SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG];
              return (
                <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {src && <Badge variant="outline" className={`text-[10px] ${src.color} border-0`}>{src.label}</Badge>}
                      {stage && <Badge variant="outline" className="text-[10px]">{stage.label}</Badge>}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {lead.profiles?.full_name && (
                        <span className="text-[10px] text-muted-foreground">· {lead.profiles.full_name}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate('/funil')}>
                    Abrir <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
