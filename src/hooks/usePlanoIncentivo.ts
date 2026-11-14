import { useQuery } from '@tanstack/react-query';
import { addMonths, endOfMonth, isAfter, startOfMonth } from 'date-fns';
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
}

export interface PlanoIncentivoData {
  weeks: Week[];
  settings: { weeklyValue: number; tripValue: number; tripMonths: number };
  groups: IncentiveGroup[];
  /** realizado no mês selecionado (calendário), para a escada */
  monthActuals: Record<CountKey, number>;
}

const ORIGINS = new Set(['indicacao_pac', 'prospeccao_ativa', 'indicacao_parceria', 'social_selling']);

export function usePlanoIncentivo(month: Date) {
  const key = `${month.getFullYear()}-${month.getMonth()}`;
  return useQuery({
    queryKey: ['plano-incentivo', key],
    refetchInterval: 60_000,
    queryFn: async (): Promise<PlanoIncentivoData> => {
      const weeks = monthWeeks(month);
      const { data: tripRow } = await supabase.from('meta_settings').select('setting_value')
        .eq('setting_key', BONUS_SETTINGS.tripMonths.key).maybeSingle();
      const tripMonths = Math.max(1, Math.round(Number(tripRow?.setting_value) || BONUS_SETTINGS.tripMonths.fallback));
      const firstMonth = startOfMonth(addMonths(month, -(tripMonths - 1)));
      const span = {
        start: weeks[0].start < firstMonth ? weeks[0].start : firstMonth,
        end: weeks[weeks.length - 1].end > endOfMonth(month) ? weeks[weeks.length - 1].end : endOfMonth(month),
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
        };
      });

      const mr = monthRange(month);
      const keys: CountKey[] = ['leads', 'agendamentos', 'comparecimentos', 'vendas', 'faturamento',
        'resgates', 'indicacoes', 'prospeccao_ativa', 'indicacao_parceria', 'social_selling'];
      const monthActuals = Object.fromEntries(keys.map(k => [k, count(k, mr)])) as Record<CountKey, number>;

      return { weeks, settings, groups, monthActuals };
    },
  });
}
