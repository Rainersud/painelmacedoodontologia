import { useQuery } from '@tanstack/react-query';
import {
  addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, endOfDay, endOfMonth, format, isAfter,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import {
  attendances, bookedAppointments, fetchMetricsData, leadOrigin, newLeads, periodGoal, revenue, sales,
  type GoalKey,
} from '@/lib/metrics';
import {
  BONUS_GROUPS, BONUS_SETTINGS, GOAL_LABELS, countIn, evaluateGroup, monthStreak, monthWeeks, referralEvents,
  type BonusGroup, type GoalResult, type GroupResult, type MonthHit, type Week,
} from '@/lib/bonus';

export interface BonusOwner { grupo: BonusGroup; nome: string }

/** Tudo que o painel conta para as metas (mesmas regras do Comercial 1, CRC e Comercial 2). */
export type CountKey =
  | 'leads' | 'agendamentos' | 'comparecimentos' | 'vendas' | 'faturamento'
  | 'resgates' | 'indicacoes' | 'prospeccao_ativa' | 'indicacao_parceria' | 'social_selling';

export interface IncentiveGroup extends GroupResult {
  owner: string;
  label: string;
  /** progresso do mês (calendário) contra as metas mensais */
  monthGoals: GoalResult[];
  /** últimos meses (mais antigo → selecionado), para a viagem */
  months: MonthHit[];
  streak: number;
  tripEarned: boolean;
  /** metas do período escolhido no filtro (dia, semana ou mês) */
  periodGoals: GoalResult[];
  /** % médio das metas em cada parte do período (semanas do mês, ou dias da semana) */
  series: { label: string; pct: number; current: boolean }[];
}

export type IncentivePeriod = 'dia' | 'semana' | 'mes';

export interface PlanoIncentivoData {
  weeks: Week[];
  settings: { weeklyValue: number; tripValue: number; tripMonths: number };
  groups: IncentiveGroup[];
  /** realizado no mês selecionado (calendário), para a escada */
  monthActuals: Record<CountKey, number>;
  /** como o gráfico de desempenho foi cortado */
  seriesUnit: ChartUnit;
  /** dia a dia do mês (até hoje), com a mesma contagem do realizado — para os mini gráficos */
  monthSeries: Record<CountKey, number[]>;
  /** realizado no recorte do filtro de data (dia, semana, mês, ano ou personalizado) */
  periodActuals: Record<CountKey, number>;
  /** curva do recorte: por dia (até ~2 meses) ou por mês, até hoje */
  periodSeries: Record<CountKey, number[]>;
  /** dias úteis do recorte (para a meta proporcional) */
  periodBizDays: number;
}

export type ChartUnit = 'dia' | 'semana' | 'mes';

/**
 * Corta o período escolhido em partes para o gráfico. Usa só o intervalo do filtro (nada de
 * semanas de outro mês): até 14 dias = dias úteis; até 62 dias = semanas (seg–dom, cortadas
 * nas pontas do período); mais = meses.
 */
export function chartParts(sel: Week, isBusinessDay: (d: Date) => boolean, now = new Date()) {
  const days = differenceInCalendarDays(sel.end, sel.start) + 1;
  const isNow = (r: Week) => r.start <= now && now <= r.end;
  if (days <= 14) {
    const list = eachDayOfInterval({ start: sel.start, end: sel.end });
    const business = list.filter(isBusinessDay);
    return {
      unit: 'dia' as ChartUnit,
      items: (business.length ? business : list).map(d => {
        const r = { start: startOfDay(d), end: endOfDay(d) };
        return { label: format(d, 'EEE dd/MM', { locale: ptBR }), range: r, current: isNow(r) };
      }),
    };
  }
  if (days <= 62) {
    const items: { label: string; range: Week; current: boolean }[] = [];
    let cursor = startOfWeek(sel.start, { weekStartsOn: 1 });
    while (cursor <= sel.end) {
      const r = {
        start: cursor < sel.start ? sel.start : cursor,
        end: endOfDay(addDays(cursor, 6)) > sel.end ? sel.end : endOfDay(addDays(cursor, 6)),
      };
      // pedaço só de fim de semana (ex.: domingo 01/11) não tem meta: fica fora do gráfico
      if (eachDayOfInterval(r).some(isBusinessDay)) {
        items.push({ label: `${format(r.start, 'dd/MM')}–${format(r.end, 'dd/MM')}`, range: r, current: isNow(r) });
      }
      cursor = addDays(cursor, 7);
    }
    return { unit: 'semana' as ChartUnit, items };
  }
  return {
    unit: 'mes' as ChartUnit,
    items: eachMonthOfInterval({ start: sel.start, end: sel.end }).map(m => {
      const r = { start: m < sel.start ? sel.start : startOfMonth(m), end: endOfMonth(m) > sel.end ? sel.end : endOfMonth(m) };
      return { label: format(m, 'MMM/yy', { locale: ptBR }), range: r, current: isNow(r) };
    }),
  };
}

const ORIGINS = new Set(['indicacao_pac', 'prospeccao_ativa', 'indicacao_parceria', 'social_selling', 'resgate']);

/**
 * `month`: mês do bônus (semanas, dobrado e viagem). `period` + `range`: o recorte do filtro
 * Dia / Semana / Mês (padrão: o mês inteiro).
 */
export function usePlanoIncentivo(month: Date, period: IncentivePeriod = 'mes', range?: Week) {
  const key = `${month.getFullYear()}-${month.getMonth()}`;
  const sel = range ?? { start: startOfMonth(month), end: endOfMonth(month) };
  return useQuery({
    queryKey: ['plano-incentivo', key, period, sel.start.toISOString(), sel.end.toISOString()],
    refetchInterval: 60_000,
    queryFn: async (): Promise<PlanoIncentivoData> => {
      const weeks = monthWeeks(month);
      const { data: tripRow } = await supabase.from('meta_settings').select('setting_value')
        .eq('setting_key', BONUS_SETTINGS.tripMonths.key).maybeSingle();
      const tripMonths = Math.max(1, Math.round(Number(tripRow?.setting_value) || BONUS_SETTINGS.tripMonths.fallback));
      const firstMonth = startOfMonth(addMonths(month, -(tripMonths - 1)));
      // dias da semana do recorte (para o gráfico do filtro Dia / Semana)
      const weekOfSel = startOfWeek(sel.start, { weekStartsOn: 1 });
      const minD = (...d: Date[]) => new Date(Math.min(...d.map(x => x.getTime())));
      const maxD = (...d: Date[]) => new Date(Math.max(...d.map(x => x.getTime())));
      const span = {
        start: minD(weeks[0].start, firstMonth, sel.start, weekOfSel),
        end: maxD(weeks[weeks.length - 1].end, endOfMonth(month), sel.end, endOfDay(addDays(weekOfSel, 6))),
      };

      const [data, rescued, refs, triage, refLeads, owners] = await Promise.all([
        fetchMetricsData(span),
        allPages<{ rescued_at: string }>(
          supabase.from('leads').select('rescued_at').gte('rescued_at', span.start.toISOString()).lte('rescued_at', span.end.toISOString()).order('id'),
        ),
        allPages<{ referred_lead_id: string; created_at: string }>(
          supabase.from('referrals').select('referred_lead_id, created_at').order('id'),
        ),
        allPages<{ id: string; converted_lead_id: string | null; created_at: string }>(
          supabase.from('triage_referrals').select('id, converted_lead_id, created_at').order('id'),
        ),
        allPages<{ id: string; created_at: string; lead_arrival_source: string | null; source: string | null }>(
          supabase.from('leads').select('id, created_at, lead_arrival_source, source')
            .or('lead_arrival_source.eq.indicacao_pac,source.eq.indicacao').order('id'),
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
        (supabase as any).from('bonus_responsaveis').select('grupo, nome') as Promise<{ data: BonusOwner[] | null }>,
      ]);

      const s = data.settings;
      const num = (k: string, fb: number) => {
        const v = Number(s[k]);
        return Number.isFinite(v) && v > 0 ? v : fb;
      };
      const settings = {
        weeklyValue: num(BONUS_SETTINGS.weeklyValue.key, BONUS_SETTINGS.weeklyValue.fallback),
        tripValue: num(BONUS_SETTINGS.tripValue.key, BONUS_SETTINGS.tripValue.fallback),
        tripMonths,
      };

      const events = referralEvents({ referrals: refs.data, triage: triage.data, leads: refLeads.data });
      const rescuedAt = rescued.data.map(r => ({ at: new Date(r.rescued_at) }));
      // Indicado de paciente sem "Como o lead chegou?" conta como Indicação Pac (igual às Origens)
      const referred = new Set(refs.data.map(r => r.referred_lead_id));
      const originOf = (l: { id: string; lead_arrival_source?: string | null }) => {
        const o = leadOrigin(l);
        return !ORIGINS.has(o) && referred.has(l.id) ? 'indicacao_pac' : o;
      };

      const count = (k: CountKey, r: Week): number => {
        switch (k) {
          case 'leads': return newLeads(data.leads, r).length;
          case 'vendas': return sales(data.leads, r).length;
          case 'agendamentos': return bookedAppointments(data.appointments, r).length;
          case 'comparecimentos': return attendances(data.appointments, r).length;
          case 'faturamento': return revenue(data.payments, r);
          case 'resgates': return countIn(rescuedAt, r);
          case 'indicacoes': return countIn(events, r);
          default: return newLeads(data.leads, r).filter(l => originOf(l) === k).length;
        }
      };
      const goal = (k: string, r: Week): GoalResult => {
        const target = periodGoal(s, k as GoalKey, r, data.calendar);
        const current = count(k as CountKey, r);
        return { key: k, label: GOAL_LABELS[k] ?? k, current, target, hit: target > 0 && current >= target };
      };
      const monthRange = (m: Date): Week => ({ start: startOfMonth(m), end: endOfMonth(m) });
      const now = new Date();
      const ownerOf = new Map((owners.data ?? []).map(o => [o.grupo, o.nome]));

      // Partes do gráfico = exatamente o período do filtro de data global, cortado em
      // dias (até 2 semanas), semanas (até ~2 meses) ou meses (mais que isso).
      const parts = chartParts(sel, data.calendar.isBusinessDay, now);
      const seriesUnit = parts.unit;
      const avgPct = (goals: GoalResult[]) => {
        const valid = goals.filter(g => g.target > 0);
        if (!valid.length) return 0;
        return Math.round(valid.reduce((sum, g) => sum + Math.min(150, (g.current / g.target) * 100), 0) / valid.length);
      };

      const groups: IncentiveGroup[] = BONUS_GROUPS.map(def => {
        const weekly = evaluateGroup(def.key, weeks, w => def.goals.map(k => goal(k, w)), settings.weeklyValue, now);
        const months: MonthHit[] = Array.from({ length: tripMonths }, (_, i) => {
          const m = addMonths(firstMonth, i);
          const r = monthRange(m);
          return { month: m, hit: def.goals.every(k => goal(k, r).hit), complete: isAfter(now, r.end) };
        });
        const streak = monthStreak(months);
        return {
          ...weekly,
          owner: ownerOf.get(def.key) ?? def.defaultOwner,
          label: def.label,
          monthGoals: def.goals.map(k => goal(k, monthRange(month))),
          months,
          streak,
          tripEarned: streak >= tripMonths,
          periodGoals: def.goals.map(k => goal(k, sel)),
          series: parts.items.map(p => ({ label: p.label, pct: avgPct(def.goals.map(k => goal(k, p.range))), current: p.current })),
        };
      });

      const mr = monthRange(month);
      const keys: CountKey[] = ['leads', 'agendamentos', 'comparecimentos', 'vendas', 'faturamento',
        'resgates', 'indicacoes', 'prospeccao_ativa', 'indicacao_parceria', 'social_selling'];
      const monthActuals = Object.fromEntries(keys.map(k => [k, count(k, mr)])) as Record<CountKey, number>;
      const monthDays = eachDayOfInterval({ start: mr.start, end: mr.end > now ? endOfDay(now) : mr.end })
        .map(d => ({ start: startOfDay(d), end: endOfDay(d) }));
      const monthSeries = Object.fromEntries(keys.map(k => [k, monthDays.map(d => count(k, d))])) as Record<CountKey, number[]>;

      const periodActuals = Object.fromEntries(keys.map(k => [k, count(k, sel)])) as Record<CountKey, number>;
      const selEnd = sel.end > now ? endOfDay(now) : sel.end;
      const longo = (sel.end.getTime() - sel.start.getTime()) / 86400000 > 62;
      const periodParts: Week[] = sel.start > now ? [] : longo
        ? eachMonthOfInterval({ start: sel.start, end: selEnd }).map(m => ({ start: maxD(startOfMonth(m), sel.start), end: minD(endOfMonth(m), selEnd) }))
        : eachDayOfInterval({ start: sel.start, end: selEnd }).map(d => ({ start: startOfDay(d), end: endOfDay(d) }));
      const periodSeries = Object.fromEntries(keys.map(k => [k, periodParts.map(p => count(k, p))])) as Record<CountKey, number[]>;
      const periodBizDays = data.calendar.countBusinessDays(sel.start, sel.end);

      return { weeks, settings, groups, monthActuals, seriesUnit, monthSeries, periodActuals, periodSeries, periodBizDays };
    },
  });
}
