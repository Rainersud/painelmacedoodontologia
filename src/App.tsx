import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for better performance
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
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/call-center" element={<DashboardCallCenter />} />
                <Route path="/crm" element={<CRMDashboard />} />
                
                <Route path="/funil" element={<Funil />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/metas-clinica" element={<MetasClinica />} />
                <Route path="/bonus-metas" element={<BonusMetas />} />
                <Route path="/plano-incentivo" element={<PlanoIncentivoV2 />} />
                <Route path="/incentivos" element={<PlanoIncentivo />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
