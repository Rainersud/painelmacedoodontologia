import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useClinicGoalsPanel, type Period, type PanelMetric } from '@/hooks/useClinicGoalsPanel';
import { useLTVData } from '@/hooks/useLTVData';
import { summarize } from '@/lib/ltv';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { PaceBar } from '@/components/metrics/PaceBar';
import { STATUS } from '@/components/metrics/status';
import { Fragment, type ReactNode } from 'react';
import { GoalCurve, GoalCurveLegend, Sparkline } from '@/components/charts/SmoothCharts';
import { ChevronRight, Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** Reais sem centavos, para valores grandes. */
const formatWhole = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

const PERIOD_NOUN: Record<Period, string> = { hoje: 'hoje', semana: 'nesta semana', mes: 'neste mês', ano: 'no período' };

/** Etapas do funil, na ordem em que o paciente passa por elas. */
const FUNNEL_KEYS = ['leads', 'agendamentos', 'resgates', 'comparecimentos', 'vendas'];
/** Indicadores de eficiência, mostrados em lista compacta. */
const EFFICIENCY_KEYS = ['ticket_medio', 'tempo_resposta', 'cpl', 'cac', 'roas', 'roi', 'investimento', 'ltv'];

/** O que fazer quando um indicador de eficiência está em Atenção ou Crítico. */
const SUGGESTIONS: Record<string, (m: PanelMetric) => string> = {
  ticket_medio: m => `Ticket ${m.display} contra meta de ${m.targetDisplay}. Apresente o plano completo antes da opção de entrada, ancore com a opção mais completa, ofereça crédito (PAGMAIS / MAIORAL) para viabilizar o tratamento maior e evite desconto sem contrapartida.`,
  tempo_resposta: m => `Primeira resposta em ${m.display} (meta: até 5 min). Ligue ou chame no WhatsApp assim que o lead entrar, divida os leads por atendente com aviso e deixe pronta a mensagem de primeiro contato.`,
  cpl: m => `Lead custando ${m.display} (meta ${m.targetDisplay}). Pause criativos com CPL acima da meta, repita os que trazem lead mais barato, revise público e região e teste novas chamadas na oferta.`,
  cac: m => `Cada venda custando ${m.display} em tráfego (meta ${m.targetDisplay}). Antes de aumentar a verba, suba a conversão: agendamento, confirmações do CRC (24h, 2h, 10 min) e fechamento. Mais vendas com a mesma verba derrubam o CAC.`,
  roas: m => `Retorno bruto de ${m.display} (meta ${m.targetDisplay}). Concentre a verba nas origens e campanhas que mais vendem (ROI Inteligente e Origens abaixo) e recupere orçamentos em aberto no CRC.`,
  roi: m => `Retorno líquido de ${m.display} (meta ${m.targetDisplay}). Corte o que não vende, aumente o ticket médio e trabalhe Não compareceu / Reagendar e Orçamentos em aberto no CRC: é receita sem custo de tráfego novo.`,
  ltv: m => `LTV médio de ${m.display} (meta ${m.targetDisplay}). Trabalhe os retornos do Comercial 2 (atrasados e dos próximos 30 dias), ofereça os tratamentos sugeridos no card e registre cada pagamento no Financeiro da Etapa.`,
  investimento: () => 'Investimento fora do planejado para o período. Confira os lançamentos do CAC & Financeiro.',
};

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

function Delta({ m, prevLabel }: { m: PanelMetric; prevLabel: string }) {
  if (m.delta === 0) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" />igual {prevLabel === 'ontem' ? 'a ontem' : `ao ${prevLabel}`}</span>;
  }
  const good = m.lowerIsBetter ? m.delta < 0 : m.delta > 0;
  const Icon = m.delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1', good ? 'text-success' : 'text-destructive')}>
      <Icon className="h-3 w-3" aria-hidden />
      {m.delta > 0 ? '+' : ''}{m.delta}% <span className="text-muted-foreground">vs {prevLabel}</span>
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
function FunnelStep({ m, prevLabel }: { m: PanelMetric; prevLabel: string }) {
  return (
    <div className="flex flex-col gap-3 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground truncate">{m.label}</h3>
        <StatusTag status={m.status} />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="hero-number text-4xl leading-none">{m.display}</span>
        <span className="text-sm text-muted-foreground">de {m.targetDisplay}</span>
      </p>
      <Sparkline data={m.trend} height={36} tone={m.status === 'critical' && m.delta < 0 ? 'danger' : 'brand'} />
      <PaceBar percentage={m.percentage} expected={m.expectedPercentage} status={m.status} />
      <div className="space-y-1 text-xs">
        {m.rate && (
          <p className="text-foreground">
            {m.rate.label}: <span className="font-semibold">{m.rate.display}</span>
            <span className="text-muted-foreground"> (meta {m.rate.targetDisplay})</span>
          </p>
        )}
        <p><Delta m={m} prevLabel={prevLabel} /></p>
      </div>
    </div>
  );
}

/** `afterRevenue`: bloco mostrado entre o faturamento do período e o funil (ex.: Previsão de Faturamento). */
export function ClinicGoalsPanel({ afterRevenue }: { afterRevenue?: ReactNode } = {}) {
  const { period, customRange, range, anchor } = useLocalPeriod('mes');
  const prevLabel = range.prevLabel ?? 'período anterior';
  const { data, isLoading } = useClinicGoalsPanel(period, customRange, { prevStart: range.prevStart, prevEnd: range.prevEnd }, anchor);
  // LTV oficial vem do Comercial 2 — apenas replicamos o valor
  const ltvData = useLTVData();
  const ltv = ltvData.isLoading ? null : summarize(ltvData.patients);

  const metrics = data?.metrics ?? [];
  const byKey = (k: string) => metrics.find(m => m.key === k);
  const revenue = byKey('faturamento');
  const funnel = FUNNEL_KEYS.map(byKey).filter((m): m is PanelMetric => !!m);
  const efficiency = [
    ...EFFICIENCY_KEYS.map(byKey).filter((m): m is PanelMetric => !!m),
    ...(ltv ? [buildLTVMetric(ltv.avgLtv)] : []),
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
            <span className="text-xs text-muted-foreground rounded-full border px-2.5 py-1">{range.label}</span>
          </div>

          {isLoading && <div className="h-24 rounded-md bg-muted/60 animate-pulse" />}
          {revenue && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Faturamento {/^(Hoje|Esta semana|Este mês|Este ano)$/.test(range.label) ? PERIOD_NOUN[period] : `em ${range.label}`}</p>
                  <p className="hero-number text-5xl sm:text-6xl leading-none mt-1">{formatWhole(revenue.current)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    de {formatWhole(revenue.target)} · <Delta m={revenue} prevLabel={prevLabel} />
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1.5 text-sm">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    revenue.status === 'healthy' ? 'bg-success/10 text-success' : revenue.status === 'warning' ? 'bg-warning/15 text-warning-strong' : 'bg-destructive/10 text-destructive')}>
                    {revenue.status === 'healthy' ? 'No ritmo' : revenue.status === 'warning' ? 'Atenção ao ritmo' : 'Abaixo do ritmo'}
                  </span>
                  {period === 'mes' && data && data.projectedRevenue > 0 && (
                    <span className="text-muted-foreground">
                      No ritmo atual, o mês fecha em <span className="font-semibold text-foreground">{formatWhole(data.projectedRevenue)}</span>
                    </span>
                  )}
                </div>
              </div>
              {data && revenue.trend.length > 1 && (() => {
                // curva acumulada do período contra o ritmo da meta (linha tracejada)
                const now = Date.now();
                let acc = 0;
                const n = revenue.trend.length;
                const points = revenue.trend.map((v, i) => {
                  acc += v;
                  return { label: data.bucketLabels[i] ?? String(i + 1), value: acc, goal: Math.round((revenue.target * (i + 1)) / n) };
                });
                // não desenha o realizado no futuro (dias que ainda não chegaram)
                const elapsed = range.end.getTime() <= now ? n
                  : Math.max(1, Math.min(n, Math.ceil(((now - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * n)));
                const shown = points.map((p, i) => (i < elapsed ? p : { ...p, value: undefined as unknown as number }));
                return (
                  <div className="space-y-2">
                    <GoalCurve points={shown} height={210} format={v => formatWhole(v)} />
                    <GoalCurveLegend />
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {afterRevenue}

      {/* Metas chave: as etapas em sequência, com os resgates */}
      <Card className="monday-card overflow-hidden">
        <div className="flex items-baseline justify-between gap-2 px-5 pt-4">
          <h3 className="text-sm font-semibold tracking-wide">METAS CHAVE</h3>
          <span className="text-xs text-muted-foreground">{range.label}</span>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 xl:divide-x divide-border">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-44 m-4 rounded-md bg-muted/60 animate-pulse" />
          ))}
          {funnel.map((m, i) => (
            <div key={m.key} className="relative">
              <FunnelStep m={m} prevLabel={prevLabel} />
              {i < funnel.length - 1 && (
                <ChevronRight
                  className="hidden xl:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-card text-muted-foreground z-10"
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
                {efficiency.map(m => {
                  const tip = m.status !== 'healthy' ? SUGGESTIONS[m.key]?.(m) : undefined;
                  return (
                  <Fragment key={m.key}>
                  <tr className={cn('border-border', tip ? '' : 'border-b last:border-0')}>
                    <th scope="row" className="text-left font-normal px-5 py-2.5">{m.label}</th>
                    <td className="text-right font-semibold px-3 py-2.5">{m.display}</td>
                    <td className="text-right text-muted-foreground px-3 py-2.5 hidden sm:table-cell">{m.targetDisplay}</td>
                    <td className="px-3 py-1.5 hidden md:table-cell">
                      {m.trend.length > 1 && (
                        <Sparkline data={m.trend} height={22} />
                      )}
                    </td>
                    <td className="px-5 py-2.5"><StatusTag status={m.status} paced={false} /></td>
                  </tr>
                  {tip && (
                    <tr className="border-b border-border last:border-0">
                      <td colSpan={5} className="px-5 pb-3 pt-0">
                        <p className={cn(
                          'flex gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed',
                          m.status === 'critical' ? 'bg-destructive/5 text-foreground' : 'bg-warning/10 text-foreground',
                        )}>
                          <Lightbulb className={cn('h-4 w-4 shrink-0 mt-0.5', m.status === 'critical' ? 'text-destructive' : 'text-warning-strong')} aria-hidden />
                          <span><span className="font-semibold">Como melhorar: </span>{tip}</span>
                        </p>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
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
