import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, Building2 } from 'lucide-react';
import { useCreditApprovedPatients } from '@/hooks/useCreditApprovedPatients';
import { FUNNEL_STAGES } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

export function CreditApprovedWidget() {
  const { data: patients, isLoading } = useCreditApprovedPatients();

  const getStageLabel = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.label || status;
  };

  const getStageColor = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.color || 'bg-muted';
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-success" />
            Pacientes com Crédito Liberado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-success" />
            Pacientes com Crédito Liberado
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-semibold">
            {patients?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!patients || patients.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nenhum paciente com crédito aprovado</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-2">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  className="p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium truncate">{patient.lead_name}</p>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border-0 px-1.5 py-0", getStageColor(patient.lead_status), "text-white")}
                    >
                      {getStageLabel(patient.lead_status)}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {patient.credit_companies.map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {c.name}
                        </span>
                        <span className="font-semibold text-success">{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
