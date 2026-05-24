import { AppLayout } from '@/components/layout/AppLayout';
import { useStagnationAlerts } from '@/hooks/useStagnationAlerts';
import { PeriodFilterProvider } from '@/components/dashboard/PeriodFilterContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MasterPeriodFilter } from '@/components/dashboard/MasterPeriodFilter';
import { ROIAnalyticsWidget } from '@/components/dashboard/ROIAnalyticsWidget';
import { LeadOriginsWidget, LossReasonsWidget } from '@/components/dashboard/LeadOriginsWidget';
import { StrategicOriginsWidget } from '@/components/dashboard/StrategicOriginsWidget';
import { StrategicInsightsWidget } from '@/components/dashboard/StrategicInsightsWidget';
import { RecentLeadsWidget } from '@/components/dashboard/RecentLeadsWidget';
import { PendingTasksBanner } from '@/components/dashboard/PendingTasksBanner';
import { ClinicGoalsPanel } from '@/components/clinic-goals/ClinicGoalsPanel';

const Dashboard = () => {
  useStagnationAlerts();

  return (
    <AppLayout title="Dashboard">
      <PeriodFilterProvider>
        <div className="space-y-6 animate-fade-in">
          {/* Quote */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-1">
            <p className="text-sm text-foreground leading-relaxed">
              O consumidor que você <strong>QUER</strong> como cliente tem que saber que o seu produto <strong>É PARA ELE</strong>.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              O consumidor que você <strong>NÃO</strong> quer como cliente tem que saber que o produto <strong>NÃO É PARA ELE</strong>!
            </p>
          </div>

          {/* Header + filtros */}
          <DashboardHeader />

          {/* Calendário mestre — controla todos os widgets abaixo */}
          <MasterPeriodFilter />


          {/* Pending tasks banner */}
          <PendingTasksBanner />

          {/* Metas da Clínica — painel premium sincronizado com Gestão */}
          <ClinicGoalsPanel />

          {/* Origens Estratégicas — Recebidos vs Agendados */}
          <StrategicOriginsWidget />

          {/* ROI Inteligente */}
          <ROIAnalyticsWidget />

          {/* Origem dos Leads + Perdas por Motivo */}
          <div className="grid gap-6 lg:grid-cols-2">
            <LeadOriginsWidget />
            <LossReasonsWidget />
          </div>


          {/* Rankings, previsão e insights */}
          <StrategicInsightsWidget />

          {/* Leads recentes */}
          <RecentLeadsWidget />
        </div>
      </PeriodFilterProvider>
    </AppLayout>
  );
};

export default Dashboard;
