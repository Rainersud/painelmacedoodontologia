import { useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Info, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { chartAxis, chartGrid, chartLegend, chartTooltipProps } from '@/lib/chartStyle';
import { cashByMonth, cashInRange, ltvToReceiveByMonth, LTV_PERIODS, ltvPeriodRange, type LtvPeriod } from '@/lib/ltv';
import { useLTVData } from '@/hooks/useLTVData';
import { useOpenLead } from '@/contexts/LeadDetailContext';

const METHOD: Record<string, string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', boleto: 'Boleto', dinheiro: 'Dinheiro', cheque: 'Cheque',
};

const LTV_COLOR = 'hsl(var(--primary))';
const FRONT_COLOR = 'hsl(var(--primary) / 0.35)';

function Kpi({ label, value, sub, help, delta }: { label: string; value: string; sub?: string; help: string; delta?: number | null }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`Como é calculado: ${label}`} className="ml-auto text-muted-foreground/70 hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{help}</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-2xl font-bold tabular-nums mt-1.5 leading-none">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        {delta !== undefined && delta !== null && (
          <span className={cn('inline-flex items-center font-medium', delta >= 0 ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(Math.round(delta))}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

/** Financeiro do LTV: o caixa das recompras, separado do front e somado ao faturamento da clínica. */
export function FinancialDashboard({ period }: { period: LtvPeriod }) {
  const { patients, payments, isLoading } = useLTVData();
  const openLead = useOpenLead();

  const nameByLead = useMemo(() => new Map(patients.map(p => [p.leadId, p.name])), [patients]);
  const periodDef = LTV_PERIODS.find(p => p.key === period)!;
  const r = ltvPeriodRange(period);
  const cur = cashInRange(payments, r.start, r.end);
  const prev = cashInRange(payments, r.prevStart, r.prevEnd);
  const delta = prev.ltv > 0 ? ((cur.ltv - prev.ltv) / prev.ltv) * 100 : null;
  const share = cur.total > 0 ? (cur.ltv / cur.total) * 100 : 0;

  const soldInPeriod = payments
    .filter(p => p.upsell_opportunity_id && p.status !== 'cancelado' && p.created_at
      && new Date(p.created_at) >= r.start && new Date(p.created_at) <= r.end)
    .reduce((s, p) => s + Number(p.gross_value ?? p.net_value ?? 0), 0);

  const monthly = useMemo(() => cashByMonth(payments, 12), [payments]);
  const toReceive = useMemo(() => ltvToReceiveByMonth(payments, 6), [payments]);
  const pendingTotal = toReceive.months.reduce((s, m) => s + m.value, 0) + toReceive.overdue;

  const ltvPayments = useMemo(() => payments
    .filter(p => p.upsell_opportunity_id)
    .sort((a, b) => (b.paid_at || b.due_date || b.created_at || '').localeCompare(a.paid_at || a.due_date || a.created_at || ''))
    .slice(0, 50), [payments]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Financeiro do LTV</h2>
          <p className="text-sm text-muted-foreground">
            Pagamentos registrados no Financeiro da Etapa dos cards do LTV. Eles também somam no faturamento da meta da clínica.
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Kpi label={`Recebido no LTV ${periodDef.current}`} value={formatCurrency(cur.ltv)} delta={delta}
          sub={delta === null ? `${periodDef.previous}: ${formatCurrency(prev.ltv)}` : `vs ${periodDef.previous}`}
          help="Pagamentos do LTV com status pago, valor líquido (já sem taxas), pela data do pagamento." />
        <Kpi label={`Participação no faturamento ${periodDef.current}`} value={`${share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
          sub={`de ${formatCurrency(cur.total)} recebidos pela clínica`}
          help="Recebido no LTV ÷ tudo o que a clínica recebeu no período (front + LTV). É o mesmo faturamento usado na meta." />
        <Kpi label={`Vendido no LTV ${periodDef.current}`} value={formatCurrency(soldInPeriod)}
          sub="registrado no período (pago + a receber)"
          help="Valor bruto dos pagamentos do LTV registrados no período, inclusive parcelas que ainda vão vencer." />
        <Kpi label="A receber do LTV" value={formatCurrency(pendingTotal)}
          sub={toReceive.overdue > 0 ? `${formatCurrency(toReceive.overdue)} vencido` : 'parcelas futuras'}
          help="Parcelas do LTV com status pendente (boletos e parcelamentos), valor líquido." />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 xl:col-span-2" aria-labelledby="fin-mensal">
          <h3 id="fin-mensal" className="text-sm font-semibold">Recebido por mês: front x LTV</h3>
          <p className="text-[11px] text-muted-foreground mb-2">Últimos 12 meses, valor líquido</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis {...chartAxis} dataKey="label" interval={0} tick={{ ...chartAxis.tick, fontSize: 11 }} />
                <YAxis {...chartAxis} width={64} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))} />
                <ChartTooltip {...chartTooltipProps} formatter={(v: number) => formatCurrency(v)} />
                <Legend {...chartLegend} />
                <Bar dataKey="front" name="Front (Comercial 1)" stackId="a" fill={FRONT_COLOR} />
                <Bar dataKey="ltv" name="LTV (Comercial 2)" stackId="a" fill={LTV_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4" aria-labelledby="fin-receber">
          <h3 id="fin-receber" className="text-sm font-semibold">Parcelas do LTV a receber</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Por mês de vencimento</p>
          {pendingTotal === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma parcela do LTV a receber.</p>
          ) : (
            <ul className="space-y-2">
              {toReceive.overdue > 0 && (
                <li className="flex justify-between text-sm">
                  <span className="text-destructive">Vencido</span>
                  <span className="tabular-nums font-medium text-destructive">{formatCurrency(toReceive.overdue)}</span>
                </li>
              )}
              {toReceive.months.map(m => {
                const max = Math.max(1, ...toReceive.months.map(x => x.value));
                return (
                  <li key={m.month}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{m.label}</span>
                      <span className="tabular-nums">{formatCurrency(m.value)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${(m.value / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card" aria-labelledby="fin-pagamentos">
        <div className="flex items-center gap-2 p-4 pb-3">
          <h3 id="fin-pagamentos" className="text-sm font-semibold">Pagamentos do LTV</h3>
          <Badge variant="secondary">{payments.filter(p => p.upsell_opportunity_id).length}</Badge>
        </div>
        {ltvPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 pb-6">
            Nenhum pagamento do LTV ainda. Eles aparecem aqui quando alguém usa "Registrar Pagamento" no card do paciente no Comercial 2.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground text-left border-y bg-muted/30">
                  <th className="font-medium py-2 px-4">Paciente</th>
                  <th className="font-medium py-2 px-4">Data</th>
                  <th className="font-medium py-2 px-4">Forma</th>
                  <th className="font-medium py-2 px-4">Situação</th>
                  <th className="font-medium py-2 px-4 text-right">Bruto</th>
                  <th className="font-medium py-2 px-4 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {ltvPayments.map((p, i) => {
                  const date = p.paid_at || p.due_date || p.created_at;
                  return (
                    <tr key={p.id ?? i} className="border-b last:border-0">
                      <td className="py-2 px-4">
                        <button type="button" onClick={() => openLead(p.lead_id)} className="font-medium hover:underline underline-offset-2 text-left">
                          {nameByLead.get(p.lead_id) ?? 'Paciente'}
                        </button>
                      </td>
                      <td className="py-2 px-4 tabular-nums">{date ? format(new Date(date.length === 10 ? `${date}T12:00:00` : date), 'dd/MM/yyyy') : '–'}</td>
                      <td className="py-2 px-4">
                        {METHOD[p.payment_method ?? ''] ?? p.payment_method ?? '–'}
                        {p.total_installments && p.total_installments > 1 ? ` · ${p.installment_number}/${p.total_installments}` : ''}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" className={cn('text-[11px]', p.status === 'pago' ? 'text-success border-success/30' : 'text-warning-strong border-warning/30')}>
                          {p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'A receber' : p.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">{formatCurrency(Number(p.gross_value ?? 0))}</td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium">{formatCurrency(Number(p.net_value ?? 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
