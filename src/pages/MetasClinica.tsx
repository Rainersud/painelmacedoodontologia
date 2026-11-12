import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useClinicGoals, HEALTHY_RATES } from '@/hooks/useClinicGoals';
import { ClinicGoalsPanel } from '@/components/clinic-goals/ClinicGoalsPanel';
import { PeriodFilterProvider } from '@/components/dashboard/PeriodFilterContext';
import { toast } from 'sonner';

export default function MetasClinica() {
  const { data, isLoading, updateGoal, isAdmin } = useClinicGoals();
  const [editingGoal, setEditingGoal] = useState<{ key: string; value: number; rate?: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const healthyRates = data?.healthyRates || {
    leads: { target: HEALTHY_RATES.leads.target, rate: 100 },
    agendamentos: { target: HEALTHY_RATES.agendamentos.target, rate: HEALTHY_RATES.agendamentos.rate },
    comparecimentos: { target: HEALTHY_RATES.comparecimentos.target, rate: HEALTHY_RATES.comparecimentos.rate },
    fechamentos: { target: HEALTHY_RATES.fechamentos.target, rate: HEALTHY_RATES.fechamentos.rate },
    ticketMedio: { target: HEALTHY_RATES.ticketMedio.target },
    faturamento: { target: HEALTHY_RATES.faturamento.target },
    investimento: { target: HEALTHY_RATES.investimento.target },
    roi: { target: HEALTHY_RATES.roi.target },
  };

  const handleSaveGoal = async () => {
    if (!editingGoal) return;
    
    try {
      await updateGoal.mutateAsync({ 
        key: editingGoal.key, 
        value: editingGoal.value,
        rate: editingGoal.rate 
      });
      toast.success('Meta salva');
      setIsDialogOpen(false);
      setEditingGoal(null);
    } catch (error) {
      toast.error('A meta não foi salva. Confira a conexão e tente de novo.');
    }
  };



  const formatValue = (key: string, value: number) => {
    if (['ticket_medio', 'faturamento', 'investimento'].includes(key)) {
      return `R$ ${value.toLocaleString('pt-BR')}`;
    }
    if (key === 'roi') return `${value.toLocaleString('pt-BR')}x`;
    return value.toLocaleString('pt-BR');
  };

  /** Metas mensais editáveis: uma linha por meta, todas lidas por Dashboard, Plano de Incentivo e Reuniões. */
  const goalRows = [
    { key: 'leads', label: 'Novos leads', value: healthyRates.leads.target, rate: undefined, rateLabel: '' },
    { key: 'agendamentos', label: 'Agendamentos', value: healthyRates.agendamentos.target, rate: healthyRates.agendamentos.rate, rateLabel: 'Taxa de agendamento' },
    { key: 'comparecimentos', label: 'Comparecimentos', value: healthyRates.comparecimentos.target, rate: healthyRates.comparecimentos.rate, rateLabel: 'Taxa de comparecimento' },
    { key: 'fechamentos', label: 'Vendas realizadas', value: healthyRates.fechamentos.target, rate: healthyRates.fechamentos.rate, rateLabel: 'Taxa de fechamento' },
    { key: 'ticket_medio', label: 'Ticket médio', value: healthyRates.ticketMedio.target, rate: undefined, rateLabel: '' },
    { key: 'faturamento', label: 'Faturamento', value: healthyRates.faturamento.target, rate: undefined, rateLabel: '' },
    { key: 'investimento', label: 'Investimento em tráfego', value: healthyRates.investimento.target, rate: undefined, rateLabel: '' },
    { key: 'roi', label: 'ROI', value: healthyRates.roi.target, rate: undefined, rateLabel: '' },
  ];

  return (
    <AppLayout title="Metas da Clínica">
      <div className="space-y-4">
        <PeriodFilterProvider>
          <ClinicGoalsPanel />
        </PeriodFilterProvider>

        <Card className="monday-card">
          <CardContent className="p-0">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold">Metas mensais</h3>
              <p className="text-sm text-muted-foreground">
                Valores para um mês de 20 dias úteis. Dia e semana são calculados na proporção dos dias úteis.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Metas mensais da clínica</caption>
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th scope="col" className="text-left font-medium px-5 py-2">Meta</th>
                    <th scope="col" className="text-right font-medium px-3 py-2">Valor no mês</th>
                    <th scope="col" className="text-left font-medium px-3 py-2">Taxa saudável da etapa</th>
                    {isAdmin && <th scope="col" className="px-5 py-2"><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {goalRows.map(row => (
                    <tr key={row.key} className="border-b border-border last:border-0">
                      <th scope="row" className="text-left font-normal px-5 py-2.5">{row.label}</th>
                      <td className="text-right font-semibold px-3 py-2.5">{isLoading ? '–' : formatValue(row.key, row.value)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.rate !== undefined ? <>{row.rateLabel}: <span className="text-foreground font-medium">{row.rate}%</span></> : '–'}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-1.5 text-right">
                          <Dialog open={isDialogOpen && editingGoal?.key === row.key} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingGoal(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingGoal({ key: row.key, value: row.value, rate: row.rate })}
                              >
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar meta: {row.label}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="goal-value">
                                    Valor no mês {['ticket_medio', 'faturamento', 'investimento'].includes(row.key) ? '(R$)' : row.key === 'roi' ? '(vezes o investimento)' : ''}
                                  </Label>
                                  <Input
                                    id="goal-value"
                                    type="number"
                                    value={editingGoal?.value || 0}
                                    onChange={(e) => setEditingGoal(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                                    min={0}
                                    step={row.key === 'roi' ? 0.1 : 1}
                                  />
                                </div>
                                {row.rate !== undefined && (
                                  <div className="space-y-2">
                                    <Label htmlFor="goal-rate">{row.rateLabel} (%)</Label>
                                    <Input
                                      id="goal-rate"
                                      type="number"
                                      value={editingGoal?.rate || 0}
                                      onChange={(e) => setEditingGoal(prev => prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null)}
                                      min={0}
                                      max={100}
                                    />
                                  </div>
                                )}
                                <Button className="w-full" onClick={handleSaveGoal} disabled={updateGoal.isPending}>
                                  {updateGoal.isPending ? 'Salvando meta...' : 'Salvar meta'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
