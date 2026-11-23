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
  ascension: 'ascension',
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
  credito_liberado: 'Crédito Liberado',
  metas_clinica: 'Metas da Clínica',
  bonus_metas: 'Bônus por Metas',
  plano_incentivo: 'Plano de Incentivo',
  alertas: 'Alertas',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
  perfil: 'Perfil',
  ascension: 'ASCENSION (planilhas)',
};

const FINANCE_MODULES = new Set(['credito_liberado']);
const GOAL_MODULES = new Set(['metas_clinica', 'bonus_metas', 'plano_incentivo']);
const MODULE_PATH: Record<string, string> = { funil: '/funil', reunioes: '/reunioes', perfil: '/perfil', configuracoes: '/configuracoes' };

/** Permissões por módulo, derivadas do perfil de acesso (lib/access). */
export function usePermissions() {
  const { isAdmin, access } = useAuth();

  const canView = (module: string): boolean => {
    if (access.isAdmin) return true;
    if (module === 'configuracoes') return false;
    if (access.allowedPaths) return access.allowedPaths.includes(MODULE_PATH[module] ?? '__');
    return true;
  };

  const canEdit = (module: string): boolean => {
    if (!canView(module)) return false;
    if (FINANCE_MODULES.has(module)) return access.canFinance;
    if (GOAL_MODULES.has(module)) return access.canEditGoals;
    return true;
  };

  return { permissions: [] as ModulePermission[], isLoading: false, canView, canEdit, isAdmin };
}
