import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { allPages } from '@/lib/paging';
import { fetchMetricsData, type DateRange } from '@/lib/metrics';
import { buildDailyRows, dashboardCells, type LeadMoney } from '@/lib/ascension/acompanhamento';
import {
  buildControleRows, controleByDay, controleByOrigin, type ApptForControle, type LeadForControle,
} from '@/lib/ascension/controleGeral';
import { checkKey } from '@/lib/ascension/projetos';
import type { ControleMonth } from '@/lib/ascension/exportXlsx';

/** Orçamento e valor fechado dos leads (para oportunidade, fechamentos e entrada). */
async function fetchMoney(ids: string[]): Promise<Map<string, LeadMoney>> {
  const map = new Map<string, LeadMoney>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from('leads').select('id, budget_value, treatment_value').in('id', ids.slice(i, i + 200));
    (data ?? []).forEach(l => map.set(l.id, l));
  }
  return map;
}

/** Planilha "Acompanhamento": linhas diárias e Dashboard do período do filtro global. */
export function useAcompanhamento(range: DateRange) {
  return useQuery({
    queryKey: ['ascension-acompanhamento', range.start.toISOString(), range.end.toISOString()],
    refetchInterval: 60_000,
    queryFn: async () => {
      const data = await fetchMetricsData(range);
      const ids = [...new Set([...data.leads.map(l => l.id), ...data.appointments.map(a => a.lead_id).filter(Boolean) as string[]])];
      const money = await fetchMoney(ids);
      const rows = buildDailyRows({ ...data, money }, range);
      return { rows, dashboard: dashboardCells(rows) };
    },
  });
}

const LEAD_FIELDS = 'id, name, phone, interest_product, created_at, last_interaction_at, status, lead_arrival_source, loss_reason, assigned_agent_id, budget_value, treatment_value, closed_at, scheduled_appointment_at, clinica';

/** Planilha de Controle Geral: uma aba por mês (leads que entraram no mês). */
export function useControleGeral(months: Date[]) {
  const keys = months.map(m => format(m, 'yyyy-MM'));
  return useQuery({
    queryKey: ['ascension-controle', ...keys],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ControleMonth[]> => {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name');
      const nameOf = new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? '']));
      const agentName = (id: string | null) => (id ? nameOf.get(id) ?? '' : '');
      const out: ControleMonth[] = [];
      for (const m of months) {
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const { data: leads } = await allPages<LeadForControle>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- coluna clinica ainda fora dos tipos gerados em algumas tabelas
          (supabase.from('leads').select(LEAD_FIELDS) as any).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('id'),
        );
        const ids = leads.map(l => l.id);
        const appts: ApptForControle[] = [];
        for (let i = 0; i < ids.length; i += 200) {
          const { data } = await supabase.from('appointments')
            .select('lead_id, scheduled_at, attended_at, cancelled_at, rescheduled_at, no_show_at').in('lead_id', ids.slice(i, i + 200));
          appts.push(...((data ?? []) as ApptForControle[]));
        }
        const rows = buildControleRows(leads, appts, agentName);
        const { origens, total } = controleByOrigin(rows);
        out.push({ month: start, rows, origens, total, dias: controleByDay(rows, start) });
      }
      return out;
    },
  });
}

interface CheckRow { projeto: string; item: number; dia: number; marcado: boolean }

/** Marcações do Projeto Ascension no mês. */
export function useAscensionChecks(month: Date) {
  const mes = format(startOfMonth(month), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['ascension-checks', mes],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
      const { data, error } = await (supabase as any).from('ascension_checklists').select('projeto, item, dia, marcado').eq('mes', mes);
      if (error) throw error;
      return new Set(((data ?? []) as CheckRow[]).filter(r => r.marcado).map(r => checkKey(r.projeto, r.item, r.dia)));
    },
  });
}

export function useToggleAscensionCheck(month: Date) {
  const qc = useQueryClient();
  const mes = format(startOfMonth(month), 'yyyy-MM-dd');
  return useMutation({
    mutationFn: async ({ projeto, item, dia, marcado }: { projeto: string; item: number; dia: number; marcado: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados
      const { error } = await (supabase as any).from('ascension_checklists').upsert(
        { mes, projeto, item, dia, marcado, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'mes,projeto,item,dia' },
      );
      if (error) throw error;
    },
    onMutate: async v => {
      const key = ['ascension-checks', mes];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Set<string>>(key);
      const next = new Set(prev ?? []);
      const k = checkKey(v.projeto, v.item, v.dia);
      if (v.marcado) next.add(k); else next.delete(k);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['ascension-checks', mes], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['ascension-checks', mes] }),
  });
}
