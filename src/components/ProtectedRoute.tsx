import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, memo } from 'react';

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
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Safety timeout: if loading takes more than 8 seconds, assume no auth
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || roleLoading) {
        console.warn('[ProtectedRoute] Auth loading timeout reached');
        setTimeoutReached(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [loading, roleLoading]);

  // If timeout is reached and still loading, redirect to login
  if (timeoutReached && (loading || roleLoading)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading || roleLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default memo(ProtectedRoute);
