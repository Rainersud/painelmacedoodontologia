import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { attendances, bookedAppointments, fetchMetricsData, periodGoal } from '@/lib/metrics';
import {
  BONUS_GROUPS, BONUS_SETTINGS, GOAL_LABELS, countIn, evaluateGroup, monthWeeks, referralEvents,
  type BonusGroup, type GoalResult, type GroupResult, type Week,
} from '@/lib/bonus';

export interface BonusOwner { grupo: BonusGroup; nome: string }
export interface WeeklyBonusData {
  groups: (GroupResult & { owner: string; label: string })[];
  weeks: Week[];
  settings: { weeklyValue: number; resgatesPerWeek: number; indicacoesPerWeek: number };
}

/** Bônus por metas do mês (regra semanal), pelos números do Comercial 1, CRC e Comercial 2. */
export function useWeeklyBonus(month: Date) {
  const key = `${month.getFullYear()}-${month.getMonth()}`;
  return useQuery({
    queryKey: ['weekly-bonus', key],
    refetchInterval: 60_000,
    queryFn: async (): Promise<WeeklyBonusData> => {
      const weeks = monthWeeks(month);
      const span = { start: weeks[0].start, end: weeks[weeks.length - 1].end };
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
        resgatesPerWeek: num(BONUS_SETTINGS.resgatesPerWeek.key, BONUS_SETTINGS.resgatesPerWeek.fallback),
        indicacoesPerWeek: num(BONUS_SETTINGS.indicacoesPerWeek.key, BONUS_SETTINGS.indicacoesPerWeek.fallback),
      };
      const events = referralEvents({ referrals: refs.data, triage: triage.data, leads: refLeads.data });
      const rescuedAt = rescued.data.map(r => ({ at: new Date(r.rescued_at) }));
      const g = (key: string, current: number, target: number): GoalResult => ({
        key, label: GOAL_LABELS[key], current, target, hit: target > 0 && current >= target,
      });

      const goalsFor: Record<BonusGroup, (w: Week) => GoalResult[]> = {
        atendimento: w => [
          // metas semanais da escada (proporcionais aos dias úteis da semana)
          g('agendamentos', bookedAppointments(data.appointments, w).length, periodGoal(s, 'agendamentos', w, data.calendar)),
          g('comparecimentos', attendances(data.appointments, w).length, periodGoal(s, 'comparecimentos', w, data.calendar)),
          g('resgates', countIn(rescuedAt, w), settings.resgatesPerWeek),
        ],
        indicacoes: w => [g('indicacoes', countIn(events, w), settings.indicacoesPerWeek)],
      };
      const ownerOf = new Map((owners.data ?? []).map(o => [o.grupo, o.nome]));

      return {
        weeks,
        settings,
        groups: BONUS_GROUPS.map(def => ({
          ...evaluateGroup(def.key, weeks, goalsFor[def.key], settings.weeklyValue),
          owner: ownerOf.get(def.key) ?? def.defaultOwner,
          label: def.label,
        })),
      };
    },
  });
}
