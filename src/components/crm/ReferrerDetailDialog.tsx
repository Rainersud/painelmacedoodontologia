import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReferralsByLead, useUpdateReferral } from '@/hooks/useReferrals';
import { FUNNEL_STAGES } from '@/types/crm';
import { Users, UserCheck, DollarSign, TrendingUp, ExternalLink, Loader2, Gift, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReferrerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerId: string | null;
  referrerName: string;
  onViewLead?: (leadId: string) => void;
}

export function ReferrerDetailDialog({
  open,
  onOpenChange,
  referrerId,
  referrerName,
  onViewLead,
}: ReferrerDetailDialogProps) {
  const { data, isLoading } = useReferralsByLead(referrerId || undefined);
  const updateReferral = useUpdateReferral();

  const referrals = data?.asReferrer || [];

  const totalAttended = referrals.filter(
    r => r.referred?.status === 'compareceu' || r.referred?.status === 'fechado'
  ).length;
  const totalConverted = referrals.filter(r => r.referred?.status === 'fechado' || r.referred?.status === 'tratamento_andamento').length;
  const totalRevenue = referrals.reduce((sum, r) => {
    if (r.referred?.status === 'fechado' || r.referred?.status === 'tratamento_andamento') {
      return sum + (r.referred.treatment_value || 0);
    }
    return sum;
  }, 0);
  const totalBonusPending = referrals.filter(r => r.bonus_status !== 'pago' && r.reward_value > 0).reduce((s, r) => s + r.reward_value, 0);
  const totalBonusPaid = referrals.filter(r => r.bonus_status === 'pago').reduce((s, r) => s + r.reward_value, 0);

  const getStageLabel = (status: string) => FUNNEL_STAGES.find(s => s.key === status)?.label || status;
  const getStageColor = (status: string) => FUNNEL_STAGES.find(s => s.key === status)?.color || 'bg-muted';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  const handleUpdateBonusValue = (refId: string, value: number) => {
    updateReferral.mutate({ id: refId, updates: { reward_value: value } as any });
  };

  const handleMarkAsPaid = (refId: string) => {
    updateReferral.mutate({ id: refId, updates: { bonus_status: 'pago', bonus_paid_at: new Date().toISOString() } as any }, {
      onSuccess: () => toast.success('Bonificação marcada como paga!'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Indicações de {referrerName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-primary">{referrals.length}</p>
                  <p className="text-[10px] text-muted-foreground">Indicações</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-chart-2" />
                  <p className="text-2xl font-bold text-chart-2">{totalConverted}</p>
                  <p className="text-[10px] text-muted-foreground">Convertidos</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold text-warning">{formatCurrency(totalRevenue)}</p>
                  <p className="text-[10px] text-muted-foreground">Faturamento</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <Gift className="h-5 w-5 mx-auto mb-1 text-success" />
                  <p className="text-lg font-bold text-success">{formatCurrency(totalBonusPaid)}</p>
                  <p className="text-[10px] text-muted-foreground">Bônus Pago</p>
                  {totalBonusPending > 0 && (
                    <p className="text-[9px] text-warning">{formatCurrency(totalBonusPending)} pendente</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bonus table */}
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma indicação registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Bonificações por Indicação
                </h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Indicado</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Tratamento</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Bonificação</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-xs text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((ref) => {
                        const isConverted = ref.referred?.status === 'fechado' || ref.referred?.status === 'tratamento_andamento';
                        return (
                          <tr key={ref.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-medium text-xs">{ref.referred?.name || 'Desconhecido'}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {ref.referred?.status ? getStageLabel(ref.referred.status) : '—'}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 text-xs">
                              {ref.referred?.interest_product || '—'}
                              {isConverted && ref.referred?.treatment_value ? (
                                <p className="text-[10px] text-success font-medium">{formatCurrency(ref.referred.treatment_value)}</p>
                              ) : null}
                            </td>
                            <td className="py-2.5 px-3">
                              {isConverted ? (
                                <Select
                                  value={String(ref.reward_value || 0)}
                                  onValueChange={(v) => handleUpdateBonusValue(ref.id, Number(v))}
                                >
                                  <SelectTrigger className="h-7 text-xs w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="100">R$ 100</SelectItem>
                                    <SelectItem value="200">R$ 200</SelectItem>
                                    <SelectItem value="300">R$ 300</SelectItem>
                                    <SelectItem value="500">R$ 500</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {ref.reward_value > 0 ? formatCurrency(ref.reward_value) : '—'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {ref.bonus_status === 'pago' ? (
                                <Badge className="bg-success/10 text-success border-0 text-[10px]">
                                  ✅ Pago
                                </Badge>
                              ) : isConverted && ref.reward_value > 0 ? (
                                <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                                  ⏳ Pendente
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                              {ref.bonus_paid_at && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  {formatDate(ref.bonus_paid_at)}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center space-x-1">
                              {isConverted && ref.bonus_status !== 'pago' && ref.reward_value > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-success hover:text-success"
                                  onClick={() => handleMarkAsPaid(ref.id)}
                                  disabled={updateReferral.isPending}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Pagar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  onViewLead?.(ref.referred_lead_id);
                                  onOpenChange(false);
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
