import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PeriodFilterProvider, usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { MasterPeriodFilter } from '@/components/dashboard/MasterPeriodFilter';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { cn } from '@/lib/utils';
import { fetchMetricsData, monthlyGoal, periodGoal, summarize } from '@/lib/metrics';
import { funnelInsights, funnelRates, type FunnelNumbers, type InsightTone } from '@/lib/funnelInsights';

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Números do período, do período comparado e as metas da escada (objetivo central). */
function useFunnelData() {
  const { range, period } = usePeriodFilter();
  return useQuery({
    queryKey: ['funil-vendas', range.start.toISOString(), range.end.toISOString(), range.prevStart.toISOString(), range.prevEnd.toISOString()],
    queryFn: async () => {
      const cur = { start: range.start, end: range.end };
      const prev = { start: range.prevStart, end: range.prevEnd };
      const data = await fetchMetricsData({ start: prev.start < cur.start ? prev.start : cur.start, end: cur.end });
      const toNumbers = (r: typeof cur): FunnelNumbers => {
        const m = summarize(data, r);
        return { leads: m.newLeads, agendamentos: m.booked, comparecimentos: m.attendances, vendas: m.sales, faturamento: m.revenue, ticket: m.averageTicket };
      };
      const { settings: s, calendar } = data;
      const target: FunnelNumbers = {
        leads: periodGoal(s, 'leads', cur, calendar),
        agendamentos: periodGoal(s, 'agendamentos', cur, calendar),
        comparecimentos: periodGoal(s, 'comparecimentos', cur, calendar),
        vendas: periodGoal(s, 'vendas', cur, calendar),
        faturamento: periodGoal(s, 'faturamento', cur, calendar),
        ticket: monthlyGoal(s, 'ticket_medio'),
      };
      const now = new Date();
      const total = calendar.countBusinessDays(cur.start, cur.end);
      const elapsed = calendar.countBusinessDays(cur.start, now > cur.end ? cur.end : now);
      return {
        actual: toNumbers(cur),
        previous: toNumbers(prev),
        target,
        targetRates: {
          agendamento: monthlyGoal(s, 'taxa_agendamento'),
          comparecimento: monthlyGoal(s, 'taxa_comparecimento'),
          fechamento: monthlyGoal(s, 'taxa_fechamento'),
        },
        pace: total > 0 ? Math.min(1, Math.max(elapsed, period === 'hoje' ? 1 : 0) / total) : 1,
      };
    },
    refetchInterval: 60_000,
  });
}

function Kpi({ n, label, value, sub, meta, progress }: { n: string; label: string; value: string; sub: string; meta?: string; progress?: number }) {
  const p = progress === undefined ? undefined : Math.max(0, Math.min(100, progress));
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4 min-w-0">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-emerald-100/80">
        <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] text-emerald-300 tabular-nums">{n}</span>
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-white leading-none">{value}</p>
      <p className="mt-2 text-xs text-emerald-100/70 min-h-[2rem]">{sub}</p>
      {meta && (
        <div className="mt-auto pt-2 space-y-1.5">
          <span className="inline-block rounded-md bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">Meta: {meta}</span>
          {p !== undefined && (
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${p}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FunnelStage { label: string; value: number; sub: string; target: number; rate?: number; meta?: number; rateLabel?: string }

/** Cores das faixas, de cima (mais largo) para baixo; a venda fica em destaque. */
const BAND_COLORS = ['#3d8c6f', '#33795f', '#29664f', '#10b981'];
const STEP = 9; // quanto cada faixa estreita de cada lado (%)

/** Desenho do funil: faixas que estreitam etapa a etapa, com a passagem e a meta ao lado. */
function FunnelDrawing({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,190px)] gap-x-3 sm:gap-x-5" role="list" aria-label="Funil de conversão">
      {stages.map((st, i) => {
        const top = i * STEP;
        const bottom = (i + 1) * STEP;
        const ok = st.rate === undefined || st.rate >= (st.meta ?? 0);
        const progress = st.target > 0 ? Math.min(100, (st.value / st.target) * 100) : 0;
        return (
          <div key={st.label} className="contents" role="listitem">
            {i > 0 && st.rate !== undefined && (
              <>
                <div className="flex justify-center py-1" aria-hidden>
                  <span className="text-[11px] text-emerald-100/60">▼</span>
                </div>
                <div className="flex items-center py-1">
                  <span className={cn(
                    'inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-0.5',
                    ok ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-amber-300/40 bg-amber-300/10 text-amber-200',
                  )}>
                    <b className="text-sm tabular-nums">{pct(st.rate)}</b>
                    <span className="text-[10px] text-emerald-100/80">{st.rateLabel} · meta {st.meta}%</span>
                  </span>
                </div>
              </>
            )}
            <div
              className="relative h-[92px] flex flex-col items-center justify-center text-center text-white"
              style={{
                background: BAND_COLORS[i] ?? BAND_COLORS[BAND_COLORS.length - 1],
                clipPath: `polygon(${top}% 0, ${100 - top}% 0, ${100 - bottom}% 100%, ${bottom}% 100%)`,
              }}
            >
              <p className="text-[11px] font-semibold tracking-wide text-white/85">{st.label}</p>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight">{st.value}</p>
              <p className="text-[11px] text-white/75">{st.sub}</p>
            </div>
            <div className="flex flex-col justify-center gap-1.5 text-xs text-emerald-100/80">
              <p>Meta <b className="text-white tabular-nums">{st.target}</b></p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-label={`${st.label}: progresso da meta`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className={cn('h-full rounded-full', progress >= 100 ? 'bg-emerald-400' : 'bg-emerald-400/60')} style={{ width: `${progress}%` }} />
              </div>
              <p className="tabular-nums">{Math.round(progress)}% da meta</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TONE: Record<InsightTone, { icon: typeof XCircle; cls: string; label: string }> = {
  critical: { icon: XCircle, cls: 'border-destructive/30 bg-destructive/5 text-destructive', label: 'Crítico' },
  warning: { icon: AlertTriangle, cls: 'border-warning/40 bg-warning/10 text-warning-strong', label: 'Atenção' },
  good: { icon: CheckCircle2, cls: 'border-success/30 bg-success/5 text-success', label: 'Bom sinal' },
};

function FunnelContent() {
  const { range } = usePeriodFilter();
  const { data, isLoading } = useFunnelData();

  const view = useMemo(() => {
    if (!data) return null;
    const a = data.actual;
    const t = data.target;
    const r = funnelRates(a);
    const metaConversao = (data.targetRates.agendamento * data.targetRates.comparecimento * data.targetRates.fechamento) / 10000;
    const insights = funnelInsights({ ...data, previousLabel: range.prevLabel });
    return { a, t, r, metaConversao, insights };
  }, [data, range.prevLabel]);

  if (isLoading || !view || !data) {
    return <div className="h-72 rounded-2xl bg-muted/60 animate-pulse" />;
  }
  const { a, t, r, metaConversao, insights } = view;
  const tr = data.targetRates;
  const stages = [
    { label: 'Novos leads', value: a.leads, sub: 'entraram no funil' },
    { label: 'Agendamentos', value: a.agendamentos, sub: 'consultas marcadas', rate: r.agendamento, meta: tr.agendamento, rateLabel: 'agendaram' },
    { label: 'Comparecimentos', value: a.comparecimentos, sub: 'vieram à clínica', rate: r.comparecimento, meta: tr.comparecimento, rateLabel: 'compareceram' },
    { label: 'Vendas realizadas', value: a.vendas, sub: brl(a.faturamento), rate: r.fechamento, meta: tr.fechamento, rateLabel: 'fecharam' },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="funil-periodo" className="rounded-2xl bg-gradient-to-br from-[#0f2e25] to-[#0a1f19] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 id="funil-periodo" className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Funil do período</h2>
          <p className="text-sm text-emerald-100/80">{range.label}</p>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          <Kpi n="01" label="Novos leads" value={String(a.leads)} sub="recebidos no período" meta={String(t.leads)} progress={(a.leads / Math.max(1, t.leads)) * 100} />
          <Kpi n="02" label="Agendamentos" value={String(a.agendamentos)} sub={`${pct(r.agendamento)} dos leads (meta ${tr.agendamento}%)`} meta={String(t.agendamentos)} progress={(a.agendamentos / Math.max(1, t.agendamentos)) * 100} />
          <Kpi n="03" label="Comparecimentos" value={String(a.comparecimentos)} sub={`${pct(r.comparecimento)} dos agendados (meta ${tr.comparecimento}%)`} meta={String(t.comparecimentos)} progress={(a.comparecimentos / Math.max(1, t.comparecimentos)) * 100} />
          <Kpi n="04" label="Vendas realizadas" value={String(a.vendas)} sub={`${pct(r.fechamento)} dos comparecimentos (meta ${tr.fechamento}%)`} meta={String(t.vendas)} progress={(a.vendas / Math.max(1, t.vendas)) * 100} />
          <Kpi n="05" label="Conversão" value={pct(r.conversao)} sub="de lead para venda" meta={pct(metaConversao)} progress={(r.conversao / Math.max(0.01, metaConversao)) * 100} />
          <Kpi n="06" label="Ticket médio" value={brl(a.ticket)} sub={`${a.vendas} venda(s) no período`} meta={brl(t.ticket)} progress={(a.ticket / Math.max(1, t.ticket)) * 100} />
          <Kpi n="07" label="Faturamento" value={brl(a.faturamento)} sub={a.faturamento >= t.faturamento ? 'meta batida' : `faltam ${brl(t.faturamento - a.faturamento)}`} meta={brl(t.faturamento)} progress={(a.faturamento / Math.max(1, t.faturamento)) * 100} />
        </div>
      </section>

      <section aria-labelledby="funil-conversao" className="rounded-2xl bg-gradient-to-br from-[#0f2e25] to-[#0a1f19] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="funil-conversao" className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Funil de conversão</h2>
          <p className="text-sm text-emerald-100/80">{range.label}</p>
        </div>
        <p className="mt-2 mb-5 text-sm text-emerald-100/80">Leads → agendados → compareceram → vendas, com a taxa de passagem entre cada etapa e a meta.</p>
        <FunnelDrawing stages={stages.map((st, i) => ({ ...st, target: [t.leads, t.agendamentos, t.comparecimentos, t.vendas][i] }))} />
      </section>

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
      <PeriodFilterProvider>
        <div className="space-y-6">
          <MasterPeriodFilter />
          <FunnelContent />
        </div>
      </PeriodFilterProvider>
    </PageShell>
  );
}
