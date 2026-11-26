import { memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Clock, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/** Conta criada pelo link: espera o administrador liberar o acesso. */
function PendingScreen() {
  const { fullName, signOut, previewAs, setPreviewAs } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="monday-card w-full max-w-md p-8 text-center space-y-3">
        <Clock className="h-8 w-8 mx-auto text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Conta criada{fullName ? `, ${fullName.split(' ')[0]}` : ''}</h1>
        <p className="text-sm text-muted-foreground">
          Seu acesso ainda não foi liberado. Assim que o administrador definir sua função, é só entrar de novo ou recarregar esta página.
        </p>
        {previewAs ? (
          <Button variant="outline" onClick={() => setPreviewAs(null)}>Sair da visualização</Button>
        ) : (
          <Button variant="outline" onClick={() => signOut()}>Sair</Button>
        )}
      </div>
    </div>
  );
}

/** Exige login; telas fora do acesso da pessoa aparecem bloqueadas. */
function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, loading, ready, access } = useAuth();
  const location = useLocation();

  // Carregamento só na primeira entrada; depois disso a tela nunca é desmontada
  // (ao trocar de aba e voltar, tudo continua de onde parou).
  if (loading || (user && !ready)) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Carregando">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (access.pending) return <PendingScreen />;
  if (requireAdmin && !access.canAdmin) return <LockedScreen />;
  if (!canOpenPath(access, location.pathname)) {
    // Comparecimento (Lidiane): a tela inicial vira o Comercial 1
    if (location.pathname === '/' && access.allowedPaths?.length) return <Navigate to={access.allowedPaths[0]} replace />;
    return <LockedScreen />;
  }
  return <>{children}</>;
}

export default memo(ProtectedRoute);
