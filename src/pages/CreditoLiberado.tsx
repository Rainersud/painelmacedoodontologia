import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Users, Building2 } from 'lucide-react';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';
import { FUNNEL_STAGES } from '@/types/crm';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';

const CreditoLiberado = () => {
  const { data: patients, isLoading } = useCreditApprovedPatients();

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
        {/* Summary */}
        <Card className="monday-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pacientes com Crédito</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{patients?.length || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient List */}
        <Card className="monday-card">
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
                  <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : !patients || patients.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum paciente com crédito aprovado no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map(patient => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <CreditCard className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{patient.lead_name}</p>
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 mt-0.5">
                            APROVADO
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs border-0 px-2 py-0.5", getStageColor(patient.lead_status), "text-white")}
                        >
                          {getStageLabel(patient.lead_status)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(patient.updated_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {patient.credit_companies.map(c => (
                        <div key={c.name} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs text-muted-foreground">{c.name}:</span>
                          <span className="text-xs font-bold text-success ml-auto">{formatCurrency(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreditoLiberado;
