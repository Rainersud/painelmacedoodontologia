import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency, CREDIT_FEE_RATES, calculateNetValue } from '@/lib/currency';
import { useCreatePayment, usePayments } from '@/hooks/usePayments';
import {
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  Wallet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  budgetValue?: number;
  upsellOpportunityId?: string;
}

type PaymentMethod = 'credito' | 'debito' | 'pix' | 'cheque' | 'boleto' | 'dinheiro';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'credito', label: 'Crédito', icon: CreditCard, color: 'bg-primary/10 text-primary border-primary/30' },
  { key: 'debito', label: 'Débito', icon: Wallet, color: 'bg-chart-2/10 text-chart-2 border-chart-2/30' },
  { key: 'pix', label: 'Pix', icon: QrCode, color: 'bg-success/10 text-success border-success/30' },
  { key: 'cheque', label: 'Cheque', icon: Banknote, color: 'bg-warning/10 text-warning-strong border-warning/30' },
  { key: 'dinheiro', label: 'Dinheiro', icon: Coins, color: 'bg-success/10 text-success border-success/30' },
  { key: 'boleto', label: 'Boleto', icon: FileText, color: 'bg-chart-5/10 text-chart-5 border-chart-5/30' },
];

export function PaymentDialog({ open, onOpenChange, leadId, leadName, budgetValue = 0, upsellOpportunityId }: PaymentDialogProps) {
  const [step, setStep] = useState<'method' | 'details'>('method');
  const [grossValue, setGrossValue] = useState(budgetValue);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [installments, setInstallments] = useState(1);
  const [boletoCount, setBoletoCount] = useState(1);
  const [boletoDates, setBoletoDates] = useState<string[]>([]);
  const [paymentType, setPaymentType] = useState<'total' | 'parcial'>('total');
  const [partialValue, setPartialValue] = useState(0);
  const [manualValue, setManualValue] = useState(0);

  const createPayment = useCreatePayment();
  const { data: existingPayments } = usePayments(leadId, upsellOpportunityId);

  // Ao abrir, usa o orçamento atual (antes ficava preso ao valor da primeira abertura)
  useEffect(() => {
    if (open) setGrossValue(budgetValue);
  }, [open, budgetValue]);

  // Já pago ou já lançado (boletos pendentes também abatem o saldo), pelo valor BRUTO:
  // o orçamento é bruto; a taxa do cartão não pode deixar "saldo" para trás.
  const totalPaid = useMemo(() => {
    return (existingPayments || [])
      .filter(p => p.status === 'pago' || p.status === 'pendente')
      // venda principal não soma pagamentos de recompra (Comercial 2) e vice-versa
      .filter(p => (upsellOpportunityId ? true : !(p as { upsell_opportunity_id?: string | null }).upsell_opportunity_id))
      .reduce((sum, p) => sum + Number(p.gross_value || 0), 0);
  }, [existingPayments, upsellOpportunityId]);

  const remainingBalance = Math.max(0, Math.round((grossValue - totalPaid) * 100) / 100);

  // Valor deste pagamento: "Total" quita o SALDO (não o orçamento inteiro de novo)
  const totalValue = totalPaid > 0 ? remainingBalance : grossValue;
  const effectiveValue = budgetValue <= 0 ? manualValue : (paymentType === 'parcial' ? partialValue : totalValue);
  const exceedsBalance = budgetValue > 0 && totalPaid > 0 && effectiveValue > remainingBalance + 0.009;

  // Credit card calculation
  const creditCalc = useMemo(() => {
    if (method !== 'credito' || effectiveValue <= 0) return null;
    return calculateNetValue(effectiveValue, installments);
  }, [method, effectiveValue, installments]);

  const handleReset = () => {
    setStep('method');
    setMethod(null);
    setInstallments(1);
    setBoletoCount(1);
    setBoletoDates([]);
    setPaymentType('total');
    setPartialValue(0);
    setManualValue(0);
    setGrossValue(budgetValue);
  };

  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    setStep('details');
    if (m === 'boleto') {
      setBoletoCount(1);
      setBoletoDates(['']);
    }
  };

  const handleBoletoCountChange = (count: number) => {
    setBoletoCount(count);
    setBoletoDates(Array(count).fill(''));
  };

  const handleBoletoDateChange = (index: number, date: string) => {
    setBoletoDates(prev => {
      const next = [...prev];
      next[index] = date;
      return next;
    });
  };

  const handleConfirmPayment = () => {
    if (!method || effectiveValue <= 0) return;

    let feePercentage = 0;
    let feeAmount = 0;
    let netValue = effectiveValue;

    if (method === 'credito' && creditCalc) {
      feePercentage = creditCalc.feePercentage;
      feeAmount = creditCalc.feeAmount;
      netValue = creditCalc.netValue;
    }

    createPayment.mutate({
      lead_id: leadId,
      payment_method: method,
      gross_value: effectiveValue,
      installments: method === 'credito' ? installments : method === 'boleto' ? boletoCount : 1,
      fee_percentage: feePercentage,
      fee_amount: feeAmount,
      net_value: netValue,
      boleto_dates: method === 'boleto' ? boletoDates.filter(Boolean) : undefined,
      upsell_opportunity_id: upsellOpportunityId,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        handleReset();
      },
    });
  };

  const canConfirm = () => {
    if (!method || effectiveValue <= 0) return false;
    if (exceedsBalance) return false;
    if (method === 'boleto') {
      return boletoDates.every(d => d.length > 0);
    }
    if (paymentType === 'parcial' && partialValue <= 0) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleReset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {step === 'method' ? 'Registrar Pagamento' : 'Detalhes do Pagamento'}
          </DialogTitle>
          <DialogDescription>
            Paciente: <span className="font-medium text-foreground">{leadName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Payment Type + Method */}
        {step === 'method' && (
          <div className="space-y-4 overflow-y-auto scroll-container-y">
            {/* Budget summary or manual value entry */}
            {budgetValue > 0 ? (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total orçado</span>
                  <span className="font-bold text-primary">{formatCurrency(grossValue)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Já pago ou lançado</span>
                      <span className="font-medium text-success">{formatCurrency(totalPaid)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-medium">
                      <span>Saldo restante</span>
                      <span className={remainingBalance > 0 ? 'text-warning-strong' : 'text-success'}>
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-warning-strong">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Nenhum orçamento definido</span>
                </div>
                <Label>Valor do pagamento</Label>
                <CurrencyInput value={manualValue} onChange={setManualValue} />
              </div>
            )}

            {/* Payment type selection */}
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPaymentType('total'); setPartialValue(0); }}
                  className={cn(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                    paymentType === 'total'
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1" />
                  {totalPaid > 0 ? 'Quitar saldo' : 'Pagamento total'}
                  {budgetValue > 0 && <span className="block text-xs font-normal text-muted-foreground">{formatCurrency(totalValue)}</span>}
                </button>
                <button
                  onClick={() => setPaymentType('parcial')}
                  className={cn(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                    paymentType === 'parcial'
                      ? "border-warning bg-warning/10 text-warning-strong"
                      : "border-border hover:border-warning/50"
                  )}
                >
                  <Calculator className="h-4 w-4 mx-auto mb-1" />
                  Pagamento parcial
                </button>
              </div>
            </div>

            {/* Partial value input */}
            {paymentType === 'parcial' && (
              <div className="space-y-2">
                <Label>Valor a pagar agora</Label>
                <CurrencyInput value={partialValue} onChange={setPartialValue} />
                {partialValue > 0 && grossValue > 0 && !exceedsBalance && (
                  <p className="text-xs text-muted-foreground">
                    Saldo restante após pagamento: {formatCurrency(Math.max(0, grossValue - totalPaid - partialValue))}
                  </p>
                )}
                {exceedsBalance && (
                  <p className="text-xs text-destructive">
                    O valor passa do saldo de {formatCurrency(remainingBalance)}. Ajuste o valor ou atualize o orçamento.
                  </p>
                )}
              </div>
            )}

            {/* Payment method selection */}
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => handleMethodSelect(key)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                      color
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 'details' && method && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{paymentType === 'parcial' ? 'Pagamento parcial' : 'Valor do tratamento'}</p>
                <p className="text-lg font-bold">{formatCurrency(effectiveValue)}</p>
              </div>
              <Badge className={PAYMENT_METHODS.find(m => m.key === method)?.color}>
                {PAYMENT_METHODS.find(m => m.key === method)?.label}
              </Badge>
            </div>

            {/* Credit Card Details */}
            {method === 'credito' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Número de Parcelas</Label>
                  <Select
                    value={String(installments)}
                    onValueChange={(v) => setInstallments(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x de {formatCurrency(effectiveValue / n)} — Taxa: {CREDIT_FEE_RATES[n]}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {creditCalc && (
                  <div className="space-y-2 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Valor pago pelo paciente</span>
                      <span className="font-bold">{formatCurrency(effectiveValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-destructive">
                      <span>Taxa de antecipação ({creditCalc.feePercentage}%)</span>
                      <span>- {formatCurrency(creditCalc.feeAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Valor líquido recebido</span>
                      <span className="font-bold text-lg text-success">{formatCurrency(creditCalc.netValue)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Apenas o valor líquido será contabilizado nas metas e faturamento
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pix / Débito / Cheque */}
            {(method === 'debito' || method === 'pix' || method === 'cheque' || method === 'dinheiro') && (
              <div className="p-4 rounded-lg border-2 border-success/20 bg-success/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Valor recebido</span>
                  <span className="font-bold text-lg text-success">{formatCurrency(effectiveValue)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Valor integral contabilizado imediatamente
                </p>
              </div>
            )}

            {/* Boleto Details */}
            {method === 'boleto' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Quantidade de parcelas</Label>
                  <Select
                    value={String(boletoCount)}
                    onValueChange={(v) => handleBoletoCountChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x de {formatCurrency(effectiveValue / n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Datas de Vencimento</Label>
                  {boletoDates.map((date, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {idx + 1}ª
                      </Badge>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => handleBoletoDateChange(idx, e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">
                        {formatCurrency(effectiveValue / boletoCount)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg border-2 border-warning/20 bg-warning/5">
                  <p className="text-xs text-warning-strong flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Boletos só serão contabilizados no faturamento quando confirmados como pagos
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
                disabled={!canConfirm() || createPayment.isPending}
              >
                {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar pagamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
