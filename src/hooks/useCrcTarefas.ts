import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfDay, format, startOfDay, startOfMonth, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Contagem } from '@/lib/ascension/crcGuide';

const PROJETO = 'crc_tarefas';

export interface TarefaMarcada { by: string | null; at: string }
/** dia do mês → id da tarefa → quem marcou e quando */
export type MarcacoesMes = Record<number, Record<number, TarefaMarcada>>;

/** Tarefas da rotina da CRC marcadas no mês (tabela ascension_checklists, projeto crc_tarefas). */
export function useCrcTarefas(month: Date) {
  const mes = format(startOfMonth(month), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['crc-tarefas', mes],
    queryFn: async (): Promise<MarcacoesMes> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos tipos gerados
      const { data, error } = await (supabase as any)
        .from('ascension_checklists')
        .select('item, dia, marcado, updated_by, updated_at')
        .eq('mes', mes)
        .eq('projeto', PROJETO);
      if (error) throw error;
      const out: MarcacoesMes = {};
      for (const r of (data ?? []) as { item: number; dia: number; marcado: boolean; updated_by: string | null; updated_at: string }[]) {
        if (!r.marcado) continue;
        (out[r.dia] ??= {})[r.item] = { by: r.updated_by, at: r.updated_at };
      }
      return out;
    },
  });
}

export function useToggleCrcTarefa(month: Date) {
  const qc = useQueryClient();
  const mes = format(startOfMonth(month), 'yyyy-MM-dd');
  const key = ['crc-tarefas', mes];
  return useMutation({
    mutationFn: async ({ item, dia, marcado }: { item: number; dia: number; marcado: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos tipos gerados
      const { error } = await (supabase as any).from('ascension_checklists').upsert(
        { mes, projeto: PROJETO, item, dia, marcado, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'mes,projeto,item,dia' },
      );
      if (error) throw error;
    },
    onMutate: async ({ item, dia, marcado }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MarcacoesMes>(key);
      const next: MarcacoesMes = { ...(prev ?? {}), [dia]: { ...(prev?.[dia] ?? {}) } };
      if (marcado) next[dia][item] = { by: null, at: new Date().toISOString() };
      else delete next[dia][item];
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Números do dia vindos do sistema, para cada tarefa saber quantos pacientes a esperam. */
export function useCrcContagens(day: Date) {
  const d0 = startOfDay(day);
  return useQuery({
    queryKey: ['crc-contagens', format(d0, 'yyyy-MM-dd')],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Record<Contagem, number>> => {
      const iso = (d: Date) => d.toISOString();
      const consultas = async (dia: Date, extra?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let q = supabase.from('appointments').select('id', { count: 'exact', head: true })
          .gte('scheduled_at', iso(startOfDay(dia))).lte('scheduled_at', iso(endOfDay(dia)))
          .is('cancelled_at', null);
        if (extra) q = extra(q);
        const { count, error } = await q;
        if (error || count === null) throw error ?? new Error('sem contagem');
        return count;
      };
      const [leads, hoje, amanha, d2, faltas] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .gte('created_at', iso(d0)).lte('created_at', iso(endOfDay(d0)))
          .then(r => { if (r.error || r.count === null) throw r.error ?? new Error('sem contagem'); return r.count; }),
        consultas(d0),
        consultas(addDays(d0, 1)),
        consultas(addDays(d0, 2)),
        consultas(subDays(d0, 1), q => q.is('attended_at', null)),
      ]);
      return { leads_hoje: leads, consultas_hoje: hoje, consultas_amanha: amanha, consultas_48h: d2, faltas_ontem: faltas };
    },
  });
}
