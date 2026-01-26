 import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
 import { memo } from 'react';

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

   // Only wait for initial auth loading, not roleLoading
   // This allows users to access the app even if role/profile queries are slow
   if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

   // If requiring admin, wait for role to load
   if (requireAdmin) {
     if (roleLoading) {
       return <LoadingScreen />;
     }
     if (!isAdmin) {
       return <Navigate to="/" replace />;
     }
  }

  return <>{children}</>;
}

export default memo(ProtectedRoute);
