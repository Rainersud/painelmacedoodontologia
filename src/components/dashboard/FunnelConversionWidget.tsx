import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { FUNNEL_STAGES, getDaysInStage, type LeadStatus } from '@/types/crm';
import { ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function FunnelConversionWidget() {
  const { data: leads, isLoading } = useCRMLeads();

  const conversionData = useMemo(() => {
    if (!leads) return [];

    return FUNNEL_STAGES.map((stage, index) => {
      const stageLeads = leads.filter(l => l.status === stage.key);
      const count = stageLeads.length;

      // Calculate how many advanced to the next stage
      // We approximate by counting leads in subsequent stages
      let advanced = 0;
      if (index < FUNNEL_STAGES.length - 1) {
        const subsequentKeys = FUNNEL_STAGES.slice(index + 1).map(s => s.key);
        // Count leads that have been in this stage (we use activity_logs ideally, 
        // but for now we count leads currently in later stages)
        const laterLeads = leads.filter(l => subsequentKeys.includes(l.status));
        advanced = laterLeads.length;
      }

      // Conversion rate: leads in next stage / leads in this + next stages
      const nextStage = index < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[index + 1] : null;
      const nextCount = nextStage ? leads.filter(l => l.status === nextStage.key).length : 0;
      const conversionRate = count + nextCount > 0 
        ? Math.round((nextCount / (count + nextCount)) * 100) 
        : 0;

      // Average days in stage
      const daysArray = stageLeads.map(l => getDaysInStage(l.stage_entered_at));
      const avgDays = daysArray.length > 0 
        ? Math.round(daysArray.reduce((a, b) => a + b, 0) / daysArray.length * 10) / 10
        : 0;

      return {
        stage,
        count,
        nextCount,
        conversionRate,
        avgDays,
      };
    });
  }, [leads]);

  if (isLoading) {
    return (
      <Card className="monday-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Conversão do Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="monday-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Conversão do Funil de Vendas</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Taxa de conversão entre etapas e tempo médio de permanência
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-semibold text-muted-foreground text-xs">Etapa</th>
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground text-xs">Leads</th>
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground text-xs">Próx. Etapa</th>
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground text-xs">Conversão</th>
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground text-xs">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tempo Médio
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {conversionData.map((row, index) => (
                <tr 
                  key={row.stage.key} 
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", row.stage.color)} />
                      <span className="font-medium text-xs">{row.stage.label}</span>
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <Badge variant="secondary" className="text-xs font-semibold min-w-6 justify-center">
                      {row.count}
                    </Badge>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    {index < conversionData.length - 1 ? (
                      <span className="text-xs font-medium">{row.nextCount}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-2">
                    {index < conversionData.length - 1 ? (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-semibold border-0",
                          row.conversionRate >= 60 && "bg-success/10 text-success",
                          row.conversionRate >= 30 && row.conversionRate < 60 && "bg-warning/10 text-warning",
                          row.conversionRate < 30 && "bg-destructive/10 text-destructive",
                        )}
                      >
                        {row.conversionRate}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className={cn(
                      "text-xs font-medium",
                      row.avgDays >= 6 && "text-destructive",
                      row.avgDays >= 3 && row.avgDays < 6 && "text-warning",
                      row.avgDays < 3 && "text-muted-foreground",
                    )}>
                      {row.avgDays} {row.avgDays === 1 ? 'dia' : 'dias'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
