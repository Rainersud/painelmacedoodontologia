import { AppLayout } from '@/components/layout/AppLayout';
import { ReferralDashboard } from '@/components/crm/ReferralDashboard';
import { ReferralRankingWidget } from '@/components/crm/ReferralRankingWidget';

const Indicacoes = () => {
  return (
    <AppLayout title="Indicações">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Dashboard de Indicações</h2>
          <p className="text-sm text-muted-foreground">Métricas do programa de indicações e benefícios</p>
        </div>
        <ReferralDashboard />
        <ReferralRankingWidget />
      </div>
    </AppLayout>
  );
};

export default Indicacoes;
