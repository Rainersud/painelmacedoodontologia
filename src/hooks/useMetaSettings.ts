import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MetaSetting } from '@/types/crm';

export function useMetaSettings() {
  return useQuery({
    queryKey: ['meta-settings'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('meta_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      return Object.fromEntries(
        (data || []).map(s => [s.setting_key, Number(s.setting_value)])
      );
    },
  });
}

export function useUpdateMetaSetting() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      if (!isAdmin) throw new Error('Apenas administradores podem alterar metas');

      const { error } = await supabase
        .from('meta_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-settings'] });
      toast.success('Meta atualizada!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar meta');
    },
  });
}
