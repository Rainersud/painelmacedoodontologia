import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ChevronRight, Loader2, SlidersHorizontal, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { FunilConversao, FunilDoPeriodo } from '@/components/funnel/FunilDoPeriodo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMetaSettings } from '@/hooks/useMetaSettings';
import { usePlanoIncentivo, type CountKey } from '@/hooks/usePlanoIncentivo';
import { useGlobalMonth } from '@/hooks/useGlobalPeriodText';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { MetricSpark, Sparkline } from '@/components/charts/SmoothCharts';
import { ptBR } from 'date-fns/locale';
import { refreshAfterSettingsChange } from '@/lib/refresh';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  LADDER_SHARES, businessDaysPerMonth, deriveGoalLadder, ladderShare, volumeFactor,
  type GoalLadder, type LadderShareKey, type MetaSettingsMap,
} from '@/lib/metrics';

const BRL = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const NUM = (v: number) => Math.round(v).toLocaleString('pt-BR');
const PCT = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

async function upsertSetting(key: string, value: number, userId?: string) {
  const { data: existing } = await supabase.from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('meta_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() }).eq('setting_key', key);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('meta_settings')
      .insert({ setting_key: key, setting_value: value, description: `Meta: ${key}`, created_by: userId });
    if (error) throw error;
  }
}

interface Row {
  label: string;
  month: number;
  fmt: (v: number) => string;
  note: string;
  owner?: string;
  actual?: CountKey;
  /** começa um bloco novo (sem seta) */
  group?: boolean;
  /** degrau da escada principal */
  step?: boolean;
  /** como sai do degrau anterior (ex.: "÷ ticket R$ 3.700") */
  via?: string;
  bloco?: 'relacionamento' | 'origem';
}

function ladderRows(l: GoalLadder, s: MetaSettingsMap, owner: (k: string) => string | undefined): Row[] {
  const share = (k: LadderShareKey) => `${PCT(ladderShare(s, k))} dos leads`;
  return [
    { label: 'Faturamento', month: l.faturamento, fmt: BRL, note: 'objetivo central', actual: 'faturamento', step: true },
    { label: 'Vendas realizadas', month: l.vendas, fmt: NUM, note: `faturamento ÷ ticket de ${BRL(l.ticket)}`, owner: owner('comercial'), actual: 'vendas', step: true, via: `÷ ticket ${BRL(l.ticket)}` },
    { label: 'Comparecimentos', month: l.comparecimentos, fmt: NUM, note: `vendas ÷ ${l.taxaFechamento}% de fechamento`, owner: owner('atendimento'), actual: 'comparecimentos', step: true, via: `÷ ${l.taxaFechamento}% fecham` },
    { label: 'Agendamentos', month: l.agendamentos, fmt: NUM, note: `comparecimentos ÷ ${l.taxaComparecimento}% de comparecimento`, owner: owner('atendimento'), actual: 'agendamentos', step: true, via: `÷ ${l.taxaComparecimento}% comparecem` },
    { label: 'Novos leads', month: l.leads, fmt: NUM, note: `agendamentos ÷ ${l.taxaAgendamento}% de agendamento`, owner: owner('comercial'), actual: 'leads', step: true, via: `÷ ${l.taxaAgendamento}% agendam` },
    { label: 'Investimento em tráfego', month: l.investimento, fmt: BRL, note: `leads × CPL de ${BRL(l.cpl)}`, step: true, via: `× CPL ${BRL(l.cpl)}` },
    { label: 'Resgates', month: l.resgates, fmt: NUM, note: share('resgates'), owner: owner('atendimento'), actual: 'resgates', group: true, bloco: 'relacionamento' },
    { label: 'Indicações coletadas', month: l.indicacoes, fmt: NUM, note: share('indicacoes'), owner: owner('indicacoes'), actual: 'indicacoes', bloco: 'relacionamento' },
    { label: 'Prospecção Ativa', month: l.prospeccao_ativa, fmt: NUM, note: share('prospeccao_ativa'), actual: 'prospeccao_ativa', group: true, bloco: 'origem' },
    { label: 'Indicação de Parceria', month: l.indicacao_parceria, fmt: NUM, note: share('indicacao_parceria'), actual: 'indicacao_parceria', bloco: 'origem' },
    { label: 'Social Selling', month: l.social_selling, fmt: NUM, note: share('social_selling'), actual: 'social_selling', bloco: 'origem' },
  ];
}


type Plano = ReturnType<typeof usePlanoIncentivo>['data'];
/** recorte do filtro de data: nome, dias úteis e datas */
type Periodo = { label: string; bizDays: number; range: { start: Date; end: Date }; share: number };

function Progress({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', p >= 100 ? 'bg-success' : 'bg-primary')} style={{ width: `${p}%` }} />
    </div>
  );
}

function OwnerChip({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center">{name.charAt(0)}</span>
      {name}
    </span>
  );
}

/** Anel de progresso: quanto da meta do período já foi feito. */
function Ring({ pct, size = 64 }: { pct?: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  const done = (pct ?? 0) >= 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        {p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeLinecap="round" strokeWidth={stroke}
            stroke={done ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
            strokeDasharray={`${(p / 100) * c} ${c}`} className="transition-all duration-500" />
        )}
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums', done && 'text-success')}>
        {pct === undefined ? '—' : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

/** Um degrau: anel com a % da meta do período, realizado contra a meta e a curva do período. */
function StepCard({ r, changed, plano, periodo, index }: {
  r: Row; changed: boolean; plano: Plano; periodo: Periodo; index?: number; days?: number; compact?: boolean;
}) {
  const actual = r.actual && plano ? plano.periodActuals[r.actual] : undefined;
  const meta = r.month * periodo.share;
  const pct = actual !== undefined && meta > 0 ? (actual / meta) * 100 : undefined;
  return (
    <div className={cn('h-full rounded-2xl border bg-card p-4 flex flex-col gap-3', index === 1 && 'border-primary/40 bg-primary/5')}>
      <div className="min-w-0 space-y-1">
        {r.via && <p className="text-[11px] text-muted-foreground">{r.via}</p>}
        <p className="text-sm font-semibold leading-tight">
          {index !== undefined && <span className="text-muted-foreground font-normal mr-1">{index}.</span>}{r.label}
        </p>
        <OwnerChip name={r.owner} />
      </div>
      <div className="flex items-center gap-3">
        <Ring pct={pct} />
        <div className="min-w-0">
          {actual !== undefined ? (
            <>
              <p className="hero-number text-3xl leading-none tabular-nums">{r.fmt(actual)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                de <b className={cn('font-semibold text-foreground', changed && 'text-primary')}>{r.fmt(meta)}</b>
              </p>
            </>
          ) : (
            <>
              <p className={cn('hero-number text-2xl leading-none tabular-nums', changed && 'text-primary')}>{r.fmt(meta)}</p>
              <p className="mt-1 text-xs text-muted-foreground">meta · realizado no CAC</p>
            </>
          )}
        </div>
      </div>
      <div className="mt-auto">
        {r.actual && plano
          ? <Sparkline data={plano.periodSeries[r.actual] ?? []} height={30} />
          : <MetricSpark metric="investimento" height={30} range={periodo.range} />}
      </div>
    </div>
  );
}

/** Faturamento do mês contra a meta, com o ritmo esperado pelos dias úteis. */
function MonthProgress({ faturamentoMeta, faturamentoReal, vendasMeta, vendasReal, serie, mes, diaMeta, semanaMeta }: {
  faturamentoMeta: number; faturamentoReal?: number; vendasMeta: number; vendasReal?: number; serie: number[]; mes: string; diaMeta: number; semanaMeta: number;
}) {
  const real = faturamentoReal ?? 0;
  const pct = faturamentoMeta > 0 ? (real / faturamentoMeta) * 100 : 0;
  const falta = Math.max(0, faturamentoMeta - real);
  let acc = 0;
  const acumulado = serie.map(v => (acc += v));
  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold first-letter:uppercase">{mes}</p>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', pct >= 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
          {Math.round(pct)}% da meta do período
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Faturado</p>
          <p className="hero-number text-4xl leading-none">{BRL(real)}</p>
        </div>
        <div className="text-sm text-muted-foreground pb-0.5">
          de <b className="text-foreground">{BRL(faturamentoMeta)}</b>
          {falta > 0 ? <> · faltam <b className="text-foreground">{BRL(falta)}</b></> : ' · objetivo batido'}
        </div>
      </div>
      <Progress pct={pct} />
      <Sparkline data={acumulado} height={56} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/40 p-2">
          <p className="hero-number text-xl">{vendasReal ?? 0}<span className="text-sm text-muted-foreground"> / {NUM(vendasMeta)}</span></p>
          <p className="text-[11px] text-muted-foreground">vendas</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-2">
          <p className="hero-number text-xl">{BRL(diaMeta)}</p>
          <p className="text-[11px] text-muted-foreground">por dia útil</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-2">
          <p className="hero-number text-xl">{BRL(semanaMeta)}</p>
          <p className="text-[11px] text-muted-foreground">por semana</p>
        </div>
      </div>
    </div>
  );
}

/** A mesma escada em tabela, para quem prefere ver tudo de uma vez. */
function LadderTable({ rows, days, changed, plano, periodo }: {
  rows: Row[]; days: number; changed: boolean; plano: Plano; periodo: Periodo;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted-foreground text-left border-b">
            <th className="font-medium py-2 pr-3">Meta</th>
            <th className="font-medium py-2 px-3">Responsável</th>
            <th className="font-medium py-2 px-3 text-right">Mês</th>
            <th className="font-medium py-2 px-3 text-right">Semana</th>
            <th className="font-medium py-2 px-3 text-right">Dia útil</th>
            <th className="font-medium py-2 pl-3 text-right">Realizado · {periodo.label}</th>
            <th className="font-medium py-2 pl-3 w-28">Tendência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const actual = r.actual && plano ? plano.periodActuals[r.actual] : undefined;
            const meta = r.month * periodo.share;
            const pct = actual !== undefined && meta > 0 ? Math.round((actual / meta) * 100) : undefined;
            return (
              <tr key={r.label} className={cn('border-b last:border-0', r.group && 'border-t-2 border-t-border')}>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1.5 font-medium">
                    {i > 0 && !r.group && <ArrowDown className="h-3 w-3 text-muted-foreground" aria-hidden />}
                    {r.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{r.note}</span>
                </td>
                <td className="py-2 px-3 text-xs">{r.owner ?? <span className="text-muted-foreground">—</span>}</td>
                <td className={cn('py-2 px-3 text-right tabular-nums font-semibold', changed && 'text-primary')}>{r.fmt(r.month)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.fmt((r.month * 5) / days)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{r.fmt(r.month / days)}</td>
                <td className="py-2 pl-3 text-right tabular-nums">
                  {actual === undefined ? <span className="text-muted-foreground">—</span> : (
                    <>
                      {r.fmt(actual)}
                      <span className={cn('block text-[11px]', (pct ?? 0) >= 100 ? 'text-success' : 'text-muted-foreground')}>{pct}%</span>
                    </>
                  )}
                </td>
                <td className="py-2 pl-3 w-28">
                  {r.actual && plano
                    ? <Sparkline data={plano.periodSeries[r.actual] ?? []} height={26} />
                    : <MetricSpark metric="investimento" height={26} range={periodo.range} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const RATE_FIELDS = [
  ['taxa_agendamentos', 'Agendamento (% dos leads)'],
  ['taxa_comparecimentos', 'Comparecimento (% dos agendados)'],
  ['taxa_fechamentos', 'Fechamento (% dos comparecidos)'],
  ['meta_cpl', 'CPL meta (R$ por lead)'],
  ['meta_cac', 'CAC meta (R$ por venda)'],
  ['meta_roi', 'ROI meta (x)'],
] as const;

/**
 * Objetivo central + escada de crescimento: o faturamento do mês e o ticket médio mandam
 * em todas as metas (volume, resgates, indicações, origens) e no Plano de Incentivo.
 */
export function GoalLadderCard() {
  const { data: settings, isLoading } = useMetaSettings();
  // realizado = mês da data escolhida no filtro global
  const { month: globalMonth } = useGlobalMonth();
  const monthKey = `${globalMonth.getFullYear()}-${globalMonth.getMonth()}`;
  const planoMonth = useMemo(() => new Date(globalMonth.getFullYear(), globalMonth.getMonth(), 15), [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // realizado, % e curvas seguem o filtro de data do topo (dia, semana, mês, ano ou personalizado)
  const { range: gRange, period: gPeriod } = usePeriodFilter();
  const sel = useMemo(() => ({ start: gRange.start, end: gRange.end }), [gRange.start.getTime(), gRange.end.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: plano } = usePlanoIncentivo(planoMonth, gPeriod === 'hoje' ? 'dia' : gPeriod === 'semana' ? 'semana' : 'mes', sel);
  const { user, canManage: isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const s = (settings ?? {}) as MetaSettingsMap;
  const ladder = useMemo(() => deriveGoalLadder(s), [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = businessDaysPerMonth(s);
  // meta do período = meta do mês × (dias úteis do período ÷ dias úteis do mês); o mês inteiro dá a própria meta
  const periodo: Periodo = {
    label: gRange.label, bizDays: plano?.periodBizDays ?? days, range: sel,
    // dia sem expediente (domingo, feriado): usa a meta de 1 dia útil, para não mostrar "de 0"
    share: plano ? Math.max(1, plano.periodBizDays) / plano.monthBizDays : 1,
  };

  // edição direta do faturamento e do ticket: a escada mostra o resultado antes de salvar
  const [fatN, setFat] = useState(0);
  const [ticketN, setTicket] = useState(0);
  useEffect(() => { setFat(ladder.faturamento); setTicket(ladder.ticket); }, [ladder.faturamento, ladder.ticket]);
  const draftValid = fatN > 0 && ticketN > 0;
  const changed = draftValid && (fatN !== ladder.faturamento || ticketN !== ladder.ticket);
  const draft: MetaSettingsMap = changed ? { ...s, meta_faturamento: fatN, meta_ticket_medio: ticketN } : s;
  const shown = changed ? deriveGoalLadder(draft) : ladder;
  const factor = changed ? volumeFactor(s, draft) : 1;
  const [saving, setSaving] = useState(false);

  const saveObjective = async () => {
    if (!changed) return;
    setSaving(true);
    try {
      await upsertSetting('meta_faturamento', fatN, user?.id);
      await upsertSetting('meta_ticket_medio', ticketN, user?.id);
      await refreshAfterSettingsChange(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success(`Objetivo salvo. Todas as metas e o plano de incentivo foram recalculados (${factor >= 1 ? '+' : ''}${Math.round((factor - 1) * 100)}%).`);
    } catch (e) {
      toast.error(`O objetivo não foi salvo. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // taxas do funil e fatias dos leads (menos usadas): no diálogo
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    const f: Record<string, string> = {
      taxa_agendamentos: String(ladder.taxaAgendamento),
      taxa_comparecimentos: String(ladder.taxaComparecimento),
      taxa_fechamentos: String(ladder.taxaFechamento),
      meta_cpl: String(ladder.cpl),
      meta_cac: String(Number(s.meta_cac) || 300),
      meta_roi: String(Number(s.meta_roi) || 8),
    };
    (Object.keys(LADDER_SHARES) as LadderShareKey[]).forEach(k => { f[LADDER_SHARES[k].key] = String(ladderShare(s, k)); });
    setForm(f);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const formValid = Object.values(form).every(v => Number(v) > 0)
    && ['taxa_agendamentos', 'taxa_comparecimentos', 'taxa_fechamentos'].every(k => Number(form[k]) <= 100);
  const saveAdvanced = async () => {
    setSaving(true);
    try {
      for (const [k, v] of Object.entries(form)) await upsertSetting(k, Number(v), user?.id);
      await refreshAfterSettingsChange(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success('Taxas e proporções salvas. As metas foram recalculadas.');
      setOpen(false);
    } catch (e) {
      toast.error(`Não foi possível salvar. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const ownerOf = (k: string) => plano?.groups.find(g => g.group === k)?.owner;
  const rows = ladderRows(shown, changed ? draft : s, ownerOf);
  const [view, setView] = useState<'cartoes' | 'tabela'>(() => {
    try { return localStorage.getItem('escada-view') === 'tabela' ? 'tabela' : 'cartoes'; } catch { return 'cartoes'; }
  });
  useEffect(() => { try { localStorage.setItem('escada-view', view); } catch { /* sem storage */ } }, [view]);

  return (
    <Card className="monday-card">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Objetivo central e escada de crescimento
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              O faturamento do mês e o ticket médio mandam em tudo: metas de volume, resgates, indicações, origens e o
              Plano de Incentivo sobem ou descem na mesma proporção.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Taxas e proporções
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 rounded-md bg-muted/60 animate-pulse" />
        ) : (
          <div className="space-y-6">
            {/* 1. Objetivo do mês: o que se edita e quanto já foi feito */}
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                <p className="text-sm font-semibold">Objetivo do mês</p>
                <div className="space-y-1">
                  <Label htmlFor="obj-fat" className="text-xs text-muted-foreground">Faturamento do mês (R$)</Label>
                  {isAdmin ? (
                    <CurrencyInput id="obj-fat" value={fatN} onChange={setFat}
                      className="h-11 text-2xl font-bold tabular-nums bg-card" />
                  ) : <p className="text-3xl font-bold tabular-nums">{BRL(ladder.faturamento)}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="obj-ticket" className="text-xs text-muted-foreground">Ticket médio (R$)</Label>
                  {isAdmin ? (
                    <CurrencyInput id="obj-ticket" value={ticketN} onChange={setTicket}
                      className="h-10 text-lg font-semibold tabular-nums bg-card" />
                  ) : <p className="text-xl font-semibold tabular-nums">{BRL(ladder.ticket)}</p>}
                </div>
                {changed && (
                  <div className="space-y-2 rounded-lg bg-card border p-2.5 text-xs">
                    <p>
                      Prévia abaixo: todas as metas {factor >= 1 ? 'sobem' : 'descem'}{' '}
                      <b>{Math.abs(Math.round((factor - 1) * 100))}%</b>.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveObjective} disabled={saving} className="flex-1">
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Salvar objetivo
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setFat(ladder.faturamento); setTicket(ladder.ticket); }}>
                        Desfazer
                      </Button>
                    </div>
                  </div>
                )}
                {isAdmin && !changed && (
                  <p className="text-[11px] text-muted-foreground">Digite o novo valor: as metas abaixo mudam na hora, antes de salvar.</p>
                )}
                {!draftValid && isAdmin && <p className="text-xs text-destructive">Use valores maiores que zero.</p>}
              </div>

              <MonthProgress
                faturamentoMeta={shown.faturamento * periodo.share}
                faturamentoReal={plano?.periodActuals.faturamento}
                vendasMeta={shown.vendas * periodo.share}
                vendasReal={plano?.periodActuals.vendas}
                serie={plano?.periodSeries.faturamento ?? []}
                mes={periodo.label}
                diaMeta={shown.faturamento / days}
                semanaMeta={(shown.faturamento * 5) / days}
              />
            </div>

            {/* 2. Escada de crescimento: do faturamento até o investimento */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Escada de crescimento</h3>
                  <p className="text-sm text-muted-foreground">
                    Realizado contra a meta de <b className="font-medium text-foreground">{periodo.label}</b>. Cada degrau sai do anterior: faturamento → vendas → comparecimentos → agendamentos → leads → investimento.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border p-0.5 text-xs" role="group" aria-label="Forma de ver as metas">
                  {(['cartoes', 'tabela'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
                      className={cn('rounded-md px-2.5 py-1 font-medium', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                      {v === 'cartoes' ? 'Cartões' : 'Tabela'}
                    </button>
                  ))}
                </div>
              </div>

              {view === 'cartoes' ? (
                <>
                  <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Escada de crescimento">
                    {rows.filter(r => r.step).map((r, i, arr) => (
                      <li key={r.label} className="relative">
                        <StepCard r={r} days={days} changed={changed} plano={plano} periodo={periodo} index={i + 1} />
                        {i < arr.length - 1 && arr[i + 1].via && (
                          <span className="hidden 2xl:flex absolute -right-3 top-8 z-10 h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground" aria-hidden>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>

                  <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Resgates e indicações</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {rows.filter(r => r.bloco === 'relacionamento').map(r => (
                          <StepCard key={r.label} r={r} days={days} changed={changed} plano={plano} periodo={periodo} compact />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Origens estratégicas <span className="font-normal text-muted-foreground">(leads por origem)</span></p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {rows.filter(r => r.bloco === 'origem').map(r => (
                          <StepCard key={r.label} r={r} days={days} changed={changed} plano={plano} periodo={periodo} compact />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <LadderTable rows={rows} days={days} changed={changed} plano={plano} periodo={periodo} />
              )}
              <p className="text-[11px] text-muted-foreground">
                Semana = 5 dias úteis e dia = 1 dia útil, sobre {days} dias úteis no mês. Realizado, % e curvas seguem o filtro de data ({periodo.label}); a meta do período é a do mês proporcional aos {periodo.bizDays} dias úteis dele.
                Origens contam o campo "Como o lead chegou?". O Plano de Incentivo, o painel e as Reuniões usam estes números.
              </p>
            </div>
          </div>
        )}

        <FunilDoPeriodo bare />

        <FunilConversao bare />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Taxas do funil e proporções</DialogTitle>
              <DialogDescription>
                O faturamento e o ticket ficam no próprio card. Aqui ficam as raízes do funil e as fatias dos leads.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {RATE_FIELDS.map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`goal-${k}`} className="text-xs">{label}</Label>
                  {k === 'meta_cpl' || k === 'meta_cac' ? (
                    <CurrencyInput id={`goal-${k}`} value={Number(form[k]) || 0}
                      onChange={v => setForm(f => ({ ...f, [k]: String(v) }))} />
                  ) : (
                    <Input id={`goal-${k}`} type="number" min={0} value={form[k] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-medium pt-1">Fatias dos leads do mês (%)</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(LADDER_SHARES) as LadderShareKey[]).map(k => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`share-${k}`} className="text-xs">{LADDER_SHARES[k].label}</Label>
                  <Input id={`share-${k}`} type="number" min={0} step={0.1} value={form[LADDER_SHARES[k].key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [LADDER_SHARES[k].key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {!formValid && <p className="text-xs text-destructive">Preencha valores maiores que zero; taxas até 100%.</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={saveAdvanced} disabled={!formValid || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
