import { assertGoals } from '@/lib/access';
import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { useGlobalPeriodText } from '@/hooks/useGlobalPeriodText';
import { Sparkline } from '@/components/charts/SmoothCharts';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  CalendarCheck, CheckCircle2, Circle, Clock, Copy, Plane, Settings, Trophy, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { BONUS_GROUPS, BONUS_SETTINGS, type BonusGroup, type GoalResult, type WeekState } from '@/lib/bonus';
import { usePlanoIncentivo, type IncentiveGroup, type IncentivePeriod, type PlanoIncentivoData } from '@/hooks/usePlanoIncentivo';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dm = (d: Date) => format(d, 'dd/MM');

/** Cor fixa de cada responsável (identidade, igual no card, no gráfico e na legenda). */
// Cores seguras para daltonismo (paleta Okabe-Ito: azul, laranja, rosa-púrpura), validadas para
// protanopia, deuteranopia e tritanopia. No gráfico, cada pessoa tem também traço, marcador e
// nome na ponta da linha, para nunca depender só da cor.
const PERSON_COLOR: Record<BonusGroup, string> = {
  comercial: '#0072B2',
  atendimento: '#E69F00',
  indicacoes: '#CC79A7',
};
const PERSON_DASH: Record<BonusGroup, string | undefined> = { comercial: undefined, atendimento: '9 5', indicacoes: '2 4' };
const PERSON_SHAPE: Record<BonusGroup, 'circle' | 'square' | 'triangle'> = { comercial: 'circle', atendimento: 'square', indicacoes: 'triangle' };

function Marker({ cx, cy, shape, color, r = 4 }: { cx?: number; cy?: number; shape: 'circle' | 'square' | 'triangle'; color: string; r?: number }) {
  if (cx === undefined || cy === undefined) return null;
  const common = { fill: color, stroke: 'hsl(var(--card))', strokeWidth: 1.5 };
  if (shape === 'square') return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} {...common} />;
  if (shape === 'triangle') return <polygon points={`${cx},${cy - r - 1} ${cx + r + 1},${cy + r} ${cx - r - 1},${cy + r}`} {...common} />;
  return <circle cx={cx} cy={cy} r={r} {...common} />;
}

function LegendSwatch({ group }: { group: BonusGroup }) {
  const color = PERSON_COLOR[group];
  return (
    <svg width="34" height="12" aria-hidden>
      <line x1="2" y1="6" x2="32" y2="6" stroke={color} strokeWidth="3" strokeDasharray={PERSON_DASH[group]} strokeLinecap="round" />
      <Marker cx={17} cy={6} shape={PERSON_SHAPE[group]} color={color} r={3.5} />
    </svg>
  );
}

const WEEK_STATE: Record<WeekState, { label: string; cls: string; Icon: React.ElementType }> = {
  batida: { label: 'Batida', cls: 'border-success/40 bg-success/10 text-success', Icon: CheckCircle2 },
  nao_batida: { label: 'Não batida', cls: 'border-destructive/30 bg-destructive/5 text-destructive', Icon: XCircle },
  em_andamento: { label: 'Em andamento', cls: 'border-warning/40 bg-warning/10 text-warning-strong', Icon: Clock },
  futura: { label: 'A começar', cls: 'border-border bg-muted/40 text-muted-foreground', Icon: Circle },
};

/** Anel de progresso de uma meta. */
function GoalRing({ g, color }: { g: GoalResult; color: string }) {
  const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const stroke = g.hit ? 'hsl(var(--success))' : color;
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {g.hit ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : <span className="text-base font-bold tabular-nums">{pct}%</span>}
        </div>
      </div>
      <p className="text-xs font-medium text-center leading-tight">{g.label}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        <b className="text-foreground">{g.current}</b> de {g.target}
      </p>
    </div>
  );
}

function PersonCard({ g, data, noun }: { g: IncentiveGroup; data: PlanoIncentivoData; noun: string }) {
  const color = PERSON_COLOR[g.group];
  const { tripMonths, tripValue, weeklyValue } = data.settings;
  const role = BONUS_GROUPS.find(b => b.key === g.group)?.label ?? g.label;
  const allHit = g.periodGoals.length > 0 && g.periodGoals.every(x => x.hit);
  const missing = g.periodGoals.filter(x => !x.hit && x.target > 0);
  return (
    <Card className="monday-card overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: color }} />
      <CardContent className="p-5 flex-1 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: color }} aria-hidden>
              {g.owner.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold truncate">{g.owner}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted-foreground">Bônus do mês</p>
            <p className="hero-number text-2xl leading-tight">{brl(g.total)}</p>
          </div>
        </div>

        <div className={cn('grid gap-2', g.periodGoals.length >= 3 ? 'grid-cols-3' : g.periodGoals.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          {g.periodGoals.map(x => <GoalRing key={x.key} g={x} color={color} />)}
        </div>

        {g.series.length > 1 && (
          <div>
            <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span>% das metas no período</span>
              <span className="tabular-nums">{g.series[g.series.length - 1]?.pct ?? 0}% na última parte</span>
            </div>
            <Sparkline data={g.series.map(x => x.pct)} height={40} />
          </div>
        )}
        <p className={cn('rounded-lg px-3 py-2 text-xs text-center min-h-[48px] flex items-center justify-center', allHit ? 'bg-success/10 text-success font-medium' : 'bg-muted/60 text-muted-foreground')}>
          {allHit
            ? `Todas as metas batidas ${noun}.`
            : `Faltam ${missing.map(x => `${x.target - x.current} ${x.label.toLowerCase()}`).join(' · ')} ${noun}.`}
        </p>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium">Semanas do mês</p>
            <p className="text-[11px] text-muted-foreground">{brl(weeklyValue)} por semana batida</p>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${g.weeks.length}, minmax(0, 1fr))` }}>
            {g.weeks.map((w, i) => {
              const st = WEEK_STATE[w.state];
              return (
                <div key={i} className={cn('rounded-lg border px-1.5 py-2 text-center', st.cls)}
                  title={`Semana ${i + 1} (${dm(w.week.start)} a ${dm(w.week.end)}): ${st.label}`}>
                  <st.Icon className="h-4 w-4 mx-auto" aria-hidden />
                  <p className="text-[11px] font-semibold mt-1">S{i + 1}</p>
                  <p className="text-[10px] tabular-nums">{w.earned > 0 ? brl(w.earned) : dm(w.week.start)}</p>
                  <span className="sr-only">{st.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs rounded-lg bg-muted/50 px-3 py-2">
            <span className="flex items-center gap-1.5"><Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> Bônus dobrado</span>
            <b className={cn('tabular-nums', g.doubleBonus > 0 && 'text-success')}>
              {g.doubleBonus > 0 ? `+ ${brl(g.doubleBonus)}` : g.doubleStillPossible ? `possível + ${brl(weeklyValue * g.weeks.length)}` : 'perdido este mês'}
            </b>
          </div>
        </div>

        <div className={cn('mt-auto rounded-lg border p-3 space-y-2', g.tripEarned && 'border-success/40 bg-success/5')}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium"><Plane className="h-3.5 w-3.5" style={{ color }} aria-hidden /> Viagem {brl(tripValue)}</span>
            <b className="tabular-nums">{Math.min(g.streak, tripMonths)} de {tripMonths} meses</b>
          </div>
          <div className="flex gap-1">
            {g.months.map(m => (
              <div key={m.month.toISOString()} className="flex-1 text-center">
                <div className="h-1.5 rounded-full" style={{ background: m.hit ? 'hsl(var(--success))' : m.complete ? 'hsl(var(--destructive) / 0.35)' : 'hsl(var(--muted))' }} />
                <span className="text-[10px] text-muted-foreground capitalize">{format(m.month, 'MMM', { locale: ptBR })}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {g.tripEarned ? 'Viagem conquistada.' : `Faltam ${tripMonths - g.streak} ${tripMonths - g.streak === 1 ? 'mês seguido' : 'meses seguidos'} com as metas mensais batidas.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamChart({ data, period }: { data: PlanoIncentivoData; period: string }) {
  const config: ChartConfig = Object.fromEntries(data.groups.map(g => [g.group, { label: g.owner, color: PERSON_COLOR[g.group] }]));
  const rows = (data.groups[0]?.series ?? []).map((p, i) => ({
    label: p.label,
    ...Object.fromEntries(data.groups.map(g => [g.group, Math.max(0, g.series[i]?.pct ?? 0)])),
  }));
  const peak = Math.max(100, ...rows.flatMap(r => data.groups.map(g => Number((r as Record<string, unknown>)[g.group]) || 0)));
  const top = Math.ceil(peak / 25) * 25;
  const ticks = Array.from({ length: top / 25 + 1 }, (_, i) => i * 25);
  return (
    <Card className="monday-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Desempenho da equipe por {data.seriesUnit === 'mes' ? 'mês' : data.seriesUnit} · {period}</h3>
          <p className="text-xs text-muted-foreground">% médio das metas de cada responsável · a linha marca 100% (meta batida)</p>
        </div>
        <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
          <LineChart data={rows} margin={{ top: 8, right: 72, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} className="capitalize" />
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0, top]} ticks={ticks} tickFormatter={v => `${v}%`} />
            <ReferenceLine y={100} stroke="hsl(var(--success))" strokeDasharray="4 4" />
            <ChartTooltip cursor={{ stroke: 'hsl(var(--border))' }} content={<ChartTooltipContent formatter={(v, name) => (
              <span className="flex w-full justify-between gap-3"><span>{config[String(name)]?.label}</span><b className="tabular-nums">{v}%</b></span>
            )} />} />
            {data.groups.map((g, gi) => {
              const last = rows.length - 1;
              // nomes na ponta: se as linhas terminam juntas, empilha os nomes para não sobrepor
              const endOf = (k: string) => Number((rows[last] as Record<string, unknown> | undefined)?.[k]) || 0;
              const mine = endOf(g.group);
              const shift = data.groups.slice(0, gi).filter(o => Math.abs(endOf(o.group) - mine) < top * 0.08).length * 14;
              return (
                <Line key={g.group} type="monotone" dataKey={g.group} stroke={PERSON_COLOR[g.group]} strokeWidth={3}
                  strokeDasharray={PERSON_DASH[g.group]}
                  dot={(p: { cx?: number; cy?: number; index?: number }) => <Marker key={`${g.group}-${p.index}`} cx={p.cx} cy={p.cy} shape={PERSON_SHAPE[g.group]} color={PERSON_COLOR[g.group]} />}
                  activeDot={(p: { cx?: number; cy?: number }) => <Marker cx={p.cx} cy={p.cy} shape={PERSON_SHAPE[g.group]} color={PERSON_COLOR[g.group]} r={6} />}
                  label={(p: { x?: number; y?: number; index?: number }) => p.index === last && p.x !== undefined && p.y !== undefined
                    ? <text key={`lbl-${g.group}`} x={p.x + 8} y={p.y + 4 - shift} fontSize={12} fontWeight={600} fill={PERSON_COLOR[g.group]}>{g.owner}</text>
                    : <g key={`lbl-${g.group}-${p.index}`} />}
                  isAnimationActive={false} />
              );
            })}
          </LineChart>
        </ChartContainer>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm" aria-label="Legenda">
          {data.groups.map(g => (
            <li key={g.group} className="flex items-center gap-2"><LegendSwatch group={g.group} /><span className="font-medium">{g.owner}</span></li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

async function saveSetting(key: string, value: number) {
  assertGoals('as regras do plano');
  const { data: existing } = await supabase.from('meta_settings').select('id').eq('setting_key', key).maybeSingle();
  const { error } = existing
    ? await supabase.from('meta_settings').update({ setting_value: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : await supabase.from('meta_settings').insert({ setting_key: key, setting_value: value });
  if (error) throw error;
}

function RulesDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: PlanoIncentivoData }) {
  const qc = useQueryClient();
  const ownerOf = (k: BonusGroup) => data.groups.find(g => g.group === k)?.owner ?? '';
  const [form, setForm] = useState<Record<string, string>>({
    weeklyValue: String(data.settings.weeklyValue),
    tripValue: String(data.settings.tripValue),
    tripMonths: String(data.settings.tripMonths),
    comercial: ownerOf('comercial'),
    atendimento: ownerOf('atendimento'),
    indicacoes: ownerOf('indicacoes'),
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      for (const k of ['weeklyValue', 'tripValue', 'tripMonths'] as const) {
        const v = Number(form[k]);
        if (!Number.isFinite(v) || v <= 0) throw new Error('Use números maiores que zero.');
        await saveSetting(BONUS_SETTINGS[k].key, v);
      }
      assertGoals('os responsáveis do plano');
      for (const def of BONUS_GROUPS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
        const { error } = await (supabase as any).from('bonus_responsaveis')
          .upsert({ grupo: def.key, nome: form[def.key].trim() || def.defaultOwner, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ['plano-incentivo'] });
      toast.success('Regras salvas');
      onOpenChange(false);
    } catch (e) {
      toast.error(`As regras não foram salvas. ${describeError(e)}`);
    } finally {
      setSaving(false);
    }
  };
  const field = (k: string, label: string, type = 'number') => (
    <div className="space-y-1.5">
      <Label htmlFor={`regra-${k}`} className="text-xs">{label}</Label>
      {k === 'weeklyValue' || k === 'tripValue' ? (
        <CurrencyInput id={`regra-${k}`} value={Number(form[k]) || 0} onChange={v => setForm(f => ({ ...f, [k]: String(v) }))} />
      ) : (
        <Input id={`regra-${k}`} type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
      )}
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regras do plano de incentivo</DialogTitle>
          <DialogDescription>
            As metas de cada responsável vêm do objetivo central (faturamento + ticket médio) em Metas da clínica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('weeklyValue', 'Bônus por semana (R$)')}
          {field('tripValue', 'Viagem (R$)')}
          {field('tripMonths', 'Meses seguidos')}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('comercial', 'Leads e vendas', 'text')}
          {field('atendimento', 'Agend., comp. e resgates', 'text')}
          {field('indicacoes', 'Indicações', 'text')}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar regras'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanoIncentivoV2({ embedded = false }: { embedded?: boolean } = {}) {
  useLiveRefresh();
  const { canManage } = useAuth();
  // período = filtro de data global (canto superior direito)
  const { period: globalPeriod, range: globalRange, anchor, customRange } = usePeriodFilter();
  const { current: periodNoun } = useGlobalPeriodText();
  const [editing, setEditing] = useState(false);
  const period: IncentivePeriod = customRange?.from ? 'mes' : globalPeriod === 'hoje' ? 'dia' : globalPeriod === 'semana' ? 'semana' : 'mes';
  const range = useMemo(() => ({ start: globalRange.start, end: globalRange.end }), [globalRange.start, globalRange.end]);
  // mês do bônus: o da data escolhida (na semana, o mês da quinta-feira)
  const bonusMonth = useMemo(
    () => (globalPeriod === 'semana' ? addDays(range.start, 3) : customRange?.from ?? anchor),
    [globalPeriod, range.start, customRange?.from, anchor],
  );
  const { data, isLoading } = usePlanoIncentivo(bonusMonth, period, range);
  const total = (data?.groups ?? []).reduce((sum, g) => sum + g.total, 0);
  const settings = data?.settings ?? { weeklyValue: 100, tripValue: 5000, tripMonths: 6 };

  return (
    <PageShell embedded={embedded} title="Plano de Incentivo Inteligente">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Plano de Incentivo Inteligente</h2>
            <p className="text-sm text-muted-foreground">Metas de cada responsável, tiradas do faturamento e do ticket médio do objetivo central.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground rounded-full border px-2.5 py-1">{globalRange.label}</span>
            {canManage && data && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}><Settings className="h-4 w-4" />Regras</Button>
            )}
          </div>
        </div>

        <Card className="monday-card">
          <CardContent className="p-5 grid gap-5 lg:grid-cols-[minmax(220px,1fr)_3fr] items-center">
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Trophy className="h-6 w-6 text-primary" aria-hidden /></span>
              <div>
                <p className="text-xs text-muted-foreground">Bônus da equipe em {format(bonusMonth, 'MMMM', { locale: ptBR })}</p>
                <p className="hero-number text-4xl leading-tight">{brl(total)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { Icon: CalendarCheck, title: `${brl(settings.weeklyValue)} por semana`, text: 'quando a responsável bate todas as suas metas da semana' },
                { Icon: Copy, title: 'Bônus dobrado', text: 'batendo todas as semanas do mês, recebe o valor das semanas de novo' },
                { Icon: Plane, title: `Viagem de ${brl(settings.tripValue)}`, text: `${settings.tripMonths} meses seguidos com todas as metas mensais batidas` },
              ].map(r => (
                <div key={r.title} className="flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <r.Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                  <div><p className="text-sm font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{r.text}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading || !data ? (
          <div className="grid gap-6 xl:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-[560px] rounded-xl bg-muted/50 animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {data.groups.map(g => <PersonCard key={g.group} g={g} data={data} noun={periodNoun} />)}
            </div>
            <TeamChart data={data} period={globalRange.label} />
            <p className="text-xs text-muted-foreground">
              As metas do dia e da semana são proporcionais aos dias úteis. Semanas de segunda a domingo; a semana pertence ao mês da sua quinta-feira.
              Indicações contam tudo que foi apontado no Comercial 1, CRC e Comercial 2 (cada pessoa indicada conta uma vez).
            </p>
            {editing && <RulesDialog open={editing} onOpenChange={setEditing} data={data} />}
          </>
        )}
      </div>
    </PageShell>
  );
}
