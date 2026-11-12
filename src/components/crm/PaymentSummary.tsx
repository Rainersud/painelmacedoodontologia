// Resumo do pagamento da venda principal: total, pago, em aberto e histórico.
// Cada pagamento registrado é abatido do total; o que falta aparece como "Em aberto".
import { usePayments, type Payment } from '@/hooks/usePayments';
import { cn } from '@/lib/utils';

const METHOD_LABEL: Record<Payment['payment_method'], string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', cheque: 'Cheque', boleto: 'Boleto', dinheiro: 'Dinheiro',
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '–');

export function usePaymentBalance(leadId: string, total: number) {
  const { data: all = [], isLoading } = usePayments(leadId);
  // só a venda principal (recompras do Comercial 2 ficam de fora)
  const payments = all.filter(p => !p.upsell_opportunity_id && p.status !== 'cancelado');
  const paid = payments.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.gross_value || 0), 0);
  const scheduled = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.gross_value || 0), 0);
  const open = Math.max(0, Math.round((total - paid) * 100) / 100);
  return { payments, paid, scheduled, open, isLoading };
}

export function PaymentSummary({ leadId, total }: { leadId: string; total: number }) {
  const { payments, paid, scheduled, open, isLoading } = usePaymentBalance(leadId, total);
  const history = [...payments].sort((a, b) =>
    (a.paid_at || a.due_date || a.created_at).localeCompare(b.paid_at || b.due_date || b.created_at));

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-card border border-border p-2">
          <dt className="text-[11px] text-muted-foreground">Total</dt>
          <dd className="text-sm font-semibold">{brl(total)}</dd>
        </div>
        <div className="rounded-md bg-card border border-border p-2">
          <dt className="text-[11px] text-muted-foreground">Pago</dt>
          <dd className="text-sm font-semibold text-success">{brl(paid)}</dd>
        </div>
        <div className={cn('rounded-md border p-2', open > 0 ? 'bg-warning/10 border-warning/40' : 'bg-success/10 border-success/30')}>
          <dt className="text-[11px] text-muted-foreground">Em aberto</dt>
          <dd className={cn('text-sm font-bold', open > 0 ? 'text-warning-strong' : 'text-success')}>{open > 0 ? brl(open) : 'Quitado'}</dd>
        </div>
      </dl>
      {scheduled > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Do valor em aberto, {brl(scheduled)} já estão lançados em boletos a vencer.
        </p>
      )}

      {!isLoading && history.length > 0 && (
        <details className="group" open={history.length <= 4}>
          <summary className="cursor-pointer text-xs font-medium text-foreground list-none flex items-center justify-between">
            Histórico de pagamentos ({history.length})
            <span className="text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden>▾</span>
          </summary>
          <table className="mt-1.5 w-full text-xs">
            <caption className="sr-only">Histórico de pagamentos</caption>
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th scope="col" className="text-left font-medium py-1">Data</th>
                <th scope="col" className="text-left font-medium py-1">Forma</th>
                <th scope="col" className="text-right font-medium py-1">Valor</th>
                <th scope="col" className="text-right font-medium py-1">Situação</th>
              </tr>
            </thead>
            <tbody>
              {history.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-1">{day(p.paid_at || p.due_date || p.created_at)}</td>
                  <td className="py-1">
                    {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                    {p.total_installments > 1 && <span className="text-muted-foreground"> {p.installment_number}/{p.total_installments}</span>}
                    {p.payment_method === 'credito' && p.installments > 1 && <span className="text-muted-foreground"> em {p.installments}x</span>}
                  </td>
                  <td className="py-1 text-right font-medium">{brl(Number(p.gross_value || 0))}</td>
                  <td className={cn('py-1 text-right', p.status === 'pago' ? 'text-success' : 'text-warning-strong')}>
                    {p.status === 'pago' ? 'Pago' : 'A vencer'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
