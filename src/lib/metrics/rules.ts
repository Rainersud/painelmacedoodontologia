// Camada única de indicadores — Painel Macedo Odontologia.
//
// Cada indicador tem UMA definição, escrita aqui e usada por todas as telas.
// As funções são puras: recebem as linhas do banco e um período, e devolvem números.
// Decisões aprovadas em 12/11/2026 (documento "Diagnóstico e plano"):
//   - Agendamentos (call center e Bônus) contam pela data em que a consulta foi MARCADA.
//   - A agenda da clínica (consultas do período, comparecimento) conta pela data DA CONSULTA.
//   - Taxa de conversão = vendas ÷ novos leads.
//   - Receita do atendente = pagamentos dos leads de que ele é DONO (assigned_agent_id).
//   - Investimento por campanha continua digitado no Funil de Tráfego; o total do mês
//     é conferido contra o CAC (categoria "anuncios").
import { endOfMonth, max as maxDate, min as minDate, startOfMonth } from 'date-fns';
import type { BusinessCalendar } from './calendar';
import { dateOnlyInRange, inRange, type DateRange } from './period';
import { isSoldStatus } from './stages';

// ---------- Linhas mínimas usadas pelos cálculos ----------

export interface LeadRow {
  id: string;
  status?: string | null;
  created_at: string;
  closed_at?: string | null;
  assigned_agent_id?: string | null;
  lead_arrival_source?: string | null;
}

export interface AppointmentRow {
  id: string;
  lead_id?: string | null;
  agent_id?: string | null;
  created_at: string;   // quando a consulta foi marcada
  scheduled_at: string; // quando a consulta acontece
  attended_at?: string | null;
  cancelled_at?: string | null;
}

export interface PaymentRow {
  lead_id: string;
  status: string;
  net_value: number | string | null;
  gross_value?: number | string | null;
  paid_at?: string | null;
  due_date?: string | null;
  agent_id?: string | null;
}

export interface AcquisitionCostRow {
  amount: number | string;
  category: string;
  reference_month: string; // YYYY-MM-DD (primeiro dia do mês)
}

export interface AdCreativeRow {
  investment: number | string;
  reference_month: string;
}

// ---------- Utilitários ----------

const num = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Divisão segura: 0 quando o divisor é 0. */
export const safeDiv = (a: number, b: number) => (b ? a / b : 0);

/** Percentual (0–100+), sem arredondar. */
export const pct = (a: number, b: number) => safeDiv(a, b) * 100;

/** Variação percentual contra o período anterior, arredondada. */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------- Leads ----------

/** Novos leads: criados no período (data de entrada). */
export function newLeads(leads: LeadRow[], range: DateRange, agentId?: string): LeadRow[] {
  return leads.filter(l =>
    inRange(l.created_at, range) && (!agentId || l.assigned_agent_id === agentId));
}

/**
 * Vendas: leads com venda fechada no período (data do fechamento).
 * Conta também quem já avançou para pós-venda/tratamento depois de fechar.
 */
export function sales(leads: LeadRow[], range: DateRange, agentId?: string): LeadRow[] {
  return leads.filter(l =>
    isSoldStatus(l.status) && inRange(l.closed_at, range) &&
    (!agentId || l.assigned_agent_id === agentId));
}

/** Taxa de conversão = vendas ÷ novos leads (%). */
export function conversionRate(leads: LeadRow[], range: DateRange, agentId?: string): number {
  return pct(sales(leads, range, agentId).length, newLeads(leads, range, agentId).length);
}

// ---------- Consultas ----------

/** Agendamentos: consultas MARCADAS no período (produtividade do call center e Bônus). */
export function bookedAppointments(appts: AppointmentRow[], range: DateRange, agentId?: string) {
  return appts.filter(a => inRange(a.created_at, range) && (!agentId || a.agent_id === agentId));
}

/** Consultas do período: consultas que ACONTECEM no período (agenda da clínica). */
export function appointmentsInPeriod(appts: AppointmentRow[], range: DateRange, agentId?: string) {
  return appts.filter(a => inRange(a.scheduled_at, range) && (!agentId || a.agent_id === agentId));
}

/** Comparecimentos: presenças registradas no período (data do comparecimento). */
export function attendances(appts: AppointmentRow[], range: DateRange, agentId?: string) {
  return appts.filter(a => inRange(a.attended_at, range) && (!agentId || a.agent_id === agentId));
}

/**
 * Taxa de comparecimento = consultas do período com presença ÷ consultas do período (%).
 * Usa a mesma base (data da consulta) no numerador e no denominador.
 */
export function attendanceRate(appts: AppointmentRow[], range: DateRange, agentId?: string): number {
  const base = appointmentsInPeriod(appts, range, agentId);
  return pct(base.filter(a => !!a.attended_at).length, base.length);
}

/** Taxa de agendamento = agendamentos marcados ÷ novos leads (%). */
export function bookingRate(
  appts: AppointmentRow[], leads: LeadRow[], range: DateRange, agentId?: string,
): number {
  return pct(bookedAppointments(appts, range, agentId).length, newLeads(leads, range, agentId).length);
}

/** Taxa de fechamento = vendas ÷ comparecimentos (%). */
export function closingRate(
  leads: LeadRow[], appts: AppointmentRow[], range: DateRange, agentId?: string,
): number {
  return pct(sales(leads, range, agentId).length, attendances(appts, range, agentId).length);
}

// ---------- Faturamento ----------

/** Faturamento: soma do valor LÍQUIDO dos pagamentos "pago", pela data do pagamento. */
export function revenue(payments: PaymentRow[], range: DateRange): number {
  return payments
    .filter(p => p.status === 'pago' && inRange(p.paid_at, range))
    .reduce((s, p) => s + num(p.net_value), 0);
}

/** Faturamento bruto (para ROAS): mesmo filtro, valor bruto. */
export function grossRevenue(payments: PaymentRow[], range: DateRange): number {
  return payments
    .filter(p => p.status === 'pago' && inRange(p.paid_at, range))
    .reduce((s, p) => s + num(p.gross_value ?? p.net_value), 0);
}

/** Faturamento futuro: parcelas "pendente" com vencimento no período. */
export function futureRevenue(payments: PaymentRow[], range: DateRange): number {
  return payments
    .filter(p => p.status === 'pendente' && dateOnlyInRange(p.due_date, range))
    .reduce((s, p) => s + num(p.net_value), 0);
}

/** Receita do atendente: pagamentos dos leads de que ele é dono. */
export function agentRevenue(
  payments: PaymentRow[], leads: LeadRow[], agentId: string, range: DateRange,
): number {
  const owned = new Set(leads.filter(l => l.assigned_agent_id === agentId).map(l => l.id));
  return revenue(payments.filter(p => owned.has(p.lead_id)), range);
}

/** Receita por atendente (dono do lead), para rankings. Leads sem dono ficam em "sem_atendente". */
export function revenueByAgent(
  payments: PaymentRow[], leads: LeadRow[], range: DateRange,
): Record<string, number> {
  const owner = new Map(leads.map(l => [l.id, l.assigned_agent_id || 'sem_atendente']));
  const out: Record<string, number> = {};
  for (const p of payments) {
    if (p.status !== 'pago' || !inRange(p.paid_at, range)) continue;
    const k = owner.get(p.lead_id) ?? 'sem_atendente';
    out[k] = (out[k] ?? 0) + num(p.net_value);
  }
  return out;
}

/** Ticket médio = faturamento ÷ vendas. */
export function averageTicket(payments: PaymentRow[], leads: LeadRow[], range: DateRange): number {
  return safeDiv(revenue(payments, range), sales(leads, range).length);
}

// ---------- Investimento, CAC e ROI ----------

/** Categoria de custo que corresponde a tráfego pago (anúncios). */
export const TRAFFIC_CATEGORY = 'anuncios';

/**
 * Investimento no período, a partir da tabela do CAC (acquisition_costs).
 * O valor de cada mês de referência é distribuído pelos dias úteis do mês;
 * um período que cobre o mês inteiro recebe o valor inteiro.
 * `categories` restringe às categorias pedidas (ex.: só "anuncios").
 */
export function investment(
  costs: AcquisitionCostRow[],
  range: DateRange,
  calendar: BusinessCalendar,
  categories?: string[],
): number {
  let total = 0;
  for (const c of costs) {
    if (categories && !categories.includes(c.category)) continue;
    const [y, m] = c.reference_month.slice(0, 7).split('-').map(Number);
    if (!y || !m) continue;
    const mStart = startOfMonth(new Date(y, m - 1, 1));
    const mEnd = endOfMonth(mStart);
    const oStart = maxDate([mStart, range.start]);
    const oEnd = minDate([mEnd, range.end]);
    if (oEnd < oStart) continue;
    let monthDays = calendar.countBusinessDays(mStart, mEnd);
    let overlapDays = calendar.countBusinessDays(oStart, oEnd);
    if (monthDays === 0) {
      // mês sem dia útil configurado: distribui por dias corridos
      monthDays = Math.round((mEnd.getTime() - mStart.getTime()) / 86400000) + 1;
      overlapDays = Math.round((oEnd.getTime() - oStart.getTime()) / 86400000) + 1;
    }
    total += num(c.amount) * (overlapDays / monthDays);
  }
  return total;
}

/** CAC = investimento ÷ vendas novas. */
export const cac = (investmentValue: number, salesCount: number) => safeDiv(investmentValue, salesCount);

/** CPL = investimento ÷ novos leads. */
export const cpl = (investmentValue: number, leadsCount: number) => safeDiv(investmentValue, leadsCount);

/** ROI = (faturamento − investimento) ÷ investimento (%). */
export const roi = (revenueValue: number, investmentValue: number) =>
  pct(revenueValue - investmentValue, investmentValue);

/** ROAS bruto = faturamento bruto ÷ investimento (x). */
export const roas = (grossRevenueValue: number, investmentValue: number) =>
  safeDiv(grossRevenueValue, investmentValue);

/**
 * Conferência do Funil de Tráfego: soma do investimento digitado por campanha no mês
 * contra o total de "anuncios" lançado no CAC para o mesmo mês.
 */
export function trafficInvestmentCheck(
  creatives: AdCreativeRow[], costs: AcquisitionCostRow[], month: Date,
): { campaigns: number; cac: number; difference: number; matches: boolean } {
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const campaigns = creatives
    .filter(c => c.reference_month.slice(0, 7) === key)
    .reduce((s, c) => s + num(c.investment), 0);
  const cacTotal = costs
    .filter(c => c.category === TRAFFIC_CATEGORY && c.reference_month.slice(0, 7) === key)
    .reduce((s, c) => s + num(c.amount), 0);
  const difference = campaigns - cacTotal;
  return { campaigns, cac: cacTotal, difference, matches: Math.abs(difference) < 0.01 };
}

// ---------- Resumo ----------

export interface MetricsInput {
  leads: LeadRow[];
  appointments: AppointmentRow[];
  payments: PaymentRow[];
  costs: AcquisitionCostRow[];
  calendar: BusinessCalendar;
}

export interface MetricsSummary {
  newLeads: number;
  booked: number;
  appointmentsInPeriod: number;
  attendances: number;
  attendanceRate: number;
  bookingRate: number;
  sales: number;
  conversionRate: number;
  closingRate: number;
  revenue: number;
  grossRevenue: number;
  futureRevenue: number;
  averageTicket: number;
  investment: number;
  trafficInvestment: number;
  cac: number;
  cpl: number;
  roi: number;
  roas: number;
}

/** Todos os indicadores de um período, de uma vez, pelas regras acima. */
export function summarize(input: MetricsInput, range: DateRange): MetricsSummary {
  const { leads, appointments, payments, costs, calendar } = input;
  const nLeads = newLeads(leads, range).length;
  const nSales = sales(leads, range).length;
  const rev = revenue(payments, range);
  const gross = grossRevenue(payments, range);
  const inv = investment(costs, range, calendar);
  const traffic = investment(costs, range, calendar, [TRAFFIC_CATEGORY]);
  return {
    newLeads: nLeads,
    booked: bookedAppointments(appointments, range).length,
    appointmentsInPeriod: appointmentsInPeriod(appointments, range).length,
    attendances: attendances(appointments, range).length,
    attendanceRate: attendanceRate(appointments, range),
    bookingRate: bookingRate(appointments, leads, range),
    sales: nSales,
    conversionRate: pct(nSales, nLeads),
    closingRate: closingRate(leads, appointments, range),
    revenue: rev,
    grossRevenue: gross,
    futureRevenue: futureRevenue(payments, range),
    averageTicket: safeDiv(rev, nSales),
    investment: inv,
    trafficInvestment: traffic,
    cac: cac(inv, nSales),
    cpl: cpl(traffic, nLeads),
    roi: roi(rev, inv),
    roas: roas(gross, traffic),
  };
}
