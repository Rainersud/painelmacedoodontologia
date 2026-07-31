import { memo } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Acesso livre: login/senha removidos da área de membros.
function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}

export default memo(ProtectedRoute);
