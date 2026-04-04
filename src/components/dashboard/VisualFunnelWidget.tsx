import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCRMLeads } from '@/hooks/useCRMLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { SOURCE_CONFIG } from '@/types/crm';

interface FunnelStageData {
  key: string;
  label: string;
  count: number;
  conversionRate: number;
  cumulativeRate: number;
  status: 'healthy' | 'attention' | 'critical';
  color: string;
  gradient: string;
  leadsBySource: Record<string, number>;
}

const FUNNEL_STEPS = [
  { key: 'novo_lead', label: 'Novos Leads', statuses: ['novo_lead'] },
  { key: 'agendou', label: 'Agendados', statuses: ['agendou', 'consulta_agendada', 'confirmado'] },
  { key: 'compareceu', label: 'Compareceu', statuses: ['compareceu'] },
  { key: 'fechado', label: 'Venda Realizada', statuses: ['fechado'] },
];

function getStageStatus(rate: number): 'healthy' | 'attention' | 'critical' {
  if (rate >= 50) return 'healthy';
  if (rate >= 25) return 'attention';
  return 'critical';
}

function getStageColors(status: 'healthy' | 'attention' | 'critical') {
  switch (status) {
    case 'healthy':
      return {
        color: 'hsl(var(--success))',
        gradient: 'from-success/80 to-success',
        bg: 'bg-success/10',
        text: 'text-success',
      };
    case 'attention':
      return {
        color: 'hsl(var(--warning))',
        gradient: 'from-warning/80 to-warning',
        bg: 'bg-warning/10',
        text: 'text-warning',
      };
    case 'critical':
      return {
        color: 'hsl(var(--destructive))',
        gradient: 'from-destructive/80 to-destructive',
        bg: 'bg-destructive/10',
        text: 'text-destructive',
      };
  }
}

function getInsight(stageKey: string, rate: number): string | null {
  if (rate >= 50) return null;
  switch (stageKey) {
    case 'agendou':
      return rate < 25
        ? '🚨 Baixa conversão em agendamentos → revisar atendimento inicial e tempo de resposta'
        : '⚠️ Conversão média em agendamentos → otimizar abordagem de captação';
    case 'compareceu':
      return rate < 25
        ? '🚨 Alta perda no comparecimento → implementar confirmação automática e lembretes'
        : '⚠️ Melhorar taxa de comparecimento → reforçar confirmação de consulta';
    case 'fechado':
      return rate < 25
        ? '🚨 Baixa taxa de fechamento → revisar abordagem comercial e condições'
        : '⚠️ Taxa de fechamento pode melhorar → avaliar objeções dos pacientes';
    default:
      return null;
  }
}

function StatusIcon({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'attention':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'critical':
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

function StatusLabel({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  const config = {
    healthy: { label: '✅ Saudável', className: 'bg-success/10 text-success border-success/20' },
    attention: { label: '⚠️ Atenção', className: 'bg-warning/10 text-warning border-warning/20' },
    critical: { label: '🚨 Crítico', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-[10px] font-semibold border', c.className)}>{c.label}</Badge>;
}

export function VisualFunnelWidget() {
  const { data: leads, isLoading } = useCRMLeads();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const funnelData = useMemo(() => {
    if (!leads) return [];

    const allLeads = leads;
    const totalLeads = allLeads.length;

    const stages: FunnelStageData[] = FUNNEL_STEPS.map((step, index) => {
      // Count leads currently in this stage OR that passed through it (in later stages)
      const laterStatuses = FUNNEL_STEPS.slice(index).flatMap(s => s.statuses);
      const countInOrPast = allLeads.filter(l => laterStatuses.includes(l.status)).length;

      // Count leads only in this exact stage
      const countExact = allLeads.filter(l => step.statuses.includes(l.status)).length;

      // Conversion rate to next stage
      const nextStep = FUNNEL_STEPS[index + 1];
      let conversionRate = 0;
      if (nextStep && countInOrPast > 0) {
        const nextLaterStatuses = FUNNEL_STEPS.slice(index + 1).flatMap(s => s.statuses);
        const nextCountInOrPast = allLeads.filter(l => nextLaterStatuses.includes(l.status)).length;
        conversionRate = Math.round((nextCountInOrPast / countInOrPast) * 100);
      }

      // Cumulative rate from top
      const cumulativeRate = totalLeads > 0 ? Math.round((countInOrPast / totalLeads) * 100) : 0;

      // Leads by source for this stage
      const stageLeads = allLeads.filter(l => step.statuses.includes(l.status));
      const leadsBySource: Record<string, number> = {};
      stageLeads.forEach(l => {
        const src = l.source || 'outro';
        leadsBySource[src] = (leadsBySource[src] || 0) + 1;
      });

      const status = index === 0 ? 'healthy' as const : getStageStatus(conversionRate);
      const colors = getStageColors(status);

      return {
        key: step.key,
        label: step.label,
        count: countInOrPast,
        conversionRate,
        cumulativeRate,
        status,
        color: colors.color,
        gradient: colors.gradient,
        leadsBySource,
      };
    });

    return stages;
  }, [leads]);

  const insights = useMemo(() => {
    return funnelData
      .slice(1) // skip first stage
      .map(stage => getInsight(stage.key, stage.conversionRate))
      .filter(Boolean) as string[];
  }, [funnelData]);

  const totalConversion = useMemo(() => {
    if (funnelData.length < 2) return 0;
    const top = funnelData[0]?.count || 0;
    const bottom = funnelData[funnelData.length - 1]?.count || 0;
    return top > 0 ? Math.round((bottom / top) * 100) : 0;
  }, [funnelData]);

  if (isLoading) {
    return (
      <Card className="monday-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Funil de Vendas Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const widths = [100, 75, 55, 38];

  return (
    <Card className="monday-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Funil de Vendas Visual</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-bold border',
              totalConversion >= 15
                ? 'bg-success/10 text-success border-success/20'
                : totalConversion >= 8
                ? 'bg-warning/10 text-warning border-warning/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            )}
          >
            Conversão Total: {totalConversion}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Desempenho do funil com análise automática de gargalos
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Funnel Visualization */}
        <div className="flex flex-col items-center gap-1 py-4">
          {funnelData.map((stage, index) => {
            const isExpanded = expandedStage === stage.key;
            const stageColors = getStageColors(stage.status);
            const width = widths[index];

            return (
              <div key={stage.key} className="w-full flex flex-col items-center">
                {/* Funnel Layer */}
                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                  className="w-full focus:outline-none group"
                  style={{ maxWidth: `${width}%` }}
                >
                  <div
                    className={cn(
                      'relative rounded-lg py-3 px-4 transition-all duration-300',
                      'bg-gradient-to-r shadow-md hover:shadow-lg',
                      stageColors.gradient,
                      'cursor-pointer hover:scale-[1.02]',
                      isExpanded && 'ring-2 ring-primary/50'
                    )}
                    style={{
                      clipPath: index < funnelData.length - 1
                        ? 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)'
                        : 'polygon(0% 0%, 100% 0%, 97% 100%, 3% 100%)',
                    }}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={stage.status} />
                        <span className="text-sm font-bold text-white drop-shadow-sm">
                          {stage.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-white drop-shadow-sm">
                          {stage.count}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-white/70" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white/70" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 relative z-10">
                      <span className="text-[10px] text-white/80 font-medium">
                        {stage.cumulativeRate}% do total
                      </span>
                      <StatusLabel status={stage.status} />
                    </div>
                  </div>
                </button>

                {/* Conversion Arrow */}
                {index < funnelData.length - 1 && (
                  <div className="flex items-center gap-1 py-0.5">
                    <div className="h-4 w-px bg-border" />
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] font-bold px-2 py-0',
                        funnelData[index + 1].status === 'healthy' && 'bg-success/15 text-success',
                        funnelData[index + 1].status === 'attention' && 'bg-warning/15 text-warning',
                        funnelData[index + 1].status === 'critical' && 'bg-destructive/15 text-destructive',
                      )}
                    >
                      ↓ {funnelData[index + 1].conversionRate || stage.conversionRate}%
                    </Badge>
                    <div className="h-4 w-px bg-border" />
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="w-full max-w-md mt-2 mb-2 p-3 rounded-lg border bg-card shadow-sm animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Origem dos Leads</p>
                        {Object.entries(stage.leadsBySource).length > 0 ? (
                          Object.entries(stage.leadsBySource)
                            .sort(([, a], [, b]) => b - a)
                            .map(([source, count]) => {
                              const config = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG];
                              return (
                                <div key={source} className="flex items-center justify-between py-0.5">
                                  <Badge variant="outline" className={cn('text-[9px]', config?.color)}>
                                    {config?.label || source}
                                  </Badge>
                                  <span className="font-semibold">{count}</span>
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-muted-foreground italic">Sem dados</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Métricas</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quantidade:</span>
                            <span className="font-bold">{stage.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">% do funil:</span>
                            <span className="font-bold">{stage.cumulativeRate}%</span>
                          </div>
                          {index < funnelData.length - 1 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Conversão:</span>
                              <span className={cn('font-bold', stageColors.text)}>
                                {stage.conversionRate}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              Insights Automáticos
            </div>
            {insights.map((insight, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed pl-5">
                {insight}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
