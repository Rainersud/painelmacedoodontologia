import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardCallCenter = lazy(() => import("./pages/DashboardCallCenter"));
const CRMDashboard = lazy(() => import("./pages/CRMDashboard"));
const Funil = lazy(() => import("./pages/Funil"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Indicacoes = lazy(() => import("./pages/Indicacoes"));
const Agendamentos = lazy(() => import("./pages/Agendamentos"));
const Metas = lazy(() => import("./pages/Metas"));
const MetasClinica = lazy(() => import("./pages/MetasClinica"));
const BonusMetas = lazy(() => import("./pages/BonusMetas"));
const PlanoIncentivo = lazy(() => import("./pages/PlanoIncentivo"));
const PlanoIncentivoV2 = lazy(() => import("./pages/PlanoIncentivoV2"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Perfil = lazy(() => import("./pages/Perfil"));
const CreditoLiberado = lazy(() => import("./pages/CreditoLiberado"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
        <ErrorBoundary>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/call-center" element={<ProtectedRoute><DashboardCallCenter /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
                <Route path="/funil" element={<ProtectedRoute><Funil /></ProtectedRoute>} />
                <Route path="/indicacoes" element={<ProtectedRoute><Indicacoes /></ProtectedRoute>} />
                <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
                <Route path="/credito-liberado" element={<ProtectedRoute><CreditoLiberado /></ProtectedRoute>} />
                <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
                <Route path="/metas-clinica" element={<ProtectedRoute><MetasClinica /></ProtectedRoute>} />
                <Route path="/bonus-metas" element={<ProtectedRoute><BonusMetas /></ProtectedRoute>} />
                <Route path="/plano-incentivo" element={<ProtectedRoute><PlanoIncentivoV2 /></ProtectedRoute>} />
                <Route path="/incentivos" element={<ProtectedRoute><PlanoIncentivo /></ProtectedRoute>} />
                <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute requireAdmin><Configuracoes /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </ErrorBoundary>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
