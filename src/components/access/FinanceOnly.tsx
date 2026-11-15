import { useAuth } from '@/contexts/AuthContext';

/** Mostra o conteúdo só para quem pode mexer no financeiro (lançar, pagar, editar valores). */
export function FinanceOnly({ children }: { children: React.ReactNode }) {
  const { access } = useAuth();
  return access.canFinance ? <>{children}</> : null;
}
