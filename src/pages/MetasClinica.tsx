import { PageShell } from '@/components/layout/PageShell';
import { PeriodFilterProvider } from '@/components/dashboard/PeriodFilterContext';
import { MasterPeriodFilter } from '@/components/dashboard/MasterPeriodFilter';
import { ClinicGoalsPanel } from '@/components/clinic-goals/ClinicGoalsPanel';
import { GoalLadderCard } from '@/components/clinic-goals/GoalLadderCard';
import { StrategicOriginsWidget } from '@/components/dashboard/StrategicOriginsWidget';
import { ROIAnalyticsWidget } from '@/components/dashboard/ROIAnalyticsWidget';
import { LeadOriginsWidget, LossReasonsWidget } from '@/components/dashboard/LeadOriginsWidget';
import { RevenueForecastWidget } from '@/components/dashboard/StrategicInsightsWidget';
import { useStagnationAlerts } from '@/hooks/useStagnationAlerts';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

/**
 * Metas da Clínica: o painel central da gestão (substitui o antigo Dashboard).
 * Um filtro de período só (Dia / Semana / Mês / Ano, com comparação a anos anteriores),
 * o objetivo central que manda em todas as metas e os números do Comercial em tempo real.
 */
export default function MetasClinica({ embedded = false }: { embedded?: boolean } = {}) {
  useStagnationAlerts();
  useLiveRefresh();

  return (
    <PageShell embedded={embedded} title="Metas da Clínica">
      <PeriodFilterProvider>
        <div className="space-y-6">
          <MasterPeriodFilter />
          <GoalLadderCard />
          <ClinicGoalsPanel />
          <StrategicOriginsWidget />
          <ROIAnalyticsWidget />
          <div className="grid gap-6 lg:grid-cols-2">
            <LeadOriginsWidget />
            <LossReasonsWidget />
          </div>
          <RevenueForecastWidget />
        </div>
      </PeriodFilterProvider>
    </PageShell>
  );
}
