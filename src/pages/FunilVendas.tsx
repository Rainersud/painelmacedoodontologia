import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { useFunnelData } from '@/components/funnel/FunilDoPeriodo';
import { PageShell } from '@/components/layout/PageShell';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { cn } from '@/lib/utils';
import { funnelInsights, type InsightTone } from '@/lib/funnelInsights';

const TONE: Record<InsightTone, { icon: typeof XCircle; cls: string; label: string }> = {
  critical: { icon: XCircle, cls: 'border-destructive/30 bg-destructive/5 text-destructive', label: 'Crítico' },
  warning: { icon: AlertTriangle, cls: 'border-warning/40 bg-warning/10 text-warning-strong', label: 'Atenção' },
  good: { icon: CheckCircle2, cls: 'border-success/30 bg-success/5 text-success', label: 'Bom sinal' },
};

function FunnelContent() {
  const { range } = usePeriodFilter();
  const { data, isLoading } = useFunnelData();

  const insights = useMemo(
    () => (data ? funnelInsights({ ...data, previousLabel: range.prevLabel }) : null),
    [data, range.prevLabel],
  );

  if (isLoading || !insights) {
    return <div className="h-72 rounded-2xl bg-muted/60 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="funil-insights" className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 id="funil-insights" className="text-base font-semibold flex items-center gap-2 mb-1">
          <Lightbulb className="h-5 w-5 text-warning-strong" /> Insights inteligentes
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Leitura automática dos números do período contra as metas do objetivo central.</p>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há movimento suficiente no período para uma leitura.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {insights.map((ins, i) => {
              const tone = TONE[ins.tone];
              const Icon = tone.icon;
              return (
                <li key={i} className={cn('rounded-xl border p-4', tone.cls)}>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {ins.title}
                    <span className="sr-only">({tone.label})</span>
                  </p>
                  <p className="mt-1.5 text-sm text-foreground leading-relaxed">{ins.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Funil de vendas: Comercial 1 → venda, com metas da escada e insights. */
export default function FunilVendas({ embedded = false }: { embedded?: boolean } = {}) {
  useLiveRefresh();
  return (
    <PageShell embedded={embedded} title="Funil de Vendas">
        <FunnelContent />
    </PageShell>
  );
}
