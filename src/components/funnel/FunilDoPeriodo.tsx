import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { eachDayOfInterval, eachMonthOfInterval, endOfDay, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { cn } from '@/lib/utils';
import { fetchMetricsData, monthlyGoal, periodGoal, revenue, summarize, type SeriesKey } from '@/lib/metrics';
import { MetricSpark } from '@/components/charts/SmoothCharts';
import { funnelRates, type FunnelNumbers } from '@/lib/funnelInsights';

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Números do período, do período comparado e as metas da escada (objetivo central). */
export function useFunnelData() {
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
      // Curva do faturamento acumulado no período contra o ritmo da meta (dias úteis)
      const days = (cur.end.getTime() - cur.start.getTime()) / 86400000;
      const parts = days <= 62
        ? eachDayOfInterval(cur).map(d => ({ start: startOfDay(d), end: endOfDay(d), label: format(d, 'dd/MM') }))
        : eachMonthOfInterval(cur).map(m => ({ start: startOfMonth(m), end: endOfMonth(m), label: format(m, 'MMM/yy', { locale: ptBR }) }));
      const bizTotal = Math.max(1, calendar.countBusinessDays(cur.start, cur.end));
      let acc = 0;
      const curve = parts.map(p => {
        acc += revenue(data.payments, p);
        const goal = Math.round((target.faturamento * calendar.countBusinessDays(cur.start, p.end)) / bizTotal);
        return { label: p.label, value: p.start <= now ? acc : (undefined as unknown as number), goal };
      });
      const total = calendar.countBusinessDays(cur.start, cur.end);
      const elapsed = calendar.countBusinessDays(cur.start, now > cur.end ? cur.end : now);
      return {
        curve,
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

export function Kpi({ label, value, sub, meta, progress, spark }: { label: string; value: string; sub: string; meta?: string; progress?: number; spark?: SeriesKey }) {
  const p = progress === undefined ? undefined : Math.max(0, Math.min(100, progress));
  return (
    <div className="flex flex-col rounded-xl border bg-muted/30 p-4 min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 hero-number text-3xl leading-none">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground min-h-[2rem]">{sub}</p>
      {spark && <div className="mt-1 -mx-1"><MetricSpark metric={spark} height={30} /></div>}
      {meta && (
        <div className="mt-auto pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">Meta {meta}</span>
            {p !== undefined && <b className={cn('tabular-nums', p >= 100 ? 'text-success' : 'text-foreground')}>{Math.round(p)}%</b>}
          </div>
          {p !== undefined && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={`${label}: progresso da meta`} aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
              <div className={cn('h-full rounded-full', p >= 100 ? 'bg-success' : 'bg-primary')} style={{ width: `${p}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * Funil do período: faturamento contra o ritmo da meta e os 7 indicadores com meta e curva.
 * Fica dentro de "Objetivo central e escada de crescimento" (Metas da clínica); segue o filtro de data do topo.
 */
export function FunilDoPeriodo({ bare = false }: { bare?: boolean }) {
  const { range } = usePeriodFilter();
  const { data, isLoading } = useFunnelData();
  if (isLoading || !data) return <div className="h-72 rounded-2xl bg-muted/60 animate-pulse" />;
  const a = data.actual;
  const t = data.target;
  const r = funnelRates(a);
  const tr = data.targetRates;
  const metaConversao = (tr.agendamento * tr.comparecimento * tr.fechamento) / 10000;
  return (
      <section aria-labelledby="funil-periodo" className={cn(bare ? 'border-t pt-5' : 'monday-card rounded-2xl border bg-card p-5 sm:p-6')}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Filter className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0">
              <h2 id="funil-periodo" className="text-base font-semibold leading-tight">Funil do período</h2>
              <p className="text-xs text-muted-foreground truncate">{range.label} · comparando com {range.prevLabel}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          <Kpi spark="leads" label="Novos leads" value={String(a.leads)} sub="recebidos no período" meta={String(t.leads)} progress={(a.leads / Math.max(1, t.leads)) * 100} />
          <Kpi spark="agendamentos" label="Agendamentos" value={String(a.agendamentos)} sub={`${pct(r.agendamento)} dos leads (meta ${tr.agendamento}%)`} meta={String(t.agendamentos)} progress={(a.agendamentos / Math.max(1, t.agendamentos)) * 100} />
          <Kpi spark="comparecimentos" label="Comparecimentos" value={String(a.comparecimentos)} sub={`${pct(r.comparecimento)} dos agendados (meta ${tr.comparecimento}%)`} meta={String(t.comparecimentos)} progress={(a.comparecimentos / Math.max(1, t.comparecimentos)) * 100} />
          <Kpi spark="vendas" label="Vendas realizadas" value={String(a.vendas)} sub={`${pct(r.fechamento)} dos comparecimentos (meta ${tr.fechamento}%)`} meta={String(t.vendas)} progress={(a.vendas / Math.max(1, t.vendas)) * 100} />
          <Kpi spark="conversao" label="Conversão" value={pct(r.conversao)} sub="de lead para venda" meta={pct(metaConversao)} progress={(r.conversao / Math.max(0.01, metaConversao)) * 100} />
          <Kpi spark="ticket" label="Ticket médio" value={brl(a.ticket)} sub={`${a.vendas} venda(s) no período`} meta={brl(t.ticket)} progress={(a.ticket / Math.max(1, t.ticket)) * 100} />
          <Kpi spark="faturamento" label="Faturamento" value={brl(a.faturamento)} sub={a.faturamento >= t.faturamento ? 'meta batida' : `faltam ${brl(t.faturamento - a.faturamento)}`} meta={brl(t.faturamento)} progress={(a.faturamento / Math.max(1, t.faturamento)) * 100} />
        </div>
      </section>
  );
}

interface FunnelStage { label: string; value: number; sub: string; target: number; rate?: number; meta?: number; rateLabel?: string }

/** Faixas na cor principal do painel, escurecendo a cada etapa; a venda é a mais forte. */
const BAND_COLORS = ['hsl(178 42% 44%)', 'hsl(178 50% 36%)', 'hsl(178 60% 29%)', 'hsl(var(--primary))'];
const STEP = 9; // quanto cada faixa estreita de cada lado (%)

/** Desenho do funil: faixas que estreitam etapa a etapa, com a passagem e a meta ao lado. */
function FunnelDrawing({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,190px)] gap-x-3 sm:gap-x-5" role="list" aria-label="Funil de conversão">
      {stages.map((st, i) => {
        const top = i * STEP;
        const bottom = (i + 1) * STEP;
        const ok = st.rate === undefined || st.rate >= (st.meta ?? 0);
        const rawPct = st.target > 0 ? (st.value / st.target) * 100 : 0;
        const progress = Math.min(100, rawPct);
        const missing = Math.max(0, st.target - st.value);
        return (
          <div key={st.label} className="contents" role="listitem">
            {i > 0 && st.rate !== undefined && (
              <>
                <div className="flex justify-center py-1" aria-hidden>
                  <span className="text-[11px] text-muted-foreground">▼</span>
                </div>
                <div className="flex items-center py-1">
                  <span className={cn(
                    'inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-0.5',
                    ok ? 'border-success/30 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning-strong',
                  )}>
                    <b className="text-sm tabular-nums">{pct(st.rate)}</b>
                    <span className="text-[10px] text-muted-foreground">{st.rateLabel} · meta {st.meta}%</span>
                  </span>
                </div>
              </>
            )}
            <div
              className="relative h-[92px] flex flex-col items-center justify-center text-center text-primary-foreground"
              style={{
                background: BAND_COLORS[i] ?? BAND_COLORS[BAND_COLORS.length - 1],
                clipPath: `polygon(${top}% 0, ${100 - top}% 0, ${100 - bottom}% 100%, ${bottom}% 100%)`,
              }}
            >
              <p className="text-[11px] font-semibold tracking-wide text-white/85">{st.label}</p>
              <p className="hero-number text-3xl sm:text-4xl leading-tight">{st.value}</p>
              <p className="text-[11px] text-white/75">{st.sub}</p>
            </div>
            <div className="flex flex-col justify-center gap-1 text-xs">
              <MetricSpark metric={(['leads', 'agendamentos', 'comparecimentos', 'vendas'] as const)[i] ?? 'vendas'} height={26} />
              <p className="text-muted-foreground">Meta <b className="text-foreground tabular-nums">{st.target}</b></p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={`${st.label}: progresso da meta`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className={cn('h-full rounded-full', progress >= 100 ? 'bg-success' : 'bg-primary')} style={{ width: `${progress}%` }} />
              </div>
              <p className="tabular-nums"><b className={progress >= 100 ? 'text-success' : 'text-foreground'}>{Math.round(rawPct)}%</b> <span className="text-muted-foreground">da meta</span></p>
              <p className={cn('tabular-nums', missing > 0 ? 'text-muted-foreground' : 'text-success font-medium')}>
                {missing > 0 ? <>faltam <b className="text-foreground">{missing}</b></> : 'meta batida'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Funil de conversão: leads → agendados → compareceram → vendas, com a passagem entre etapas
 * e a % da meta. Fica no "Objetivo central e escada de crescimento", logo abaixo do Funil do período.
 */
export function FunilConversao({ bare = false }: { bare?: boolean }) {
  const { range } = usePeriodFilter();
  const { data, isLoading } = useFunnelData();
  if (isLoading || !data) return <div className="h-72 rounded-2xl bg-muted/60 animate-pulse" />;
  const a = data.actual;
  const t = data.target;
  const r = funnelRates(a);
  const tr = data.targetRates;
  const stages: FunnelStage[] = [
    { label: 'Novos leads', value: a.leads, sub: 'entraram no funil', target: t.leads },
    { label: 'Agendamentos', value: a.agendamentos, sub: 'consultas marcadas', rate: r.agendamento, meta: tr.agendamento, rateLabel: 'agendaram', target: t.agendamentos },
    { label: 'Comparecimentos', value: a.comparecimentos, sub: 'vieram à clínica', rate: r.comparecimento, meta: tr.comparecimento, rateLabel: 'compareceram', target: t.comparecimentos },
    { label: 'Vendas realizadas', value: a.vendas, sub: brl(a.faturamento), rate: r.fechamento, meta: tr.fechamento, rateLabel: 'fecharam', target: t.vendas },
  ];
  return (
    <section aria-labelledby="funil-conversao" className={cn(bare ? 'border-t pt-5' : 'monday-card rounded-2xl border bg-card p-5 sm:p-6')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="funil-conversao" className="text-base font-semibold">Funil de conversão</h2>
        <p className="text-xs text-muted-foreground">{range.label}</p>
      </div>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">Leads → agendados → compareceram → vendas: a passagem entre as etapas e, ao lado, a % da meta e quanto falta.</p>
      <FunnelDrawing stages={stages} />
    </section>
  );
}
