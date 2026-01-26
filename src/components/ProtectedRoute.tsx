import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const LoadingScreen = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';

function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, roleLoading, isAdmin } = useAuth();
  const location = useLocation();
  const [forceComplete, setForceComplete] = useState(false);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceComplete(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Only wait for initial auth loading if not forced
  if (loading && !forceComplete) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If requiring admin, wait for role to load (but not forever)
  if (requireAdmin) {
    if (roleLoading && !forceComplete) {
      return <LoadingScreen />;
    }
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default memo(ProtectedRoute);
