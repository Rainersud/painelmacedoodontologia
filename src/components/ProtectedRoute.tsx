import { memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPath } from '@/lib/access';
import { AppLayout } from '@/components/layout/AppLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/** Tela bloqueada para este acesso: aparece em preto e branco, sem o conteúdo. */
export function LockedScreen({ title = 'Área sem acesso' }: { title?: string }) {
  return (
    <AppLayout title={title}>
      <div className="grayscale opacity-70 rounded-2xl border border-dashed bg-muted/40 p-10 text-center space-y-3 max-w-xl mx-auto mt-10">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden />
        <p className="text-lg font-semibold">Seu acesso não inclui esta área</p>
        <p className="text-sm text-muted-foreground">Use o menu ao lado para ir às áreas liberadas. Se precisar desta, fale com o administrador.</p>
      </div>
    </AppLayout>
  );
}

/** Exige login; telas fora do acesso da pessoa aparecem bloqueadas. */
function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, loading, roleLoading, access } = useAuth();
  const location = useLocation();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Carregando">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (requireAdmin && !access.canAdmin) return <LockedScreen />;
  if (!canOpenPath(access, location.pathname)) {
    // Comparecimento (Lidiane): a tela inicial vira o Comercial 1
    if (location.pathname === '/' && access.allowedPaths?.length) return <Navigate to={access.allowedPaths[0]} replace />;
    return <LockedScreen />;
  }
  return <>{children}</>;
}

export default memo(ProtectedRoute);
