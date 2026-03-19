import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ModulePermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
}

// Module key mapping
export const MODULE_KEYS = {
  dashboard: 'dashboard',
  call_center: 'call_center',
  funil: 'funil',
  indicacoes: 'indicacoes',
  agendamentos: 'agendamentos',
  tarefas: 'tarefas',
  credito_liberado: 'credito_liberado',
  metas_clinica: 'metas_clinica',
  bonus_metas: 'bonus_metas',
  plano_incentivo: 'plano_incentivo',
  alertas: 'alertas',
  relatorios: 'relatorios',
  configuracoes: 'configuracoes',
  perfil: 'perfil',
} as const;

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  call_center: 'Call Center',
  funil: 'Funil de Vendas',
  indicacoes: 'Indicações',
  agendamentos: 'Agendamentos',
  tarefas: 'Tarefas',
  metas_clinica: 'Metas da Clínica',
  bonus_metas: 'Bônus por Metas',
  plano_incentivo: 'Plano de Incentivo',
  alertas: 'Alertas',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  perfil: 'Perfil',
};

export function usePermissions() {
  const { user, isAdmin } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as ModulePermission[];
    },
    enabled: !!user?.id && !isAdmin,
  });

  const canView = (module: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_view ?? false;
  };

  const canEdit = (module: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_edit ?? false;
  };

  return { permissions, isLoading, canView, canEdit, isAdmin };
}
