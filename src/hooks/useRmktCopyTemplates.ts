import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RmktCopyTemplate {
  id: string;
  stage_key: string;
  phase: string;
  suggested_copy: string;
  custom_copy: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useRmktCopyTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rmkt-copy-templates'],
    queryFn: async (): Promise<RmktCopyTemplate[]> => {
      const { data, error } = await supabase
        .from('rmkt_copy_templates' as any)
        .select('*')
        .order('stage_key');

      if (error) throw error;
      return (data || []) as unknown as RmktCopyTemplate[];
    },
    enabled: !!user,
  });
}

export function useUpdateRmktCopy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stageKey, customCopy }: { stageKey: string; customCopy: string }) => {
      const { error } = await supabase
        .from('rmkt_copy_templates' as any)
        .update({
          custom_copy: customCopy || null,
          updated_by: user?.id,
        } as any)
        .eq('stage_key', stageKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rmkt-copy-templates'] });
      toast.success('Copy salva!');
    },
    onError: () => toast.error('Erro ao salvar copy'),
  });
}
