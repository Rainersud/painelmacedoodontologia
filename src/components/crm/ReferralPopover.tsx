import { useState } from 'react';
import { Gift, Users, DollarSign, Check, Undo2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReferralsByLead, useUpdateReferral } from '@/hooks/useReferrals';
import { useUpdateLead } from '@/hooks/useCRMLeads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Lead } from '@/types/crm';

interface ReferralPopoverProps {
  lead: Lead;
  refTags: {
    isReferred: boolean;
    isReferrer: boolean;
    hasDiscount: boolean;
    discountValue: number;
    discountType: string;
    attendanceDiscountApplied: boolean;
    referrerName?: string;
    rewardValue: number;
    rewardType: string;
    pendingBonuses: { referredName: string; rewardValue: number; referralId: string }[];
    referralCount: number;
    convertedCount: number;
  };
}

const BONUS_PRESETS = [100, 200, 300, 500];

const CONVERTED_STATUSES = ['fechado', 'tratamento_andamento', 'concluido'];

export function ReferralPopover({ lead, refTags }: ReferralPopoverProps) {
  const { data: referralData } = useReferralsByLead(lead.id);
  const updateReferral = useUpdateReferral();
  const updateLead = useUpdateLead();
  const [customBonusId, setCustomBonusId] = useState<string | null>(null);
  const [customBonusValue, setCustomBonusValue] = useState('');
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [editingAttendanceDiscount, setEditingAttendanceDiscount] = useState(false);
  const [attendanceDiscountInput, setAttendanceDiscountInput] = useState('');

  const hasAnyReferralData = refTags.isReferred || refTags.isReferrer || refTags.pendingBonuses.length > 0;
  if (!hasAnyReferralData) return null;

  // Determine which icons to show
  const icons: { icon: typeof Users; title: string; className: string }[] = [];
  
  if (refTags.isReferrer) icons.push({ icon: Users, title: 'Indicador', className: 'bg-primary/10 text-primary' });
  if (refTags.pendingBonuses.length > 0) icons.push({ icon: DollarSign, title: 'Bonificação disponível', className: 'bg-warning/15 text-warning-strong' });

  const handleSaveDiscount = () => {
    if (!referralData?.asReferred) return;
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) return;
    updateReferral.mutate({
      id: referralData.asReferred.id,
      updates: { discount_value: val } as any,
    }, {
      onSuccess: () => { setEditingDiscount(false); toast.success('Desconto atualizado!'); },
    });
  };

  const handleSaveAttendanceDiscount = () => {
    const val = parseFloat(attendanceDiscountInput);
    if (isNaN(val) || val < 0) return;
    updateLead.mutate({
      leadId: lead.id,
      updates: { discount_percentage: val },
    }, {
      onSuccess: () => { setEditingAttendanceDiscount(false); toast.success('Desconto de comparecimento atualizado!'); },
    });
  };

  const handleBonusPreset = (refId: string, value: number) => {
    updateReferral.mutate({ id: refId, updates: { reward_value: value } as any });
  };

  const handleCustomBonus = (refId: string) => {
    const val = parseFloat(customBonusValue);
    if (isNaN(val) || val <= 0) return;
    updateReferral.mutate({ id: refId, updates: { reward_value: val } as any }, {
      onSuccess: () => { setCustomBonusId(null); setCustomBonusValue(''); },
    });
  };

  const handleMarkPaid = (refId: string) => {
    updateReferral.mutate({
      id: refId,
      updates: { bonus_status: 'pago', bonus_paid_at: new Date().toISOString() } as any,
    });
  };

  const handleMarkPending = (refId: string) => {
    updateReferral.mutate({
      id: refId,
      updates: { bonus_status: 'pendente', bonus_paid_at: null } as any,
    });
  };

  const attendanceStatus = lead.status === 'compareceu' ? 'compareceu' :
    lead.status === 'faltou' || lead.status === 'nao_compareceu' ? 'faltou' : 'aguardando';

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-0.5 rounded-md px-1 py-0.5 hover:bg-muted/50 transition-colors">
          {icons.map((icon, i) => (
            <span key={i} className={cn("rounded p-0.5", icon.className)} title={icon.title}>
              <icon.icon className="h-3 w-3" aria-label={icon.title} />
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-h-[70vh] overflow-y-auto"
        align="start"
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Indicações / Benefícios</h4>

          {/* === REFERRED SECTION === */}
          {refTags.isReferred && (
            <div className="space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-chart-5" />
                <span className="text-xs font-semibold">Paciente Indicado</span>
              </div>

              {refTags.referrerName && (
                <p className="text-xs text-muted-foreground">
                  Indicador: <strong>{refTags.referrerName}</strong>
                </p>
              )}

              {/* Referral discount - editable */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Desconto por indicação</span>
                  {editingDiscount ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        className="h-6 w-16 text-xs"
                        min={0}
                      />
                      <span className="text-xs">%</span>
                      <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveDiscount}>OK</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setDiscountInput(String(refTags.discountValue || 0)); setEditingDiscount(true); }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {refTags.discountValue > 0
                        ? `${refTags.discountType === 'fixo' ? 'R$' : ''}${refTags.discountValue}${refTags.discountType !== 'fixo' ? '%' : ''}`
                        : 'Definir'}
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance discount - editable */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Desconto por comparecimento</span>
                  {editingAttendanceDiscount ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={attendanceDiscountInput}
                        onChange={(e) => setAttendanceDiscountInput(e.target.value)}
                        className="h-6 w-16 text-xs"
                        min={0}
                      />
                      <span className="text-xs">%</span>
                      <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveAttendanceDiscount}>OK</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAttendanceDiscountInput(String(lead.discount_percentage ?? 5)); setEditingAttendanceDiscount(true); }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {lead.discount_percentage ?? 5}%
                    </button>
                  )}
                </div>

                {/* Attendance status */}
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] border-0 h-5", {
                      'bg-success/10 text-success': attendanceStatus === 'compareceu',
                      'bg-destructive/10 text-destructive': attendanceStatus === 'faltou',
                      'bg-muted text-muted-foreground': attendanceStatus === 'aguardando',
                    })}
                  >
                    {attendanceStatus === 'compareceu'&& 'Compareceu'}
                    {attendanceStatus === 'faltou'&& 'Faltou — desconto removido'}
                    {attendanceStatus === 'aguardando'&& 'Aguardando comparecimento'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* === REFERRER SECTION === */}
          {refTags.isReferrer && referralData?.asReferrer && (
            <div className="space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">
                  Indicações realizadas ({refTags.referralCount})
                </span>
              </div>

              {refTags.convertedCount > 0 && (
                <Badge variant="outline" className="text-[10px] border-0 bg-success/10 text-success h-5">
                  {refTags.convertedCount} fecharam tratamento
                </Badge>
              )}

              {/* Referrals table */}
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-2 py-1 font-medium">Indicado</th>
                      <th className="text-left px-2 py-1 font-medium">Status</th>
                      <th className="text-right px-2 py-1 font-medium">Bonificação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.asReferrer.map((ref) => {
                      const isConverted = ref.referred?.status
                        ? CONVERTED_STATUSES.includes(ref.referred.status)
                        : false;
                      const isPaid = ref.bonus_status === 'pago';

                      return (
                        <tr key={ref.id} className="border-t">
                          <td className="px-2 py-1.5 truncate max-w-[80px]">
                            {ref.referred?.name || '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {isConverted ? (
                              <Badge variant="outline" className="text-[9px] border-0 bg-success/10 text-success h-4">
                                Fechou
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] border-0 bg-muted text-muted-foreground h-4">
                                Em negociação
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {isConverted ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {/* Bonus value selector */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                                      {Number(ref.reward_value) > 0 ? `R$${ref.reward_value}` : 'Definir'}
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {BONUS_PRESETS.map(v => (
                                      <DropdownMenuItem key={v} onClick={() => handleBonusPreset(ref.id, v)}>
                                        R$ {v}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem onClick={() => { setCustomBonusId(ref.id); setCustomBonusValue(''); }}>
                                      Outro valor...
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {customBonusId === ref.id && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Input
                                      type="number"
                                      value={customBonusValue}
                                      onChange={(e) => setCustomBonusValue(e.target.value)}
                                      className="h-6 w-16 text-xs"
                                      placeholder="R$"
                                    />
                                    <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleCustomBonus(ref.id)}>OK</Button>
                                  </div>
                                )}

                                {/* Pay/Undo status */}
                                {Number(ref.reward_value) > 0 && (
                                  isPaid ? (
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-[9px] border-0 bg-success/10 text-success h-4">
                                        Pago
                                      </Badge>
                                      <button
                                        onClick={() => handleMarkPending(ref.id)}
                                        className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                                      >
                                        <Undo2 className="h-2.5 w-2.5" /> Desfazer
                                      </button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-5 text-[10px] px-2 bg-success/10 text-success hover:bg-success/20 border-0"
                                      onClick={() => handleMarkPaid(ref.id)}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" /> Pagar
                                    </Button>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pending bonus summary */}
              {refTags.pendingBonuses.length > 0 && (
                <div className="rounded bg-warning/10 px-2 py-1.5 border border-warning/20">
                  <p className="text-[10px] font-semibold text-warning-strong">
                    {refTags.pendingBonuses.length} bonificaç{refTags.pendingBonuses.length === 1 ? 'ão': 'ões'} pendente{refTags.pendingBonuses.length === 1 ? '': 's'}
                  </p>
                  <p className="text-[10px] text-warning-strong font-bold">
                    Total: R$ {refTags.pendingBonuses.reduce((s, b) => s + b.rewardValue, 0)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
