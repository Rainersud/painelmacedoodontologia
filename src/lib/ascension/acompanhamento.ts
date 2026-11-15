// Planilha "Acompanhamento" (Rainer das Neves Macedo), preenchida pelo sistema.
//
// Aba "Acompanhamento Diario": uma linha por dia (colunas M a AA da planilha original).
// Aba "Dashboard": somas do período (as mesmas fórmulas SUMIFS / IFERROR da planilha).
// Os números saem das mesmas regras do resto do painel (lib/metrics).
import { eachDayOfInterval, endOfDay, startOfDay } from 'date-fns';
import {
  appointmentsInPeriod, attendances, bookedAppointments, investment, newLeads, sales,
  type AcquisitionCostRow, type AppointmentRow, type BusinessCalendar, type DateRange, type LeadRow, type PaymentRow,
} from '@/lib/metrics';

export interface LeadMoney { budget_value?: number | string | null; treatment_value?: number | string | null }

export interface AcompanhamentoInput {
  leads: LeadRow[];
  appointments: AppointmentRow[];
  payments: PaymentRow[];
  costs: AcquisitionCostRow[];
  calendar: BusinessCalendar;
  /** orçamento e valor fechado de cada lead (por id) */
  money: Map<string, LeadMoney>;
}

/** Uma linha da aba "Acompanhamento Diario" (colunas M a AA). */
export interface DailyRow {
  date: Date;
  /** H (gasto) — investimento do dia, distribuído do CAC & Financeiro */
  investimento: number;
  /** N */ leads: number;
  /** O */ agendados: number;
  /** P */ avaliacoes: number;
  /** Q */ faltas: number;
  /** R */ comparecimentos: number;
  /** S */ oportunidade: number;
  /** T */ fechamentosValor: number;
  /** U */ fechados: number;
  /** V */ entrada: number;
  /** W = T/U */ ticket: number | null;
  /** X = O/N */ convAgendamento: number | null;
  /** Y = R/P */ convComparecimento: number | null;
  /** Z = T/S */ taxaFechamento: number | null;
  /** AA = V/T */ taxaEntrada: number | null;
}

const n = (v: number | string | null | undefined) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
/** IFERROR(a/b, "") da planilha */
export const div = (a: number, b: number): number | null => (b ? a / b : null);
const sameDay = (iso: string | null | undefined, r: DateRange) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
};

export function buildDailyRows(input: AcompanhamentoInput, range: DateRange, now = new Date()): DailyRow[] {
  const { leads, appointments, payments, costs, calendar, money } = input;
  return eachDayOfInterval({ start: range.start, end: range.end }).map(d => {
    const day = { start: startOfDay(d), end: endOfDay(d) };
    const avaliacoes = appointmentsInPeriod(appointments, day);
    const attended = attendances(appointments, day);
    // Faltas: consultas do dia que já passaram (ou marcadas como falta) sem comparecimento
    const faltas = avaliacoes.filter(a => !a.attended_at && !a.cancelled_at && (a.no_show_at || day.end < now)).length;
    // Oportunidade: orçamento de quem compareceu no dia (cada paciente uma vez)
    const attendedLeads = [...new Set(attended.map(a => a.lead_id).filter(Boolean) as string[])];
    const oportunidade = attendedLeads.reduce((s, id) => s + n(money.get(id)?.budget_value), 0);
    const sold = sales(leads, day);
    const fechamentosValor = sold.reduce((s, l) => s + n(money.get(l.id)?.treatment_value ?? money.get(l.id)?.budget_value), 0);
    // Entrada: o que o paciente pagou no próprio dia em que fechou
    const soldIds = new Set(sold.map(l => l.id));
    const entrada = payments
      .filter(p => soldIds.has(p.lead_id) && p.status === 'pago' && sameDay(p.paid_at, day))
      .reduce((s, p) => s + n(p.net_value), 0);
    const row = {
      date: day.start,
      investimento: investment(costs, day, calendar),
      leads: newLeads(leads, day).length,
      agendados: bookedAppointments(appointments, day).length,
      avaliacoes: avaliacoes.length,
      faltas,
      comparecimentos: attended.length,
      oportunidade,
      fechamentosValor,
      fechados: sold.length,
      entrada,
    };
    return {
      ...row,
      ticket: div(row.fechamentosValor, row.fechados),
      convAgendamento: div(row.agendados, row.leads),
      convComparecimento: div(row.comparecimentos, row.avaliacoes),
      taxaFechamento: div(row.fechamentosValor, row.oportunidade),
      taxaEntrada: div(row.entrada, row.fechamentosValor),
    };
  });
}

/** Aba "Dashboard": as mesmas células da planilha, somando as linhas do período. */
export interface DashboardCells {
  /** G4 */ investimento: number;
  /** D10 */ leads: number;
  /** A10 = G4/D10 */ custoLead: number | null;
  /** E14 */ agendamentos: number;
  /** A14 = G4/E14 */ custoAgendamento: number | null;
  /** M14 = E14/D10 */ taxaAgendamento: number | null;
  /** F18 */ comparecimentos: number;
  /** A18 = G4/F18 */ custoComparecimento: number | null;
  /** M18 = F18/E14 */ taxaComparecimento: number | null;
  /** G22 */ fechamentos: number;
  /** A22 = G4/G22 */ custoFechamento: number | null;
  /** M22 = G22/F18 */ taxaFechamentos: number | null;
  /** A28 */ oportunidade: number;
  /** G28 */ faturamento: number;
  /** J28 */ entrada: number;
  /** M28 = G28/G22 */ ticketMedio: number | null;
  /** B30 = A28/F18 */ tkm: number | null;
  /** I31 = J28/G28 */ taxaEntrada: number | null;
}

export function dashboardCells(rows: DailyRow[]): DashboardCells {
  const sum = (k: keyof DailyRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const investimento = sum('investimento');
  const leads = sum('leads');
  const agendamentos = sum('agendados');
  const comparecimentos = sum('comparecimentos');
  const fechamentos = sum('fechados');
  const oportunidade = sum('oportunidade');
  const faturamento = sum('fechamentosValor');
  const entrada = sum('entrada');
  return {
    investimento, leads, custoLead: div(investimento, leads),
    agendamentos, custoAgendamento: div(investimento, agendamentos), taxaAgendamento: div(agendamentos, leads),
    comparecimentos, custoComparecimento: div(investimento, comparecimentos), taxaComparecimento: div(comparecimentos, agendamentos),
    fechamentos, custoFechamento: div(investimento, fechamentos), taxaFechamentos: div(fechamentos, comparecimentos),
    oportunidade, faturamento, entrada,
    ticketMedio: div(faturamento, fechamentos), tkm: div(oportunidade, comparecimentos), taxaEntrada: div(entrada, faturamento),
  };
}
