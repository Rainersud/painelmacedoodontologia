import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';
import { FUNNEL_STAGES } from '@/types/crm';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

const CreditoLiberado = () => {
  const { data: patients, isLoading } = useCreditApprovedPatients();

  const totalCredit = patients?.reduce((sum, p) => sum + p.credit_approved_value, 0) || 0;

  const getStageLabel = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.label || status;
  };

  const getStageColor = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.color || 'bg-muted';
  };

  return (
    <AppLayout title="Pacientes com Crédito Liberado">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{patients?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Crédito Total Disponível</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-success">{formatCurrency(totalCredit)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {patients && patients.length > 0
                        ? formatCurrency(totalCredit / patients.length)
                        : 'R$ 0'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-success" />
              Pacientes com Crédito Aprovado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : !patients || patients.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum paciente com crédito aprovado no momento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crédito Aprovado</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orçamento Pendente</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa no Funil</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Última Atualização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {patients.map(patient => (
                      <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                              <DollarSign className="h-4 w-4 text-success" />
                            </div>
                            <span className="text-sm font-medium">{patient.lead_name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-sm font-bold text-success">
                            {formatCurrency(patient.credit_approved_value)}
                          </span>
                        </td>
                        <td className="py-3">
                          {patient.budget_value && patient.budget_value > 0 ? (
                            <span className="text-sm font-medium text-warning">
                              {formatCurrency(patient.budget_value)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs border-0 px-2 py-0.5", getStageColor(patient.lead_status), "text-white")}
                          >
                            {getStageLabel(patient.lead_status)}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(patient.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreditoLiberado;
