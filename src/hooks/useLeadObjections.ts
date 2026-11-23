import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadObjection {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  categoria: string;
  detalhe: string | null;
  created_by: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela nova, fora dos tipos gerados
const table = () => (supabase as any).from('lead_objections');

/** Objeções registradas pela CRC num intervalo de datas (Tarefas CRC e Análise de Perdas). */
export function useLeadObjections(start: Date, end: Date) {
  return useQuery({
    queryKey: ['lead-objections', start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<LeadObjection[]> => {
      const { data, error } = await table()
        .select('id, lead_id, lead_name, categoria, detalhe, created_by, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddLeadObjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: { lead_id: string | null; lead_name: string | null; categoria: string; detalhe: string | null }) => {
      const { error } = await table().insert(o);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-objections'] }),
  });
}

export function useDeleteLeadObjection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-objections'] }),
  });
}
