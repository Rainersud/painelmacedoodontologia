import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

/** Telas que passaram a ser cards de uma área (Metas / Objetivos, Dados / Métricas). */
export function MovedTo({ path, tab }: { path: string; tab: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('aba', tab);
  return <Navigate to={`${path}?${params}`} replace />;
}

/** Tela inicial: Metas da Clínica para quem tem acesso; senão, o Comercial 1. */
export function HomeRedirect() {
  const { isAdmin } = useAuth();
  const { canView } = usePermissions();
  return <Navigate to={isAdmin || canView('metas_clinica') ? '/objetivos?aba=metas' : '/funil'} replace />;
}
