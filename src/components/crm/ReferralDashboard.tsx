import { Card, CardContent } from '@/components/ui/card';
import { useReferralDashboard } from '@/hooks/useReferrals';
import { Users, UserCheck, Gift, TrendingUp, Clock, Loader2 } from 'lucide-react';

export function ReferralDashboard() {
  const { data, isLoading } = useReferralDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const metrics = [
    {
      title: 'Indicações no Mês',
      value: data?.totalReferralsMonth || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Convertidos por Indicação',
      value: data?.convertedByReferral || 0,
      icon: UserCheck,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Bonificações Pagas',
      value: formatCurrency(data?.totalRewardsPaid || 0),
      icon: Gift,
      color: 'text-success',
      bg: 'bg-success/10',
      subtitle: data?.totalBonusPending ? `${formatCurrency(data.totalBonusPending)} pendente` : undefined,
    },
    {
      title: 'Faturamento por Indicações',
      value: formatCurrency(data?.revenueFromReferrals || 0),
      icon: TrendingUp,
      color: 'text-chart-2',
      bg: 'bg-chart-2/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.title} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.title}</p>
                <p className="text-lg font-bold">{m.value}</p>
                {'subtitle' in m && m.subtitle && (
                  <p className="text-[10px] text-warning-strong">{m.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
