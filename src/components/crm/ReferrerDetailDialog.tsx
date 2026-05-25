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
import { Input } from '@/components/ui/input';
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

function RewardEditor({ value, treatmentValue, onSave, editable }: { value: number; treatmentValue: number; onSave: (v: number) => void; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [customPct, setCustomPct] = useState('');
  const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  const currentPct = treatmentValue > 0 && value > 0 ? (value / treatmentValue) * 100 : 0;
  const pctLabel = currentPct > 0 ? `${currentPct % 1 === 0 ? currentPct.toFixed(0) : currentPct.toFixed(1)}%` : '';

  if (!editable) {
    return (
      <span className="text-xs text-muted-foreground">
        {value > 0 ? `${pctLabel} · ${fmtCur(value)}` : '—'}
      </span>
    );
  }

  const applyPct = (pct: number) => {
    const amt = treatmentValue > 0 ? Math.round((treatmentValue * pct) / 100 * 100) / 100 : 0;
    onSave(amt);
  };

  if (editing) {
    return (
      <div className="flex gap-1 items-center">
        <Input
          className="h-7 text-xs w-16"
          type="number"
          min="0"
          step="0.1"
          value={customPct}
          onChange={(e) => setCustomPct(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { applyPct(Number(customPct) || 0); setEditing(false); } }}
          autoFocus
        />
        <span className="text-xs">%</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => { applyPct(Number(customPct) || 0); setEditing(false); }}>OK</Button>
      </div>
    );
  }

  const presetMatch = ['2', '4', '5'].includes(String(currentPct));
  const selectVal = presetMatch ? String(currentPct) : (currentPct > 0 ? 'custom-set' : '');

  return (
    <div className="flex flex-col gap-0.5">
      <Select
        value={selectVal}
        onValueChange={(v) => {
          if (v === 'custom') { setCustomPct(currentPct > 0 ? String(currentPct) : ''); setEditing(true); }
          else if (v !== 'custom-set') applyPct(Number(v));
        }}
      >
        <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Definir %" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2%</SelectItem>
          <SelectItem value="4">4%</SelectItem>
          <SelectItem value="5">5%</SelectItem>
          <SelectItem value="custom">Outro %...</SelectItem>
          {selectVal === 'custom-set' && <SelectItem value="custom-set">{pctLabel}</SelectItem>}
        </SelectContent>
      </Select>
      {value > 0 && (
        <span className="text-[10px] text-muted-foreground">{fmtCur(value)}</span>
      )}
      {treatmentValue <= 0 && (
        <span className="text-[9px] text-warning">Defina o valor do tratamento</span>
      )}
    </div>
  );
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
  const totalConverted = referrals.filter(r => r.referred?.status === 'fechado' || r.referred?.status === 'tratamento_andamento' || r.referred?.status === 'concluido').length;
  const totalRevenue = referrals.reduce((sum, r) => {
    if (r.referred?.status === 'fechado' || r.referred?.status === 'tratamento_andamento' || r.referred?.status === 'concluido') {
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
      return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const handleMarkAsPending = (refId: string) => {
    updateReferral.mutate({ id: refId, updates: { bonus_status: 'pendente', bonus_paid_at: null } as any }, {
      onSuccess: () => toast.success('Status alterado para Pendente!'),
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
                        const isConverted = ref.referred?.status === 'fechado' || ref.referred?.status === 'tratamento_andamento' || ref.referred?.status === 'concluido';
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
                              <RewardEditor
                                value={ref.reward_value}
                                onSave={(v) => handleUpdateBonusValue(ref.id, v)}
                                editable={isConverted || ref.bonus_status !== 'pago'}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              {ref.bonus_status === 'pago' ? (
                                <button onClick={() => handleMarkAsPending(ref.id)} className="cursor-pointer" disabled={updateReferral.isPending}>
                                  <Badge className="bg-success/10 text-success border-0 text-[10px] cursor-pointer hover:opacity-80">
                                    ✅ Pago
                                  </Badge>
                                </button>
                              ) : isConverted && ref.reward_value > 0 ? (
                                <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                                  ⏳ Pendente
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                              {ref.bonus_paid_at && ref.bonus_status === 'pago' && (
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
                              {ref.bonus_status === 'pago' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-warning hover:text-warning"
                                  onClick={() => handleMarkAsPending(ref.id)}
                                  disabled={updateReferral.isPending}
                                >
                                  ↩ Desfazer
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
