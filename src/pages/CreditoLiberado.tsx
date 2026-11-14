import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Users, Building2 } from 'lucide-react';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';
import { FUNNEL_STAGES } from '@/types/crm';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';

const CreditoLiberado = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { data: patients, isLoading } = useCreditApprovedPatients();

  const getStageLabel = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.label || status;
  };

  const totalBy = (company: string) =>
    (patients ?? []).reduce((sum, p) => sum + (p.credit_companies.find(c => c.name === company)?.value ?? 0), 0);

  const getStageColor = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.color || 'bg-muted';
  };

  return (
    <PageShell embedded={embedded} title="Pacientes com Crédito Liberado">
      <div className="space-y-6">
        {/* Resumo: pacientes e total liberado por empresa */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Pacientes com crédito', value: patients?.length || 0, money: false, icon: Users },
            { label: 'Total PAGMAIS', value: totalBy('PAGMAIS'), money: true, icon: Building2 },
            { label: 'Total MAIORAL', value: totalBy('MAIORAL'), money: true, icon: Building2 },
          ].map(card => (
            <Card key={card.label} className="monday-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <card.icon className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums">
                      {card.money ? formatCurrency(card.value) : card.value}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patient.credit_companies.map(c => (
                        <div
                          key={c.name}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-md border',
                            c.value > 0 ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-transparent',
                          )}
                        >
                          <Building2 className={cn('h-3.5 w-3.5 shrink-0', c.value > 0 ? 'text-success' : 'text-muted-foreground')} />
                          <span className="text-xs font-medium">{c.name}</span>
                          <span className={cn('text-sm font-bold ml-auto tabular-nums', c.value > 0 ? 'text-success' : 'text-muted-foreground font-normal text-xs')}>
                            {c.value > 0 ? formatCurrency(c.value) : 'Não liberado'}
                          </span>
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
    </PageShell>
  );
};

export default CreditoLiberado;
