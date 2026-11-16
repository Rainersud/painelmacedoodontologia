import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useClinicGoalsPanel, type PanelMetric } from '@/hooks/useClinicGoalsPanel';
import { useLTVData } from '@/hooks/useLTVData';
import { summarize } from '@/lib/ltv';
import { useLocalPeriod } from '@/components/dashboard/PeriodFilterContext';
import { STATUS } from '@/components/metrics/status';
import { type ReactNode } from 'react';
import { Sparkline } from '@/components/charts/SmoothCharts';
import { Lightbulb } from 'lucide-react';

/** Reais sem centavos, para valores grandes. */
const formatWhole = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;


/** Etapas do funil, na ordem em que o paciente passa por elas. */
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

/** `afterRevenue`: bloco mostrado entre o faturamento do período e o funil (ex.: Previsão de Faturamento). */
export function ClinicGoalsPanel({ afterRevenue }: { afterRevenue?: ReactNode } = {}) {
  const { period, customRange, range, anchor } = useLocalPeriod('mes');
  const { data } = useClinicGoalsPanel(period, customRange, { prevStart: range.prevStart, prevEnd: range.prevEnd }, anchor);
  // LTV oficial vem do Comercial 2 — apenas replicamos o valor
  const ltvData = useLTVData();
  const ltv = ltvData.isLoading ? null : summarize(ltvData.patients);

  const metrics = data?.metrics ?? [];
  const byKey = (k: string) => metrics.find(m => m.key === k);
  const efficiency = [
    ...EFFICIENCY_KEYS.map(byKey).filter((m): m is PanelMetric => !!m),
    ...(ltv ? [buildLTVMetric(ltv.avgLtv)] : []),
  ];

  return (
    <section className="space-y-4" aria-label="Eficiência e o que olhar agora">
      {afterRevenue}

      {/* Eficiência: um cartão por indicador, os que pedem atenção primeiro */}
      {efficiency.length > 0 && (() => {
        const ordem = { critical: 0, warning: 1, healthy: 2 } as const;
        const lista = [...efficiency].sort((a, b) => ordem[a.status] - ordem[b.status]);
        const conta = (st: PanelMetric['status']) => efficiency.filter(m => m.status === st).length;
        return (
          <Card className="monday-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Eficiência</h3>
                  <p className="text-sm text-muted-foreground">Quanto custa e quanto rende cada venda. Os que pedem atenção aparecem primeiro.</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs" aria-label="Resumo">
                  {(['critical', 'warning', 'healthy'] as const).map(st => conta(st) > 0 && (
                    <span key={st} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium', STATUS[st].soft, STATUS[st].text)}>
                      {conta(st)} {st === 'healthy' ? (conta(st) === 1 ? 'saudável' : 'saudáveis') : st === 'warning' ? 'em atenção' : (conta(st) === 1 ? 'crítico' : 'críticos')}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {lista.map(m => {
                  const tip = m.status !== 'healthy' ? SUGGESTIONS[m.key]?.(m) : undefined;
                  const st = STATUS[m.status];
                  return (
                    <li key={m.key} className={cn('rounded-2xl border p-4 flex flex-col gap-2', m.status === 'critical' ? 'border-destructive/30' : m.status === 'warning' ? 'border-warning/40' : '')}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{m.label}</p>
                        <StatusTag status={m.status} paced={false} />
                      </div>
                      <p className="hero-number text-3xl leading-none">{m.display}</p>
                      <p className="text-xs text-muted-foreground">meta {m.targetDisplay}</p>
                      {m.trend.length > 1 && <Sparkline data={m.trend} height={30} tone={m.status === 'critical' ? 'danger' : 'brand'} />}
                      {tip && (
                        <details className={cn('mt-auto rounded-lg px-3 py-2 text-xs', st.soft)}>
                          <summary className="cursor-pointer font-medium flex items-center gap-1.5 list-none">
                            <Lightbulb className={cn('h-3.5 w-3.5 shrink-0', st.text)} aria-hidden /> Como melhorar
                          </summary>
                          <p className="mt-1.5 leading-relaxed text-foreground">{tip}</p>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

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
