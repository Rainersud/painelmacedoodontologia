// LTV (Comercial 2): uma definição para o pipeline, o LTV Inteligente, o Financeiro e as metas.
//
// Regras (14/11/2026):
//   - Cada paciente que comprou (Venda realizada) tem UM card no LTV (upsell_opportunities).
//   - "Front" = a venda do Comercial 1 (valor do tratamento do lead, na data da venda).
//   - Compra no LTV = cada evolução salva no card do LTV (comprou_2 = 1ª recompra ... comprou_6 = 5+).
//   - Valor vendido no LTV = soma dos pagamentos registrados no card do LTV (bruto, pagos e a receber).
//   - Recebido = pagamentos com status "pago", valor líquido, pela data do pagamento.
//     Os pagamentos do LTV também entram no faturamento da meta da clínica (metrics/rules.revenue
//     soma todos os pagamentos pagos, do front e do LTV).
import { addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LTV_STAGES = [
  { key: 'comprou_1', ltvPurchases: 0, label: 'Comprou no front', short: 'Front' },
  { key: 'comprou_2', ltvPurchases: 1, label: 'Comprou no LTV 1 vez', short: 'LTV 1x' },
  { key: 'comprou_3', ltvPurchases: 2, label: 'Comprou no LTV 2 vezes', short: 'LTV 2x' },
  { key: 'comprou_4', ltvPurchases: 3, label: 'Comprou no LTV 3 vezes', short: 'LTV 3x' },
  { key: 'comprou_5', ltvPurchases: 4, label: 'Comprou no LTV 4 vezes', short: 'LTV 4x' },
  { key: 'comprou_6', ltvPurchases: 5, label: 'Comprou no LTV 5+ vezes', short: 'LTV 5+' },
] as const;

export type LtvStageKey = (typeof LTV_STAGES)[number]['key'];

export function stageIndex(status: string | null | undefined): number {
  const i = LTV_STAGES.findIndex(s => s.key === status);
  return i < 0 ? 0 : i;
}

/** Retorno padrão: 6 meses depois da data (a venda ou a última compra no LTV). */
export function defaultReturnDate(from: Date | string): string {
  return format(addMonths(new Date(from), 6), 'yyyy-MM-dd');
}

export interface LtvOppRow {
  id: string;
  lead_id: string;
  status: string;
  purchase_count?: number | null;
  next_return_date?: string | null;
  return_scheduled?: boolean | null;
  contact_status?: string | null;
  lead?: {
    name?: string | null;
    treatment_value?: number | string | null;
    closed_at?: string | null;
    sale_type?: string | null;
  } | null;
}

export interface LtvPaymentRow {
  id?: string;
  payment_method?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  lead_id: string;
  upsell_opportunity_id?: string | null;
  status: string;
  gross_value?: number | string | null;
  net_value?: number | string | null;
  paid_at?: string | null;
  due_date?: string | null;
  created_at?: string | null;
}

export interface LtvPatient {
  oppId: string;
  leadId: string;
  name: string;
  stage: number; // 0 = só front, 1..5 = compras no LTV (5 = 5+)
  ltvPurchases: number;
  soldAt: Date | null;
  saleType: string | null;
  frontValue: number;
  ltvSold: number;
  ltvReceived: number;
  ltvToReceive: number;
  firstLtvAt: Date | null;
  nextReturn: string | null;
  returnScheduled: boolean;
  contactStatus: string | null;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function buildPatients(opps: LtvOppRow[], payments: LtvPaymentRow[]): LtvPatient[] {
  const byOpp = new Map<string, LtvPaymentRow[]>();
  for (const p of payments) {
    if (!p.upsell_opportunity_id || p.status === 'cancelado' || p.status === 'estornado') continue;
    const arr = byOpp.get(p.upsell_opportunity_id) ?? [];
    arr.push(p);
    byOpp.set(p.upsell_opportunity_id, arr);
  }
  return opps.map(o => {
    const pays = byOpp.get(o.id) ?? [];
    const stage = stageIndex(o.status);
    const counted = Math.max(stage, Math.max(0, n(o.purchase_count) - 1));
    const firstDates = pays
      .map(p => p.paid_at || p.created_at)
      .filter(Boolean)
      .map(d => new Date(d!))
      .sort((a, b) => a.getTime() - b.getTime());
    return {
      oppId: o.id,
      leadId: o.lead_id,
      name: (o.lead?.name || 'Paciente').trim(),
      stage,
      ltvPurchases: counted,
      soldAt: o.lead?.closed_at ? new Date(o.lead.closed_at) : null,
      saleType: o.lead?.sale_type ?? null,
      frontValue: n(o.lead?.treatment_value),
      ltvSold: pays.reduce((s, p) => s + n(p.gross_value ?? p.net_value), 0),
      ltvReceived: pays.filter(p => p.status === 'pago').reduce((s, p) => s + n(p.net_value), 0),
      ltvToReceive: pays.filter(p => p.status === 'pendente').reduce((s, p) => s + n(p.net_value), 0),
      firstLtvAt: firstDates[0] ?? null,
      nextReturn: o.next_return_date ?? null,
      returnScheduled: !!o.return_scheduled,
      contactStatus: o.contact_status ?? null,
    };
  });
}

export interface LtvGroup {
  key: string;
  label: string;
  short: string;
  patients: number;
  /** % da base de pacientes */
  share: number;
  frontValue: number;
  ltvValue: number;
  /** (front + LTV) ÷ pacientes do grupo */
  avgLtv: number;
  /** % dos pacientes do grupo anterior que chegaram neste grupo ou além */
  stepConversion: number | null;
}

export interface LtvSummary {
  patients: number;
  repeatPatients: number;
  /** % dos pacientes com pelo menos 1 compra no LTV */
  repurchaseRate: number;
  frontRevenue: number;
  ltvRevenue: number;
  totalRevenue: number;
  /** quanto o LTV soma em cima do front (%) */
  ltvUplift: number;
  /** participação do LTV no total vendido (%) */
  ltvShare: number;
  ltvPurchases: number;
  /** compras por paciente, contando o front */
  purchasesPerPatient: number;
  /** LTV médio = (front + LTV) ÷ pacientes */
  avgLtv: number;
  frontTicket: number;
  /** ticket médio de cada compra no LTV */
  ltvTicket: number;
  /** LTV médio só de quem recomprou */
  avgLtvRepeat: number;
  /** dias da venda até a 1ª compra no LTV (média) */
  avgDaysToRepurchase: number | null;
  ltvReceived: number;
  ltvToReceive: number;
  groups: LtvGroup[];
  returns: { overdue: number; next30: number; scheduled: number; noDate: number };
}

const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

export function summarize(patients: LtvPatient[], now: Date = new Date()): LtvSummary {
  const total = patients.length;
  const repeat = patients.filter(p => p.ltvPurchases > 0);
  const front = patients.reduce((s, p) => s + p.frontValue, 0);
  const ltv = patients.reduce((s, p) => s + p.ltvSold, 0);
  const purchases = patients.reduce((s, p) => s + p.ltvPurchases, 0);

  const groups: LtvGroup[] = LTV_STAGES.map((st, i) => {
    const inGroup = patients.filter(p => p.stage === i);
    const reached = patients.filter(p => p.stage >= i).length;
    const reachedPrev = i === 0 ? total : patients.filter(p => p.stage >= i - 1).length;
    const f = inGroup.reduce((s, p) => s + p.frontValue, 0);
    const l = inGroup.reduce((s, p) => s + p.ltvSold, 0);
    return {
      key: st.key,
      label: st.label,
      short: st.short,
      patients: inGroup.length,
      share: safe(inGroup.length, total) * 100,
      frontValue: f,
      ltvValue: l,
      avgLtv: safe(f + l, inGroup.length),
      stepConversion: i === 0 ? null : safe(reached, reachedPrev) * 100,
    };
  });

  const days = repeat
    .filter(p => p.soldAt && p.firstLtvAt)
    .map(p => Math.max(0, differenceInCalendarDays(p.firstLtvAt!, p.soldAt!)));

  const today = format(now, 'yyyy-MM-dd');
  const in30 = format(addMonths(now, 1), 'yyyy-MM-dd');

  return {
    patients: total,
    repeatPatients: repeat.length,
    repurchaseRate: safe(repeat.length, total) * 100,
    frontRevenue: front,
    ltvRevenue: ltv,
    totalRevenue: front + ltv,
    ltvUplift: safe(ltv, front) * 100,
    ltvShare: safe(ltv, front + ltv) * 100,
    ltvPurchases: purchases,
    purchasesPerPatient: safe(total + purchases, total),
    avgLtv: safe(front + ltv, total),
    frontTicket: safe(front, total),
    ltvTicket: safe(ltv, purchases),
    avgLtvRepeat: safe(repeat.reduce((s, p) => s + p.frontValue + p.ltvSold, 0), repeat.length),
    avgDaysToRepurchase: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    ltvReceived: patients.reduce((s, p) => s + p.ltvReceived, 0),
    ltvToReceive: patients.reduce((s, p) => s + p.ltvToReceive, 0),
    groups,
    returns: {
      overdue: patients.filter(p => p.nextReturn && p.nextReturn < today && !p.returnScheduled).length,
      next30: patients.filter(p => p.nextReturn && p.nextReturn >= today && p.nextReturn <= in30 && !p.returnScheduled).length,
      scheduled: patients.filter(p => p.returnScheduled).length,
      noDate: patients.filter(p => !p.nextReturn).length,
    },
  };
}

// ---------- Financeiro (caixa) ----------

export interface MonthCash {
  month: string; // yyyy-MM
  label: string;
  front: number;
  ltv: number;
}

/** Recebido por mês (pagamentos pagos, líquido): front x LTV, últimos `months` meses. */
export function cashByMonth(payments: LtvPaymentRow[], months = 12, now: Date = new Date()): MonthCash[] {
  const out: MonthCash[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    out.push({ month: format(start, 'yyyy-MM'), label: format(start, 'MMM/yy', { locale: ptBR }), front: 0, ltv: 0 });
  }
  const idx = new Map(out.map((m, i) => [m.month, i]));
  for (const p of payments) {
    if (p.status !== 'pago' || !p.paid_at) continue;
    const i = idx.get(format(new Date(p.paid_at), 'yyyy-MM'));
    if (i === undefined) continue;
    if (p.upsell_opportunity_id) out[i].ltv += n(p.net_value);
    else out[i].front += n(p.net_value);
  }
  return out;
}

/** Parcelas do LTV a receber por mês de vencimento (próximos `months` meses). */
export function ltvToReceiveByMonth(payments: LtvPaymentRow[], months = 6, now: Date = new Date()) {
  const out: { month: string; label: string; value: number }[] = [];
  for (let i = 0; i < months; i++) {
    const start = startOfMonth(addMonths(now, i));
    out.push({ month: format(start, 'yyyy-MM'), label: format(start, 'MMM/yy', { locale: ptBR }), value: 0 });
  }
  const idx = new Map(out.map((m, i) => [m.month, i]));
  let overdue = 0;
  const monthStart = startOfMonth(now);
  for (const p of payments) {
    if (!p.upsell_opportunity_id || p.status !== 'pendente' || !p.due_date) continue;
    const due = new Date(`${p.due_date}T12:00:00`);
    if (due < monthStart) { overdue += n(p.net_value); continue; }
    const i = idx.get(format(due, 'yyyy-MM'));
    if (i !== undefined) out[i].value += n(p.net_value);
  }
  return { months: out, overdue };
}

/** Recebido no período (pagos, líquido), separado em front e LTV. */
export function cashInRange(payments: LtvPaymentRow[], start: Date, end: Date) {
  let front = 0;
  let ltv = 0;
  for (const p of payments) {
    if (p.status !== 'pago' || !p.paid_at) continue;
    const d = new Date(p.paid_at);
    if (d < start || d > end) continue;
    if (p.upsell_opportunity_id) ltv += n(p.net_value);
    else front += n(p.net_value);
  }
  return { front, ltv, total: front + ltv };
}

export function monthRange(offset = 0, now: Date = new Date()) {
  const s = startOfMonth(subMonths(now, offset));
  return { start: s, end: endOfMonth(s) };
}
