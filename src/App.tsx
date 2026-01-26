import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardCallCenter = lazy(() => import("./pages/DashboardCallCenter"));
const CRMDashboard = lazy(() => import("./pages/CRMDashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Funil = lazy(() => import("./pages/Funil"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/call-center" element={<ProtectedRoute><DashboardCallCenter /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/funil" element={<ProtectedRoute><Funil /></ProtectedRoute>} />
                <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
                <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
                <Route path="/metas-clinica" element={<ProtectedRoute><MetasClinica /></ProtectedRoute>} />
                <Route path="/bonus-metas" element={<ProtectedRoute><BonusMetas /></ProtectedRoute>} />
                <Route path="/plano-incentivo" element={<ProtectedRoute><PlanoIncentivoV2 /></ProtectedRoute>} />
                <Route path="/incentivos" element={<ProtectedRoute><PlanoIncentivo /></ProtectedRoute>} />
                <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
