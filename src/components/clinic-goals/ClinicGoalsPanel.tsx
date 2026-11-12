import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useClinicGoalsPanel, type Period, type PanelMetric } from '@/hooks/useClinicGoalsPanel';
import { useLTVMetrics } from '@/hooks/useLTVMetrics';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { WidgetPeriodTabs } from '@/components/dashboard/WidgetPeriodTabs';
import { PaceBar } from '@/components/metrics/PaceBar';
import { STATUS } from '@/components/metrics/status';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** Reais sem centavos, para valores grandes. */
const formatWhole = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

const PREV_LABEL: Record<Period, string> = { hoje: 'ontem', semana: 'semana anterior', mes: 'mês anterior', ano: 'período anterior' };
const PERIOD_NOUN: Record<Period, string> = { hoje: 'hoje', semana: 'nesta semana', mes: 'neste mês', ano: 'no período' };

/** Etapas do funil, na ordem em que o paciente passa por elas. */
const FUNNEL_KEYS = ['leads', 'agendamentos', 'comparecimentos', 'vendas'];
/** Indicadores de eficiência, mostrados em lista compacta. */
const EFFICIENCY_KEYS = ['ticket_medio', 'tempo_resposta', 'cpl', 'cac', 'roas', 'roi', 'investimento', 'ltv'];

function buildLTVMetric(overallLTV: number): PanelMetric {
  const target = 15000;
  const status: PanelMetric['status'] =
    overallLTV >= target * 0.85 ? 'healthy' : overallLTV >= target * 0.55 ? 'warning' : 'critical';
  return {
    key: 'ltv',
    label: 'LTV (Comercial 2)',
    current: Math.round(overallLTV),
    target,
    percentage: Math.min(100, Math.round((overallLTV / target) * 100)),
    display: formatWhole(overallLTV),
    targetDisplay: formatWhole(target),
    healthyGoal: 'R$ 15.000',
    status,
    delta: 0,
    trend: [],
    unit: 'currency',
  };
}

function Delta({ m, period }: { m: PanelMetric; period: Period }) {
  if (m.delta === 0) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" />igual {PREV_LABEL[period] === 'ontem' ? 'a ontem' : `ao ${PREV_LABEL[period]}`}</span>;
  }
  const good = m.lowerIsBetter ? m.delta < 0 : m.delta > 0;
  const Icon = m.delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1', good ? 'text-success' : 'text-destructive')}>
      <Icon className="h-3 w-3" aria-hidden />
      {m.delta > 0 ? '+' : ''}{m.delta}% <span className="text-muted-foreground">vs {PREV_LABEL[period]}</span>
    </span>
  );
}

function StatusTag({ status, paced = true }: { status: PanelMetric['status']; paced?: boolean }) {
  const st = STATUS[status];
  const Icon = st.icon;
  // "No ritmo" só faz sentido para metas acumuladas no período; nas demais, "Saudável".
  const label = status === 'healthy' && !paced ? 'Saudável' : st.label;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap', st.text)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** Cartão de uma etapa do funil: valor grande, régua de ritmo e taxa da etapa. */
function FunnelStep({ m, period }: { m: PanelMetric; period: Period }) {
  return (
    <div className="flex flex-col gap-3 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground truncate">{m.label}</h3>
        <StatusTag status={m.status} />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold leading-none tracking-tight">{m.display}</span>
        <span className="text-sm text-muted-foreground">de {m.targetDisplay}</span>
      </p>
      <PaceBar percentage={m.percentage} expected={m.expectedPercentage} status={m.status} />
      <div className="space-y-1 text-xs">
        {m.rate && (
          <p className="text-foreground">
            {m.rate.label}: <span className="font-semibold">{m.rate.display}</span>
            <span className="text-muted-foreground"> (meta {m.rate.targetDisplay})</span>
          </p>
        )}
        <p><Delta m={m} period={period} /></p>
      </div>
    </div>
  );
}

export function ClinicGoalsPanel() {
  const { period, setPeriod, customRange, setCustomRange } = useLocalPeriod('mes');
  const { data, isLoading } = useClinicGoalsPanel(period, customRange);
  // LTV oficial vem do Comercial 2 — apenas replicamos o valor
  const { data: ltv } = useLTVMetrics('todos', 'todos');

  const metrics = data?.metrics ?? [];
  const byKey = (k: string) => metrics.find(m => m.key === k);
  const revenue = byKey('faturamento');
  const funnel = FUNNEL_KEYS.map(byKey).filter((m): m is PanelMetric => !!m);
  const efficiency = [
    ...EFFICIENCY_KEYS.map(byKey).filter((m): m is PanelMetric => !!m),
    ...(ltv ? [buildLTVMetric(ltv.overallLTV)] : []),
  ];

  return (
    <section className="space-y-4" aria-labelledby="metas-titulo">
      {/* Cabeçalho + faturamento do período: o número que a clínica persegue */}
      <Card className="monday-card">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 id="metas-titulo" className="text-lg font-semibold">Metas da clínica</h2>
              {data && (
                <p className="text-sm text-muted-foreground">
                  Dia útil {data.businessDays} de {data.totalBusinessDays}
                </p>
              )}
            </div>
            <WidgetPeriodTabs
              value={period}
              onChange={(p) => setPeriod(p as Period)}
              size="sm"
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>

          {isLoading && <div className="h-24 rounded-md bg-muted/60 animate-pulse" />}
          {revenue && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <p className="text-balance">
                  <span className="block text-sm text-muted-foreground">Faturamento {PERIOD_NOUN[period]}</span>
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight leading-none">
                    {formatWhole(revenue.current)}
                  </span>
                  <span className="ml-2 text-lg text-muted-foreground">de {formatWhole(revenue.target)}</span>
                </p>
                <div className="flex flex-col items-start sm:items-end gap-1 text-sm">
                  <StatusTag status={revenue.status} />
                  {period === 'mes' && data && data.projectedRevenue > 0 && (
                    <span className="text-muted-foreground">
                      No ritmo atual, o mês fecha em <span className="font-semibold text-foreground">{formatWhole(data.projectedRevenue)}</span>
                    </span>
                  )}
                </div>
              </div>
              <PaceBar
                percentage={revenue.percentage}
                expected={revenue.expectedPercentage}
                status={revenue.status}
                className="[&>div:first-child]:h-3"
              />
              <p className="text-xs text-muted-foreground">
                {revenue.expectedPercentage !== undefined && (
                  <>A marca na barra mostra onde o faturamento deveria estar hoje ({revenue.expectedPercentage}% da meta). </>
                )}
                <Delta m={revenue} period={period} />
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funil: as quatro etapas em sequência */}
      <Card className="monday-card overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-border">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 m-4 rounded-md bg-muted/60 animate-pulse" />
          ))}
          {funnel.map((m, i) => (
            <div key={m.key} className="relative">
              <FunnelStep m={m} period={period} />
              {i < funnel.length - 1 && (
                <ChevronRight
                  className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-card text-muted-foreground z-10"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Eficiência: lista compacta, um indicador por linha */}
      {efficiency.length > 0 && (
        <Card className="monday-card">
          <CardContent className="p-0">
            <h3 className="px-5 pt-4 pb-2 text-sm font-semibold">Eficiência</h3>
            <table className="w-full text-sm sm:[&_th:first-child]:w-1/3">
              <caption className="sr-only">Indicadores de eficiência do período</caption>
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th scope="col" className="text-left font-medium px-5 py-2">Indicador</th>
                  <th scope="col" className="text-right font-medium px-3 py-2">Atual</th>
                  <th scope="col" className="text-right font-medium px-3 py-2 hidden sm:table-cell">Meta</th>
                  <th scope="col" className="text-left font-medium px-3 py-2 hidden md:table-cell w-32">Tendência</th>
                  <th scope="col" className="text-left font-medium px-5 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {efficiency.map(m => (
                  <tr key={m.key} className="border-b border-border last:border-0">
                    <th scope="row" className="text-left font-normal px-5 py-2.5">{m.label}</th>
                    <td className="text-right font-semibold px-3 py-2.5">{m.display}</td>
                    <td className="text-right text-muted-foreground px-3 py-2.5 hidden sm:table-cell">{m.targetDisplay}</td>
                    <td className="px-3 py-1.5 hidden md:table-cell">
                      {m.trend.length > 1 && (
                        <Sparkline data={m.trend} height={22} strokeClassName="stroke-chart-1" fillClassName="fill-chart-1/10" />
                      )}
                    </td>
                    <td className="px-5 py-2.5"><StatusTag status={m.status} paced={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.insights.length > 0 && (
        <Card className="monday-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-2">O que olhar agora</h3>
            <ul className="space-y-1.5 text-sm list-disc pl-5 marker:text-muted-foreground">
              {data.insights.map((ins, i) => <li key={i}>{ins}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
