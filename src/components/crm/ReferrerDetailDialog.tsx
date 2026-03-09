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
import { useReferralsByLead } from '@/hooks/useReferrals';
import { FUNNEL_STAGES } from '@/types/crm';
import { Users, UserCheck, DollarSign, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const referrals = data?.asReferrer || [];

  const totalAttended = referrals.filter(
    r => r.referred?.status === 'compareceu' || r.referred?.status === 'fechado'
  ).length;
  const totalConverted = referrals.filter(r => r.referred?.status === 'fechado').length;
  const totalRevenue = referrals.reduce((sum, r) => {
    if (r.referred?.status === 'fechado') {
      return sum + (r.referred.treatment_value || 0);
    }
    return sum;
  }, 0);

  const getStageLabel = (status: string) => {
    return FUNNEL_STAGES.find(s => s.key === status)?.label || status;
  };

  const getStageColor = (status: string) => {
    const stage = FUNNEL_STAGES.find(s => s.key === status);
    return stage?.color || 'bg-muted';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
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
                  <p className="text-[10px] text-muted-foreground">Indicações feitas</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <UserCheck className="h-5 w-5 mx-auto mb-1 text-success" />
                  <p className="text-2xl font-bold text-success">{totalAttended}</p>
                  <p className="text-[10px] text-muted-foreground">Compareceram</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-chart-2" />
                  <p className="text-2xl font-bold text-chart-2">{totalConverted}</p>
                  <p className="text-[10px] text-muted-foreground">Vendas realizadas</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold text-warning">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Faturamento gerado</p>
                </CardContent>
              </Card>
            </div>

            {/* Referrals table */}
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma indicação registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Indicado</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Telefone</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Data</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-xs text-muted-foreground">Etapa no Funil</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-xs text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr
                        key={ref.id}
                        className="border-t border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-xs">{ref.referred?.name || 'Desconhecido'}</p>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          {ref.referred?.phone || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          {formatDate(ref.created_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          {ref.referred?.status ? (
                            <div className="flex items-center gap-1.5">
                              <div className={cn("h-2 w-2 rounded-full", getStageColor(ref.referred.status))} />
                              <span className="text-xs font-medium">{getStageLabel(ref.referred.status)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                            Ver ficha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
