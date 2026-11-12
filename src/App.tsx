import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardCallCenter = lazy(() => import("./pages/DashboardCallCenter"));
const Funil = lazy(() => import("./pages/Funil"));
const FollowUp = lazy(() => import("./pages/FollowUp"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Indicacoes = lazy(() => import("./pages/Indicacoes"));
const MetasClinica = lazy(() => import("./pages/MetasClinica"));
const BonusMetas = lazy(() => import("./pages/BonusMetas"));
const PlanoIncentivoV2 = lazy(() => import("./pages/PlanoIncentivoV2"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Perfil = lazy(() => import("./pages/Perfil"));
const CreditoLiberado = lazy(() => import("./pages/CreditoLiberado"));
const CACDashboard = lazy(() => import("./pages/CACDashboard"));
const MetricasVendas = lazy(() => import("./pages/MetricasVendas"));
const Reunioes = lazy(() => import("./pages/Reunioes"));
const FunilTrafego = lazy(() => import("./pages/FunilTrafego"));
const CentralFunis = lazy(() => import("./pages/CentralFunis"));
const Comercial2 = lazy(() => import("./pages/Comercial2"));
const Remarketing = lazy(() => import("./pages/Remarketing"));
const DashboardBI = lazy(() => import("./pages/DashboardBI"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
structuralSharing: true,
    },
    mutations: { retry: 0 },
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
                <Route path="/crm" element={<Navigate to="/" replace />} />
                <Route path="/funil" element={<ProtectedRoute><Funil /></ProtectedRoute>} />
                <Route path="/indicacoes" element={<ProtectedRoute><Indicacoes /></ProtectedRoute>} />
                <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<Navigate to="/tarefas" replace />} />
                <Route path="/credito-liberado" element={<ProtectedRoute><CreditoLiberado /></ProtectedRoute>} />
                <Route path="/metas" element={<Navigate to="/metas-clinica" replace />} />
                <Route path="/metas-clinica" element={<ProtectedRoute><MetasClinica /></ProtectedRoute>} />
                <Route path="/bonus-metas" element={<ProtectedRoute><BonusMetas /></ProtectedRoute>} />
                <Route path="/plano-incentivo" element={<ProtectedRoute><PlanoIncentivoV2 /></ProtectedRoute>} />
                <Route path="/incentivos" element={<Navigate to="/plano-incentivo" replace />} />
                <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/cac" element={<ProtectedRoute><CACDashboard /></ProtectedRoute>} />
                <Route path="/metricas-vendas" element={<ProtectedRoute><MetricasVendas /></ProtectedRoute>} />
                <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
                <Route path="/funil-trafego" element={<ProtectedRoute><FunilTrafego /></ProtectedRoute>} />
                <Route path="/central-funis" element={<ProtectedRoute><CentralFunis /></ProtectedRoute>} />
                <Route path="/comercial-2" element={<ProtectedRoute><Comercial2 /></ProtectedRoute>} />
                <Route path="/follow-up" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
                <Route path="/remarketing" element={<ProtectedRoute><Remarketing /></ProtectedRoute>} />
                <Route path="/bi" element={<ProtectedRoute><DashboardBI /></ProtectedRoute>} />
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
