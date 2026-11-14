import { useOpenLead } from '@/contexts/LeadDetailContext';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { Users, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SOURCE_CONFIG, FUNNEL_STAGES } from '@/types/crm';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { WidgetPeriodTabs } from '@/components/dashboard/WidgetPeriodTabs';

export function RecentLeadsWidget() {
  const { period, setPeriod, range } = useLocalPeriod('hoje');
  const { data: leads, isLoading } = useCRMLeads();
  const openLead = useOpenLead();

  const filtered = useMemo(() => {
    if (!leads) return [];
    const startTs = range.start.getTime();
    const endTs = range.end.getTime();
    return leads
      .filter(l => {
        if (l.status !== 'novo_lead') return false;
        const t = new Date(l.created_at).getTime();
        return t >= startTs && t <= endTs;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [leads, range.start, range.end]);

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Leads Recentes (Novos Leads · Comercial 1)
          </CardTitle>
          <WidgetPeriodTabs value={period} onChange={setPeriod} />
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
                    <button type="button" onClick={() => openLead(lead.id)} className="text-sm font-medium truncate hover:underline underline-offset-2 text-left max-w-full">{lead.name}</button>
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
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openLead(lead.id)}>
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
