import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, X, TrendingUp, DollarSign, Users, Target, Phone, ChevronRight, Gift, Calendar as CalendarIcon, Video, BarChart3, Lock, Save, Pencil, Trash2, AlertTriangle, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LTVRecurrencePanel } from '@/components/comercial2/LTVRecurrencePanel';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { PaymentDialog } from '@/components/crm/PaymentDialog';
import { usePayments, useConfirmBoletoPayment } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import {
  useUpsellOpportunities,
  useUpdateUpsellStatus,
  useUpdateUpsellOpportunity,
  useCreateUpsellOpportunity,
  useAddContactHistory,
  useContactHistory,
  useUpsellMetrics,
  useTreatmentSuggestions,
  UPSELL_STAGES,
  CONTACT_STATUS_CONFIG,
  type UpsellOpportunity,
} from '@/hooks/useUpsellOpportunities';
import { usePatientTriage } from '@/hooks/usePatientTriage';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* Types for structured purchase tracking */
interface PurchaseEntry {
  treatment: string;
  value: number;
  date: string | null;
  locked?: boolean;
  payment_status?: 'pendente' | 'pago';
}

/* Treatment suggestion entry */
interface TreatmentSuggestionLocal {
  name: string;
  selected: boolean;
}

const PROSTHESIS_SUGGESTIONS = [
  'Revisões a cada 6 meses',
  'Reembasamento de manutenção',
  'Higienização profissional da prótese',
  'Upgrade para implantes',
  'Limpeza',
  'Clareamento',
  'Troca de antagonico',
];

const IMPLANT_EXTRA_SUGGESTIONS = [
  'Revisão a cada 6 meses',
  'Troca de resina por zircônia',
];

function getSuggestionsForTreatment(interestProduct: string | null): string[] {
  if (!interestProduct) return [];
  const lower = interestProduct.toLowerCase();
  const isProsthesis = lower.includes('prótese') || lower.includes('protese');
  const isImplant = lower.includes('implante');
  if (isProsthesis) return PROSTHESIS_SUGGESTIONS;
  if (isImplant) return [...PROSTHESIS_SUGGESTIONS, ...IMPLANT_EXTRA_SUGGESTIONS];
  return [];
}

function parsePurchaseEntries(raw: string | null): PurchaseEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((p: Record<string, unknown>) => ({
      treatment: String(p.treatment || ''),
      value: Number(p.value || 0),
      date: (p.date as string) || null,
      locked: !!p.locked,
      payment_status: (p.payment_status as 'pendente' | 'pago') || 'pendente',
    }));
  } catch {
    const nums = raw.split(';').map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0);
    if (nums.length > 0) {
      return nums.map((v, i) => ({ treatment: `Compra ${i + 2}`, value: v, date: null, locked: true }));
    }
  }
  return [];
}

// Get stage index for progression validation
function getStageIndex(status: string): number {
  return UPSELL_STAGES.findIndex(s => s.key === status);
}

function getNextStage(currentStatus: string): string | null {
  const idx = getStageIndex(currentStatus);
  if (idx < 0 || idx >= UPSELL_STAGES.length - 1) return null;
  return UPSELL_STAGES[idx + 1].key;
}

/* ============ LOCKED DETAIL (Comprou 1 vez) ============ */
function LockedDetailContent({ opp }: { opp: UpsellOpportunity }) {
  const { data: triage } = usePatientTriage(opp.lead_id);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-warning" />
        <p className="text-xs text-warning font-semibold">Esta coluna é somente leitura. A 1ª compra é aquisição (CAC).</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Tratamento Original</p>
          <p className="font-medium">{opp.lead?.interest_product || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Venda Comercial 1</p>
          <p className="font-medium">{formatCurrency(opp.lead?.treatment_value || 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tipo de Venda</p>
          <p className="font-medium">{opp.lead?.sale_type || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Data do Fechamento</p>
          <p className="font-medium">{opp.lead?.closed_at ? format(new Date(opp.lead.closed_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
        </div>
      </div>

      {/* Gift Management - still viewable */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-bold flex items-center gap-1.5 text-chart-5">
          <Gift className="h-3.5 w-3.5" /> Brindes
        </p>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", opp.gift_surgery_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            🎁 Cirurgia: {opp.gift_surgery_sent ? '✅ Enviado' : '⏳ Pendente'}
          </Badge>
          <Badge className={cn("text-[10px]", opp.gift_prosthesis_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            🎁 Prótese: {opp.gift_prosthesis_sent ? '✅ Enviado' : '⏳ Pendente'}
          </Badge>
        </div>
      </div>

      {/* Paciente Amigo */}
      {opp.friendly_patient && (
        <div className="rounded-lg border p-3">
          <p className="text-xs font-bold text-chart-5 mb-1">🤝 Paciente Amigo</p>
          <Badge className={cn("text-[10px]", opp.friendly_patient_video_recorded ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            {opp.friendly_patient_video_recorded ? '🎬 ✅ Depoimento Gravado' : '🎬 Pendente'}
          </Badge>
        </div>
      )}

      {triage && (triage.ice_cream_flavor || triage.post_treatment_food) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-bold text-chart-5">🎁 Personalização</p>
          {triage.ice_cream_flavor && <p className="text-sm">🍦 {triage.ice_cream_flavor}</p>}
          {triage.post_treatment_food && <p className="text-sm">🍽️ {triage.post_treatment_food}</p>}
        </div>
      )}
    </div>
  );
}

/* ============ EDITABLE DETAIL (Comprou 2+) ============ */
function EditableDetailContent({
  opp, updateOpp, setContactDialogOpen, contactHistory, allOpps,
}: {
  opp: UpsellOpportunity;
  updateOpp: ReturnType<typeof useUpdateUpsellOpportunity>;
  setContactDialogOpen: (v: boolean) => void;
  contactHistory: Array<{ id: string; contact_type: string; result: string | null; notes: string | null; created_at: string }>;
  allOpps: UpsellOpportunity[];
}) {
  const { data: triage } = usePatientTriage(opp.lead_id);
  const [surgeryCalendarOpen, setSurgeryCalendarOpen] = useState(false);
  const [prosthesisCalendarOpen, setProsthesisCalendarOpen] = useState(false);

  const handleGiftDateChange = (field: 'gift_surgery_date' | 'gift_prosthesis_date', date: Date | undefined) => {
    updateOpp.mutate({
      id: opp.id,
      [field]: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => {
        toast.success(date ? '📅 Data selecionada!' : 'Data removida');
        if (field === 'gift_surgery_date') setSurgeryCalendarOpen(false);
        if (field === 'gift_prosthesis_date') setProsthesisCalendarOpen(false);
      },
    });
  };

  const purchases = useMemo(() => parsePurchaseEntries(opp.purchase_values), [opp.purchase_values]);
  const [localPurchases, setLocalPurchases] = useState<PurchaseEntry[]>(purchases);
  const [stageEditing, setStageEditing] = useState<Record<number, boolean>>({});
  const [budgetValue, setBudgetValue] = useState(opp.estimated_value || 0);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Payments for this specific upsell opportunity (isolated per stage)
  const { data: stagePayments } = usePayments(undefined, opp.id);
  const confirmBoleto = useConfirmBoletoPayment();

  const totalPaidStage = useMemo(() => {
    return (stagePayments || [])
      .filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + (p.net_value || 0), 0);
  }, [stagePayments]);

  const pendingBoletos = useMemo(() => {
    return (stagePayments || []).filter(p => p.status === 'pendente' && p.payment_method === 'boleto');
  }, [stagePayments]);

  const remainingBalance = Math.max(0, budgetValue - totalPaidStage);

  useEffect(() => {
    const parsed = parsePurchaseEntries(opp.purchase_values);
    const locked = parsed.map(p => ({ ...p, locked: p.value > 0 }));
    setLocalPurchases(locked);
  }, [opp.purchase_values]);

  useEffect(() => {
    setBudgetValue(opp.estimated_value || 0);
  }, [opp.estimated_value]);


  const autoSuggestionNames = useMemo(() =>
    getSuggestionsForTreatment(opp.lead?.interest_product || null),
    [opp.lead?.interest_product]
  );
  const [treatmentSuggestions, setTreatmentSuggestions] = useState<TreatmentSuggestionLocal[]>([]);
  const [newSuggestionName, setNewSuggestionName] = useState('');

  useEffect(() => {
    if (autoSuggestionNames.length > 0 && treatmentSuggestions.length === 0) {
      const existingTreatments = new Set(localPurchases.map(p => p.treatment.toLowerCase()));
      setTreatmentSuggestions(autoSuggestionNames.map(name => ({
        name, selected: existingTreatments.has(name.toLowerCase()),
      })));
    }
  }, [autoSuggestionNames]);

  const isImplantPatient = (opp.lead?.interest_product || '').toLowerCase().includes('implante');
  const needsDateField = (name: string) => isImplantPatient && name.toLowerCase().includes('revisão');

  // When a suggestion is toggled ON, auto-add as a treatment entry
  const handleToggleSuggestion = (index: number) => {
    setTreatmentSuggestions(prev => {
      const copy = [...prev];
      const wasSelected = copy[index].selected;
      copy[index] = { ...copy[index], selected: !wasSelected };

      if (!wasSelected) {
        // Add to local purchases if not already there
        const name = copy[index].name;
        const exists = localPurchases.some(p => p.treatment.toLowerCase() === name.toLowerCase());
        if (!exists) {
          setLocalPurchases(lp => [...lp, { treatment: name, value: 0, date: null, locked: false }]);
        }
      }

      return copy;
    });
  };

  const handleAddCustomSuggestion = () => {
    if (!newSuggestionName.trim()) return;
    const name = newSuggestionName.trim();
    setTreatmentSuggestions(prev => [...prev, { name, selected: true }]);
    const exists = localPurchases.some(p => p.treatment.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setLocalPurchases(lp => [...lp, { treatment: name, value: 0, date: null, locked: false }]);
    }
    setNewSuggestionName('');
  };

  const handlePurchaseFieldChange = (index: number, field: 'treatment' | 'value' | 'date' | 'payment_status', val: string) => {
    setLocalPurchases(prev => {
      const copy = [...prev];
      if (field === 'payment_status') {
        copy[index] = { ...copy[index], payment_status: val as 'pendente' | 'pago' };
        return copy;
      }
      if (copy[index].locked && !stageEditing[index]) return copy;
      if (field === 'treatment') copy[index] = { ...copy[index], treatment: val };
      else if (field === 'value') copy[index] = { ...copy[index], value: parseFloat(val) || 0 };
      else copy[index] = { ...copy[index], date: val || null };
      return copy;
    });
  };

  // Save evolution: persist treatments, auto-advance card
  const handleSaveEvolution = () => {
    const lockedAll = localPurchases.map(p => ({ ...p, locked: true }));
    const serialized = JSON.stringify(lockedAll.map(p => ({
      treatment: p.treatment, value: p.value, date: p.date, locked: true,
      payment_status: p.payment_status || 'pendente',
    })));

    const nextStage = getNextStage(opp.status);
    const updateData: Record<string, unknown> = {
      id: opp.id,
      purchase_values: serialized,
      estimated_value: budgetValue,
      closed_value: totalPaidStage,
    };

    if (nextStage) {
      updateData.status = nextStage;
      updateData.purchase_count = (opp.purchase_count || 1) + 1;
    }

    updateOpp.mutate(updateData as { id: string; [key: string]: unknown }, {
      onSuccess: () => {
        setLocalPurchases(lockedAll);
        setStageEditing({});
        const nextLabel = nextStage ? UPSELL_STAGES.find(s => s.key === nextStage)?.label : null;
        toast.success(nextLabel
          ? `✅ Evolução salva! Paciente movido para "${nextLabel}"`
          : '✅ Evolução salva! (última etapa)'
        );
      },
      onError: () => toast.error('Erro ao salvar evolução'),
    });
  };

  // Edit a specific treatment entry
  const handleEditEntry = (index: number) => {
    setStageEditing(prev => ({ ...prev, [index]: true }));
  };

  // Delete a treatment entry
  const handleDeleteEntry = (index: number) => {
    const updated = localPurchases.filter((_, i) => i !== index);
    setLocalPurchases(updated);
    setDeleteConfirm(null);
    // Also uncheck suggestion if matching
    const removedName = localPurchases[index]?.treatment?.toLowerCase();
    if (removedName) {
      setTreatmentSuggestions(prev =>
        prev.map(s => s.name.toLowerCase() === removedName ? { ...s, selected: false } : s)
      );
    }
  };

  const handleUpdateContactStatus = (newStatus: string) => {
    updateOpp.mutate({ id: opp.id, contact_status: newStatus });
  };

  // LTV = soma dos tratamentos marcados como PAGO (valor total do tratamento, não parcelas)
  const calculatedLTV = useMemo(() => localPurchases.filter(p => p.payment_status === 'pago').reduce((sum, p) => sum + p.value, 0), [localPurchases]);
  const totalOrcamento = useMemo(() => localPurchases.reduce((sum, p) => sum + p.value, 0), [localPurchases]);
  const filledPurchases = localPurchases.filter(p => p.value > 0);
  const calculatedTicket = useMemo(() => filledPurchases.length > 0 ? totalOrcamento / filledPurchases.length : 0, [filledPurchases, totalOrcamento]);

  const currentStageLabel = UPSELL_STAGES.find(s => s.key === opp.status)?.label || opp.status;
  const canAdvance = !!getNextStage(opp.status);

  return (
    <div className="space-y-4">
      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Tratamento Original</p>
          <p className="font-medium">{opp.lead?.interest_product || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Venda Comercial 1</p>
          <p className="font-medium">{formatCurrency(opp.lead?.treatment_value || 0)}</p>
        </div>
      </div>

      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
        📍 Etapa atual: {currentStageLabel}
      </Badge>

      {/* ===== SUGESTÃO DE TRATAMENTO ===== */}
      {treatmentSuggestions.length > 0 && (
        <div className="rounded-md border border-chart-5/30 bg-chart-5/5 p-2.5 space-y-2">
          <p className="text-[11px] font-bold text-chart-5">💡 Sugestão de Tratamento</p>
          <p className="text-[9px] text-muted-foreground">Selecione para adicionar automaticamente em Tratamento</p>
          <div className="flex flex-wrap gap-1.5">
            {treatmentSuggestions.map((sug, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 cursor-pointer transition-colors text-[10px]",
                  sug.selected ? "border-primary/40 bg-primary/10 text-primary font-semibold" : "border-border bg-background hover:bg-muted/50"
                )}
                onClick={() => handleToggleSuggestion(i)}
              >
                <Checkbox checked={sug.selected} className="h-3 w-3 pointer-events-none" />
                <span>{sug.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newSuggestionName}
              onChange={(e) => setNewSuggestionName(e.target.value)}
              placeholder="Adicionar sugestão manual..."
              className="h-7 text-xs flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSuggestion()}
            />
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={handleAddCustomSuggestion}>+ Adicionar</Button>
          </div>
        </div>
      )}

      {/* ===== TRATAMENTO (entries with CRUD) ===== */}
      {localPurchases.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-chart-5">📋 Tratamento</p>
          {localPurchases.map((entry, i) => {
            const isEditable = !entry.locked || stageEditing[i];
            const showDate = needsDateField(entry.treatment);
            return (
              <div key={i} className={cn(
                "rounded-md border p-2.5 space-y-1.5",
                entry.locked && !stageEditing[i] ? "border-success/30 bg-success/5" : "border-border"
              )}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-chart-5">🔹 {entry.treatment || `Tratamento ${i + 1}`}</p>
                  <div className="flex items-center gap-1">
                    {entry.locked && !stageEditing[i] && (
                      <>
                        <Badge className="text-[8px] bg-success/10 text-success border-success/30">🔒 Salvo</Badge>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px] px-1.5" onClick={() => handleEditEntry(i)}>
                          <Pencil className="h-3 w-3 mr-0.5" /> Editar
                        </Button>
                      </>
                    )}
                    {deleteConfirm === i ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" className="h-6 text-[9px] px-1.5" onClick={() => handleDeleteEntry(i)}>Confirmar</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px] px-1.5" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 text-[9px] px-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className={cn("grid gap-2", showDate ? "grid-cols-3" : "grid-cols-2")}>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Tratamento</Label>
                    <Input value={entry.treatment} onChange={(e) => handlePurchaseFieldChange(i, 'treatment', e.target.value)} placeholder="Ex: Limpeza" className="h-7 text-xs mt-0.5" disabled={!isEditable} />
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground">Valor (R$)</Label>
                    <Input type="number" value={entry.value || ''} onChange={(e) => handlePurchaseFieldChange(i, 'value', e.target.value)} placeholder="0" className="h-7 text-xs mt-0.5" disabled={!isEditable} />
                  </div>
                  {showDate && (
                    <div>
                      <Label className="text-[9px] text-muted-foreground">📅 Data</Label>
                      <Input type="date" value={entry.date || ''} onChange={(e) => handlePurchaseFieldChange(i, 'date', e.target.value)} className="h-7 text-xs mt-0.5" disabled={!isEditable} />
                    </div>
                  )}
                </div>
                {/* Status do Pagamento */}
                <div className="flex items-center gap-3 mt-1.5">
                  <Label className="text-[9px] text-muted-foreground whitespace-nowrap">Status:</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 cursor-pointer transition-colors text-[10px]",
                        entry.payment_status !== 'pago' ? "border-warning/40 bg-warning/10 text-warning font-semibold" : "border-border bg-background hover:bg-muted/50"
                      )}
                      onClick={() => handlePurchaseFieldChange(i, 'payment_status', 'pendente')}
                    >
                      <span>⏳</span> Pendente
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 cursor-pointer transition-colors text-[10px]",
                        entry.payment_status === 'pago' ? "border-success/40 bg-success/10 text-success font-semibold" : "border-border bg-background hover:bg-muted/50"
                      )}
                      onClick={() => handlePurchaseFieldChange(i, 'payment_status', 'pago')}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Pago
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== FINANCEIRO DA ETAPA (Replicação completa do Comercial 1) ===== */}
      <div className="rounded-lg border-2 border-primary/30 p-3 space-y-3">
        <p className="text-xs font-bold text-chart-5">💰 Financeiro da Etapa</p>

        {/* Valor do Orçamento */}
        <div>
          <Label className="text-[10px] text-muted-foreground">Valor do Orçamento</Label>
          <CurrencyInput value={budgetValue} onChange={setBudgetValue} onBlur={() => {
            if (budgetValue !== (opp.estimated_value || 0)) {
              updateOpp.mutate({ id: opp.id, estimated_value: budgetValue });
            }
          }} />
        </div>

        {/* Resumo financeiro */}
        {(budgetValue > 0 || totalPaidStage > 0) && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total orçado</span>
              <span className="font-medium">{formatCurrency(budgetValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Já pago</span>
              <span className="font-medium text-success">{formatCurrency(totalPaidStage)}</span>
            </div>
            {pendingBoletos.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Boletos pendentes</span>
                <span className="font-medium text-warning">{pendingBoletos.length}x</span>
              </div>
            )}
            <div className="border-t my-1" />
            <div className="flex justify-between text-sm font-medium">
              <span>Saldo restante</span>
              <span className={remainingBalance > 0 ? 'text-warning' : 'text-success'}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Botão Registrar Pagamento */}
        <Button
          onClick={() => setPaymentDialogOpen(true)}
          className="w-full gap-2"
          variant={totalPaidStage > 0 ? 'outline' : 'default'}
        >
          <CreditCard className="h-4 w-4" />
          {totalPaidStage > 0 ? 'Registrar Novo Pagamento' : 'Registrar Pagamento'}
        </Button>

        {/* Boletos pendentes - confirmar pagamento */}
        {pendingBoletos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-warning">📄 Boletos Pendentes</p>
            {pendingBoletos.map((boleto) => (
              <div key={boleto.id} className="flex items-center justify-between p-2 rounded-md border border-warning/30 bg-warning/5">
                <div className="text-xs">
                  <span className="font-medium">{boleto.installment_number}ª parcela</span>
                  <span className="text-muted-foreground ml-1">— {formatCurrency(boleto.net_value)}</span>
                  {boleto.due_date && <span className="text-muted-foreground ml-1">vence {format(new Date(boleto.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] px-2 border-success/30 text-success hover:bg-success/10"
                  onClick={() => confirmBoleto.mutate(boleto.id)}
                  disabled={confirmBoleto.isPending}
                >
                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Confirmar
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Histórico de pagamentos desta etapa */}
        {(stagePayments || []).filter(p => p.status === 'pago').length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-success">✅ Pagamentos Confirmados</p>
            {(stagePayments || []).filter(p => p.status === 'pago').map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-md border border-success/30 bg-success/5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[8px]">
                    {p.payment_method === 'credito' ? '💳 Crédito' :
                     p.payment_method === 'debito' ? '💳 Débito' :
                     p.payment_method === 'pix' ? '⚡ Pix' :
                     p.payment_method === 'cheque' ? '📝 Cheque' :
                     p.payment_method === 'boleto' ? '📄 Boleto' : p.payment_method}
                  </Badge>
                  {p.installments > 1 && <span className="text-muted-foreground">{p.installments}x</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {p.fee_amount > 0 && (
                      <p className="text-[9px] text-destructive line-through">{formatCurrency(p.gross_value)}</p>
                    )}
                    <p className="font-medium text-success">{formatCurrency(p.net_value)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => revertPayment.mutate(p.id)}
                    disabled={revertPayment.isPending}
                    title="Reverter pagamento"
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Métricas: LTV vs Faturamento */}
        {filledPurchases.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
                <p className="text-[9px] text-muted-foreground">Tratamentos</p>
                <p className="text-sm font-bold text-primary">{filledPurchases.length}</p>
              </div>
              <div className="rounded-md bg-chart-2/5 border border-chart-2/20 p-2">
                <p className="text-[9px] text-muted-foreground">Ticket Médio</p>
                <p className="text-sm font-bold text-chart-2">{formatCurrency(calculatedTicket)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-success/5 border border-success/20 p-2">
                <p className="text-[9px] text-muted-foreground">📊 LTV (Pagos)</p>
                <p className="text-sm font-bold text-success">{formatCurrency(calculatedLTV)}</p>
                <p className="text-[8px] text-muted-foreground">Valor total dos tratamentos pagos</p>
              </div>
              <div className="rounded-md bg-chart-5/5 border border-chart-5/20 p-2">
                <p className="text-[9px] text-muted-foreground">💵 Faturamento (Caixa)</p>
                <p className="text-sm font-bold text-chart-5">{formatCurrency(totalPaidStage)}</p>
                <p className="text-[8px] text-muted-foreground">Parcelas efetivamente recebidas</p>
              </div>
            </div>
            {totalOrcamento > 0 && totalOrcamento !== calculatedLTV && (
              <div className="rounded-md bg-muted/50 border p-2 text-center">
                <p className="text-[9px] text-muted-foreground">📋 Total Orçado (todos tratamentos)</p>
                <p className="text-sm font-bold">{formatCurrency(totalOrcamento)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PaymentDialog para esta etapa */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        leadId={opp.lead_id}
        leadName={opp.lead?.name || 'Paciente'}
        budgetValue={budgetValue}
        upsellOpportunityId={opp.id}
      />

      {/* ===== SAVE EVOLUTION BUTTON ===== */}
      <Button onClick={handleSaveEvolution} className="w-full gap-2" disabled={localPurchases.length === 0}>
        <Save className="h-4 w-4" />
        {canAdvance ? 'Salvar Evolução e Avançar' : 'Salvar Evolução'}
      </Button>
      {!canAdvance && (
        <p className="text-[10px] text-muted-foreground text-center">Última etapa do pipeline</p>
      )}

      {/* Triage personalization */}
      {triage && (triage.ice_cream_flavor || triage.post_treatment_food) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-bold text-chart-5">🎁 Personalização de Brinde</p>
          {triage.ice_cream_flavor && (
            <div className="flex items-start gap-2 text-sm">
              <span>🍦</span>
              <div>
                <p className="text-[10px] text-muted-foreground">Sabor de sorvete preferido</p>
                <p className="font-medium">{triage.ice_cream_flavor}</p>
              </div>
            </div>
          )}
          {triage.post_treatment_food && (
            <div className="flex items-start gap-2 text-sm">
              <span>🍽️</span>
              <div>
                <p className="text-[10px] text-muted-foreground">Desejo pós-tratamento</p>
                <p className="font-medium">{triage.post_treatment_food}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gift Management */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-bold flex items-center gap-1.5 text-chart-5">
          <Gift className="h-3.5 w-3.5" /> Envio de Brindes
        </p>
        <div className={cn("p-2.5 rounded-md border space-y-2", opp.gift_surgery_sent ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox checked={opp.gift_surgery_sent} onCheckedChange={(checked) => updateOpp.mutate({ id: opp.id, gift_surgery_sent: !!checked, gift_surgery_sent_at: checked ? new Date().toISOString() : null })} className="h-4 w-4" />
              <span className="text-xs font-semibold">🎁 Brinde – Dia da Cirurgia</span>
            </div>
            <Badge className={cn("text-[9px]", opp.gift_surgery_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{opp.gift_surgery_sent ? 'Realizado' : 'Pendente'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">📅 Data:</Label>
            <Popover open={surgeryCalendarOpen} onOpenChange={setSurgeryCalendarOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {opp.gift_surgery_date ? format(new Date(opp.gift_surgery_date + 'T12:00:00'), 'dd/MM/yyyy') : 'Agendar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar mode="single" selected={opp.gift_surgery_date ? new Date(opp.gift_surgery_date + 'T12:00:00') : undefined} onSelect={(d) => handleGiftDateChange('gift_surgery_date', d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className={cn("p-2.5 rounded-md border space-y-2", opp.gift_prosthesis_sent ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox checked={opp.gift_prosthesis_sent} onCheckedChange={(checked) => updateOpp.mutate({ id: opp.id, gift_prosthesis_sent: !!checked, gift_prosthesis_sent_at: checked ? new Date().toISOString() : null })} className="h-4 w-4" />
              <span className="text-xs font-semibold">🎁 Brinde – Entrega da Prótese</span>
            </div>
            <Badge className={cn("text-[9px]", opp.gift_prosthesis_sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{opp.gift_prosthesis_sent ? 'Realizado' : 'Pendente'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">📅 Data:</Label>
            <Popover open={prosthesisCalendarOpen} onOpenChange={setProsthesisCalendarOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {opp.gift_prosthesis_date ? format(new Date(opp.gift_prosthesis_date + 'T12:00:00'), 'dd/MM/yyyy') : 'Agendar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar mode="single" selected={opp.gift_prosthesis_date ? new Date(opp.gift_prosthesis_date + 'T12:00:00') : undefined} onSelect={(d) => handleGiftDateChange('gift_prosthesis_date', d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Paciente Amigo */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-bold flex items-center gap-1.5 text-chart-5">🤝 Paciente Amigo</p>
        <div className="flex items-center gap-2">
          <Checkbox checked={opp.friendly_patient} onCheckedChange={(checked) => updateOpp.mutate({ id: opp.id, friendly_patient: !!checked })} className="h-4 w-4" />
          <span className="text-xs">Aceitou participar</span>
        </div>
        {opp.friendly_patient && (
          <div className={cn("p-2.5 rounded-md border space-y-2", opp.friendly_patient_video_recorded ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox checked={opp.friendly_patient_video_recorded} onCheckedChange={(checked) => updateOpp.mutate({ id: opp.id, friendly_patient_video_recorded: !!checked, friendly_patient_video_recorded_at: checked ? new Date().toISOString() : null })} className="h-4 w-4" />
                <span className="text-xs font-semibold">🎬 Gravar Depoimento</span>
              </div>
              <Badge className={cn("text-[9px]", opp.friendly_patient_video_recorded ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{opp.friendly_patient_video_recorded ? 'Realizado' : 'Pendente'}</Badge>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-chart-5 mb-1.5">Status do Contato</p>
        <Select value={opp.contact_status} onValueChange={handleUpdateContactStatus}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CONTACT_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-xs font-bold text-chart-5 mb-1.5">Observações</p>
        <Textarea value={opp.notes || ''} onChange={(e) => updateOpp.mutate({ id: opp.id, notes: e.target.value })} placeholder="Adicione observações..." className="text-sm min-h-[60px]" />
      </div>

      <Button onClick={() => setContactDialogOpen(true)} size="sm" className="w-full" variant="outline">
        <Phone className="h-4 w-4 mr-1" /> Registrar Contato
      </Button>

      {contactHistory.length > 0 && (
        <div>
          <p className="text-xs font-bold text-chart-5 mb-2">Histórico de Contatos</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {contactHistory.map((c) => (
              <div key={c.id} className="p-2 rounded-lg border bg-muted/30 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px]">
                    {c.contact_type === 'ligacao' ? '📞 Ligação' : c.contact_type === 'whatsapp' ? '💬 WhatsApp' : '📝 Outro'}
                  </Badge>
                  <span className="text-muted-foreground">{format(new Date(c.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                </div>
                {c.result && <p className="mt-1 font-medium">{c.result}</p>}
                {c.notes && <p className="mt-0.5 text-muted-foreground">{c.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ MAIN PAGE ============ */
const Comercial2 = () => {
  const { data: opportunities, isLoading } = useUpsellOpportunities();
  const { data: suggestions } = useTreatmentSuggestions();
  const metrics = useUpsellMetrics();
  const updateStatus = useUpdateUpsellStatus();
  const updateOpp = useUpdateUpsellOpportunity();
  const createUpsell = useCreateUpsellOpportunity();
  const addContact = useAddContactHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<UpsellOpportunity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactType, setContactType] = useState('ligacao');
  const [contactResult, setContactResult] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  const { data: contactHistory } = useContactHistory(selectedOpp?.id || null);

  useEffect(() => {
    if (selectedOpp && opportunities) {
      const updated = opportunities.find(o => o.id === selectedOpp.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOpp)) {
        setSelectedOpp(updated);
      }
    }
  }, [opportunities, selectedOpp]);

  const filteredOpps = useMemo(() => {
    if (!opportunities) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return opportunities;
    return opportunities.filter(o =>
      o.lead?.name?.toLowerCase().includes(q) ||
      o.suggested_treatment.toLowerCase().includes(q)
    );
  }, [opportunities, searchQuery]);

  const getOppsByStatus = useCallback((status: string) => {
    return filteredOpps.filter(o => o.status === status);
  }, [filteredOpps]);

  const handleDragStart = (e: React.DragEvent, id: string, status: string) => {
    // Block drag from locked column
    const stage = UPSELL_STAGES.find(s => s.key === status);
    if (stage?.locked) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('fromStatus', status);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDropTarget(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const opp = opportunities?.find(o => o.id === id);

    if (opp && opp.status !== newStatus) {
      const fromIdx = getStageIndex(opp.status);
      const toIdx = getStageIndex(newStatus);
      const targetStage = UPSELL_STAGES[toIdx];

      // Block: can't drop into locked column
      if (targetStage?.locked) {
        toast.error('❌ Não é possível mover para a coluna "Comprou 1 vez"');
        setDraggedId(null);
        setDropTarget(null);
        return;
      }

      // Block: can only advance 1 step
      if (toIdx !== fromIdx + 1) {
        toast.error('❌ Só é permitido avançar 1 etapa por vez');
        setDraggedId(null);
        setDropTarget(null);
        return;
      }

      updateStatus.mutate({ id, status: newStatus });
    }
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleSaveContact = () => {
    if (!selectedOpp) return;
    addContact.mutate({
      opportunity_id: selectedOpp.id,
      contact_type: contactType,
      result: contactResult,
      notes: contactNotes,
    }, {
      onSuccess: () => {
        toast.success('Contato registrado!');
        setContactDialogOpen(false);
        setContactResult('');
        setContactNotes('');
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Comercial 2 – Pós-Venda e LTV">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isLockedColumn = (stageKey: string) => UPSELL_STAGES.find(s => s.key === stageKey)?.locked;

  return (
    <AppLayout title="Comercial 2 – Pós-Venda e LTV">
      <Tabs defaultValue="pipeline" className="flex flex-col h-auto min-h-0">
        <TabsList className="shrink-0 mb-3 w-fit">
          <TabsTrigger value="pipeline" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="ltv" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> LTV Inteligente</TabsTrigger>
        </TabsList>
        <TabsContent value="ltv" className="flex-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <LTVRecurrencePanel />
        </TabsContent>
        <TabsContent value="pipeline" className="flex-1 min-h-0 flex flex-col">
          <div className="flex flex-col h-full min-h-0">
            {/* Metrics Bar */}
            {metrics && (
              <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-11 gap-2 sm:gap-3 mb-4">
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pacientes</p>
                        <p className="text-lg font-bold">{metrics.uniquePatients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-chart-5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Oportunidades</p>
                        <p className="text-lg font-bold">{metrics.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Conversão</p>
                        <p className="text-lg font-bold">{metrics.conversionRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Faturamento</p>
                        <p className="text-lg font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                        <p className="text-lg font-bold">{formatCurrency(metrics.avgTicket)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-chart-2" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">LTV/Paciente</p>
                        <p className="text-lg font-bold">{formatCurrency(metrics.ltvPerPatient)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card border-warning/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">🎁 Pendentes</p>
                        <p className="text-lg font-bold text-warning">{metrics.giftsPending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card border-success/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">🎁 Enviados</p>
                        <p className="text-lg font-bold text-success">{metrics.giftsSent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card border-primary/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">🤝 Pac. Amigo</p>
                        <p className="text-lg font-bold text-primary">{metrics.friendlyAccepted}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card border-warning/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-warning" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">🎬 Pendentes</p>
                        <p className="text-lg font-bold text-warning">{metrics.videoPending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="monday-card border-success/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">🎬 Realizados</p>
                        <p className="text-lg font-bold text-success">{metrics.videoRecorded}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Header */}
            <div className="shrink-0 flex flex-col gap-3 mb-3">
              <p className="text-sm text-muted-foreground">
                {filteredOpps.length} oportunidades no pipeline
                <span className="text-success ml-2">• Sincronização automática ativa</span>
              </p>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente ou tratamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 min-h-0 md:min-h-0 overflow-x-auto overflow-y-auto md:overflow-y-hidden scroll-container-x">
              <div className="flex gap-3 min-w-max md:h-full pb-2 px-1">
                {UPSELL_STAGES.map((stage) => {
                  const stageOpps = getOppsByStatus(stage.key);
                  const isDropping = dropTarget === stage.key && draggedId !== null;
                  const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
                  const isLocked = stage.locked;

                  return (
                    <div
                      key={stage.key}
                      className="w-56 sm:w-64 lg:w-72 flex-shrink-0 flex flex-col min-h-0 md:h-full"
                      onDragOver={(e) => !isLocked && handleDragOver(e, stage.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => !isLocked && handleDrop(e, stage.key)}
                    >
                      <div className={cn(
                        "flex flex-col min-h-0 h-full rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-200",
                        isDropping && !isLocked && 'ring-2 ring-primary ring-offset-2',
                        isLocked && 'border-warning/30 bg-warning/5'
                      )}>
                        <div className="shrink-0 px-3 pt-3 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                            <span className="text-xs font-semibold flex-1 truncate">{stage.label}</span>
                            {isLocked && <Lock className="h-3 w-3 text-warning" />}
                            <Badge variant="secondary" className="font-semibold bg-muted text-xs h-5 min-w-5 flex items-center justify-center">
                              {stageOpps.length}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {isLocked ? '🔒 Somente leitura (CAC)' : formatCurrency(totalValue)}
                          </p>
                        </div>

                        <div className="flex-1 min-h-0 px-2 pb-2">
                          <div className="h-full overflow-y-auto scroll-container-y space-y-2 pr-1">
                            {stageOpps.map((opp) => {
                              const contactCfg = CONTACT_STATUS_CONFIG[opp.contact_status] || CONTACT_STATUS_CONFIG.nao_contatado;
                              return (
                                <div
                                  key={opp.id}
                                  draggable={!isLocked}
                                  onDragStart={(e) => handleDragStart(e, opp.id, stage.key)}
                                  onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                                  className={cn(
                                    !isLocked && "cursor-grab active:cursor-grabbing",
                                    isLocked && "cursor-pointer",
                                    draggedId === opp.id && 'opacity-40'
                                  )}
                                >
                                  <Card
                                    className="monday-card cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => { setSelectedOpp(opp); setDetailOpen(true); }}
                                  >
                                    <CardContent className="p-3 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <p className="text-sm font-semibold truncate flex-1">
                                          {opp.lead?.name || 'Paciente'}
                                        </p>
                                        {isLocked ? <Lock className="h-3.5 w-3.5 text-warning shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                                      </div>
                                      {/* Paciente Amigo on card */}
                                      {opp.friendly_patient && (
                                        <div className={cn(
                                          "flex items-center gap-1.5 p-1.5 rounded-md border text-[10px]",
                                          opp.friendly_patient_video_recorded
                                            ? "border-success/30 bg-success/5 text-success"
                                            : "border-warning/30 bg-warning/5 text-warning animate-pulse"
                                        )}>
                                          <span className="font-medium">
                                            {opp.friendly_patient_video_recorded ? '🎬 ✅ Depoimento' : '🎬 Gravar Depoimento'}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5">
                                        <Badge className="text-[9px] bg-chart-2/10 text-chart-2 border-chart-2/30">
                                          🔄 {opp.purchase_count || 1}x
                                        </Badge>
                                        {(() => {
                                          const entries = parsePurchaseEntries(opp.purchase_values);
                                          const ltv = entries.reduce((s, p) => s + p.value, 0);
                                          return ltv > 0 ? (
                                            <Badge className="text-[9px] bg-success/10 text-success border-success/30">
                                              💰 {formatCurrency(ltv)}
                                            </Badge>
                                          ) : null;
                                        })()}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <Badge className={cn('text-[9px]', contactCfg.color)}>
                                          {contactCfg.label}
                                        </Badge>
                                        {!isLocked && opp.estimated_value > 0 && (
                                          <span className="text-[10px] font-bold text-success">
                                            {formatCurrency(opp.estimated_value)}
                                          </span>
                                        )}
                                      </div>
                                      {opp.attempt_count > 0 && (
                                        <p className="text-[10px] text-muted-foreground">
                                          {opp.attempt_count} tentativa{opp.attempt_count > 1 ? 's' : ''}
                                        </p>
                                      )}
                                      {/* Gift indicators on card */}
                                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                        <div className={cn(
                                          "flex items-center gap-1.5 p-1 rounded-md border text-[10px]",
                                          opp.gift_surgery_sent ? "border-success/30 bg-success/5 text-success" : "border-warning/30 bg-warning/5 text-warning"
                                        )}>
                                          <Gift className="h-3 w-3" />
                                          <span className="font-medium">{opp.gift_surgery_sent ? '✅ Cirurgia' : '🎁 Cirurgia'}</span>
                                        </div>
                                        <div className={cn(
                                          "flex items-center gap-1.5 p-1 rounded-md border text-[10px]",
                                          opp.gift_prosthesis_sent ? "border-success/30 bg-success/5 text-success" : "border-warning/30 bg-warning/5 text-warning"
                                        )}>
                                          <Gift className="h-3 w-3" />
                                          <span className="font-medium">{opp.gift_prosthesis_sent ? '✅ Prótese' : '🎁 Prótese'}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                            {stageOpps.length === 0 && (
                              <div className={cn(
                                "text-center py-8 rounded-lg",
                                stage.bgColor,
                                isDropping && !isLocked && 'border-2 border-dashed border-primary'
                              )}>
                                <p className="text-xs text-muted-foreground">
                                  {isDropping && !isLocked ? 'Solte aqui' : 'Nenhuma oportunidade'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {selectedOpp?.lead?.name || 'Detalhes'}
                {selectedOpp && isLockedColumn(selectedOpp.status) && (
                  <Badge className="text-[9px] bg-warning/10 text-warning border-warning/30 ml-2">
                    <Lock className="h-3 w-3 mr-1" /> Somente leitura
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedOpp && (
              isLockedColumn(selectedOpp.status)
                ? <LockedDetailContent opp={selectedOpp} />
                : <EditableDetailContent
                    opp={selectedOpp}
                    updateOpp={updateOpp}
                    setContactDialogOpen={setContactDialogOpen}
                    contactHistory={contactHistory || []}
                    allOpps={opportunities || []}
                  />
            )}
          </DialogContent>
        </Dialog>

        {/* Register Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar Contato</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1">Tipo de Contato</p>
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligacao">📞 Ligação</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="outro">📝 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Resultado</p>
                <Input value={contactResult} onChange={(e) => setContactResult(e.target.value)} placeholder="Ex: Paciente interessado em clareamento" className="h-9 text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Observações</p>
                <Textarea value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="Detalhes adicionais..." className="text-sm min-h-[60px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveContact} disabled={addContact.isPending}>
                {addContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Contato'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </AppLayout>
  );
};

export default Comercial2;
