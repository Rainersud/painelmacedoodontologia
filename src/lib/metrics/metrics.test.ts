import { describe, it, expect } from 'vitest';
import { createBusinessCalendar } from './calendar';
import { buildPeriod, inRange, dateOnlyInRange } from './period';
import { normalizeStatus, leadOrigin, isSoldStatus } from './stages';
import {
  newLeads, sales, conversionRate, bookedAppointments, appointmentsInPeriod, attendances,
  attendanceRate, bookingRate, closingRate, revenue, grossRevenue, futureRevenue,
  agentRevenue, revenueByAgent, averageTicket, investment, cac, cpl, roi, roas,
  trafficInvestmentCheck, summarize, percentChange,
  type LeadRow, type AppointmentRow, type PaymentRow, type AcquisitionCostRow,
} from './rules';
import { monthlyGoal, periodGoal, periodProportion, goalStatus, expectedPace } from './goals';

// Datas locais fixas: novembro/2026 (seg 02/11 … seg 30/11).
const d = (y: number, m: number, day: number, h = 10) => new Date(y, m - 1, day, h).toISOString();
const NOW = new Date(2026, 10, 12, 9); // qui 12/11/2026
const nov = buildPeriod('mes', NOW);
const oct = nov.previous;
const cal = createBusinessCalendar(); // seg–sex, sem feriados

const leads: LeadRow[] = [
  { id: 'L1', status: 'fechado', created_at: d(2026, 11, 3), closed_at: d(2026, 11, 10), assigned_agent_id: 'ana', lead_arrival_source: 'instagram' },
  { id: 'L2', status: 'pos_venda', created_at: d(2026, 10, 20), closed_at: d(2026, 11, 5), assigned_agent_id: 'bia' },
  { id: 'L3', status: 'agendou', created_at: d(2026, 11, 4), assigned_agent_id: 'ana' },
  { id: 'L4', status: 'novo_lead', created_at: d(2026, 11, 11), assigned_agent_id: null },
  { id: 'L5', status: 'fechado', created_at: d(2026, 10, 1), closed_at: d(2026, 10, 15), assigned_agent_id: 'ana' },
  { id: 'L6', status: 'em_contato', created_at: d(2026, 10, 2), closed_at: d(2026, 11, 2), assigned_agent_id: 'bia' }, // reaberto: não é venda
];

const appts: AppointmentRow[] = [
  // marcada em outubro para novembro, compareceu
  { id: 'A1', lead_id: 'L2', agent_id: 'bia', created_at: d(2026, 10, 28), scheduled_at: d(2026, 11, 4), attended_at: d(2026, 11, 4) },
  // marcada e realizada em novembro, faltou
  { id: 'A2', lead_id: 'L3', agent_id: 'ana', created_at: d(2026, 11, 4), scheduled_at: d(2026, 11, 9) },
  // marcada em novembro para dezembro
  { id: 'A3', lead_id: 'L1', agent_id: 'ana', created_at: d(2026, 11, 5), scheduled_at: d(2026, 12, 2) },
  // outubro inteiro
  { id: 'A4', lead_id: 'L5', agent_id: 'ana', created_at: d(2026, 10, 5), scheduled_at: d(2026, 10, 10), attended_at: d(2026, 10, 10) },
];

const payments: PaymentRow[] = [
  { lead_id: 'L1', status: 'pago', net_value: 4000, gross_value: 4200, paid_at: d(2026, 11, 10) },
  { lead_id: 'L2', status: 'pago', net_value: '2000', gross_value: 2100, paid_at: d(2026, 11, 6) },
  { lead_id: 'L2', status: 'pendente', net_value: 2000, due_date: '2026-11-30' },
  { lead_id: 'L2', status: 'pendente', net_value: 2000, due_date: '2026-12-30' },
  { lead_id: 'L5', status: 'pago', net_value: 3000, paid_at: d(2026, 10, 16) },
  { lead_id: 'L1', status: 'cancelado', net_value: 999, paid_at: d(2026, 11, 10) },
];

const costs: AcquisitionCostRow[] = [
  { amount: 6000, category: 'anuncios', reference_month: '2026-11-01' },
  { amount: 4000, category: 'salarios_vendas', reference_month: '2026-11-01' },
  { amount: 5000, category: 'anuncios', reference_month: '2026-10-01' },
];

describe('período', () => {
  it('mês começa no dia 1 e o anterior é o mês passado', () => {
    expect(new Date(nov.start).getDate()).toBe(1);
    expect(nov.start.getMonth()).toBe(10);
    expect(nov.end.getDate()).toBe(30);
    expect(oct.start.getMonth()).toBe(9);
    expect(oct.end.getDate()).toBe(31);
  });
  it('semana começa na segunda', () => {
    const w = buildPeriod('semana', NOW);
    expect(w.start.getDay()).toBe(1);
    expect(w.start.getDate()).toBe(9);
    expect(w.end.getDate()).toBe(15);
    expect(w.previous.start.getDate()).toBe(2);
  });
  it('intervalo personalizado compara com o mesmo número de dias antes', () => {
    const p = buildPeriod('personalizado', NOW, { from: new Date(2026, 10, 10), to: new Date(2026, 10, 14) });
    expect(p.previous.start.getDate()).toBe(5);
    expect(p.previous.end.getDate()).toBe(9);
  });
  it('personalizado sem datas cai no mês', () => {
    expect(buildPeriod('personalizado', NOW).key).toBe('mes');
  });
  it('inRange e dateOnlyInRange incluem as pontas', () => {
    expect(inRange(nov.start, nov)).toBe(true);
    expect(inRange(nov.end, nov)).toBe(true);
    expect(inRange(null, nov)).toBe(false);
    expect(dateOnlyInRange('2026-11-30', nov)).toBe(true);
    expect(dateOnlyInRange('2026-12-01', nov)).toBe(false);
  });
});

describe('etapas e origem', () => {
  it('consulta_agendada e agendou são a mesma etapa', () => {
    expect(normalizeStatus('consulta_agendada')).toBe('agendou');
    expect(normalizeStatus('agendou')).toBe('agendou');
  });
  it('etapas pós-venda contam como vendidas', () => {
    expect(isSoldStatus('pos_venda')).toBe(true);
    expect(isSoldStatus('em_contato')).toBe(false);
  });
  it('origem oficial é lead_arrival_source', () => {
    expect(leadOrigin(leads[0])).toBe('instagram');
    expect(leadOrigin({})).toBe('passou_na_frente');
  });
});

describe('leads, vendas e conversão', () => {
  it('novos leads pela data de entrada', () => {
    expect(newLeads(leads, nov).map(l => l.id)).toEqual(['L1', 'L3', 'L4']);
    expect(newLeads(leads, nov, 'ana').length).toBe(2);
  });
  it('vendas pela data de fechamento, incluindo pós-venda, excluindo reabertos', () => {
    expect(sales(leads, nov).map(l => l.id)).toEqual(['L1', 'L2']);
    expect(sales(leads, oct).map(l => l.id)).toEqual(['L5']);
  });
  it('conversão = vendas ÷ novos leads', () => {
    expect(conversionRate(leads, nov)).toBeCloseTo((2 / 3) * 100);
    expect(conversionRate([], nov)).toBe(0);
  });
});

describe('consultas', () => {
  it('agendamento conta pela data de marcação', () => {
    expect(bookedAppointments(appts, nov).map(a => a.id)).toEqual(['A2', 'A3']);
    expect(bookedAppointments(appts, oct).map(a => a.id)).toEqual(['A1', 'A4']);
    expect(bookedAppointments(appts, nov, 'bia')).toEqual([]);
  });
  it('agenda da clínica conta pela data da consulta', () => {
    expect(appointmentsInPeriod(appts, nov).map(a => a.id)).toEqual(['A1', 'A2']);
  });
  it('comparecimentos pela data do comparecimento', () => {
    expect(attendances(appts, nov).map(a => a.id)).toEqual(['A1']);
  });
  it('taxa de comparecimento usa a mesma base nos dois lados', () => {
    expect(attendanceRate(appts, nov)).toBe(50);
    expect(attendanceRate(appts, oct)).toBe(100);
  });
  it('taxa de agendamento e de fechamento', () => {
    expect(bookingRate(appts, leads, nov)).toBeCloseTo((2 / 3) * 100);
    expect(closingRate(leads, appts, nov)).toBe(200); // 2 vendas, 1 comparecimento no mês
  });
});

describe('faturamento', () => {
  it('soma o líquido dos pagamentos pagos pela data do pagamento', () => {
    expect(revenue(payments, nov)).toBe(6000);
    expect(revenue(payments, oct)).toBe(3000);
    expect(grossRevenue(payments, nov)).toBe(6300);
  });
  it('faturamento futuro = pendentes com vencimento no período', () => {
    expect(futureRevenue(payments, nov)).toBe(2000);
  });
  it('receita do atendente pelo dono do lead', () => {
    expect(agentRevenue(payments, leads, 'ana', nov)).toBe(4000);
    expect(agentRevenue(payments, leads, 'bia', nov)).toBe(2000);
    expect(revenueByAgent(payments, leads, nov)).toEqual({ ana: 4000, bia: 2000 });
  });
  it('ticket médio = faturamento ÷ vendas', () => {
    expect(averageTicket(payments, leads, nov)).toBe(3000);
  });
});

describe('investimento, CAC e ROI', () => {
  it('mês inteiro recebe o valor inteiro', () => {
    expect(investment(costs, nov, cal)).toBe(10000);
    expect(investment(costs, nov, cal, ['anuncios'])).toBe(6000);
    expect(investment(costs, oct, cal)).toBe(5000);
  });
  it('semana recebe a fração de dias úteis do mês', () => {
    const w = buildPeriod('semana', NOW); // 09–13/11 = 5 de 21 dias úteis
    expect(investment(costs, w, cal, ['anuncios'])).toBeCloseTo(6000 * 5 / 21);
  });
  it('fórmulas', () => {
    expect(cac(10000, 2)).toBe(5000);
    expect(cac(10000, 0)).toBe(0);
    expect(cpl(6000, 3)).toBe(2000);
    expect(roi(15000, 10000)).toBe(50);
    expect(roas(6300, 6000)).toBeCloseTo(1.05);
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(5, 0)).toBe(100);
  });
  it('conferência do Funil de Tráfego contra o CAC', () => {
    const check = trafficInvestmentCheck(
      [{ investment: 3500, reference_month: '2026-11-01' }, { investment: 2000, reference_month: '2026-11-01' }],
      costs, NOW,
    );
    expect(check).toEqual({ campaigns: 5500, cac: 6000, difference: -500, matches: false });
  });
});

describe('resumo do período', () => {
  it('um período, um conjunto de números', () => {
    const s = summarize({ leads, appointments: appts, payments, costs, calendar: cal }, nov);
    expect(s).toMatchObject({
      newLeads: 3, booked: 2, appointmentsInPeriod: 2, attendances: 1, attendanceRate: 50,
      sales: 2, revenue: 6000, grossRevenue: 6300, futureRevenue: 2000, averageTicket: 3000,
      investment: 10000, trafficInvestment: 6000, cac: 5000, cpl: 2000, roi: -40,
    });
  });
});

describe('metas', () => {
  const settings = { meta_leads: 250, meta_vendas_mes: 25, meta_fechamentos: 0, meta_dias_uteis_mes: 20 };
  it('lê a chave editada primeiro e a semeada como reserva', () => {
    expect(monthlyGoal(settings, 'leads')).toBe(250);
    expect(monthlyGoal(settings, 'vendas')).toBe(25); // meta_fechamentos=0 é ignorada
    expect(monthlyGoal({}, 'faturamento')).toBe(120000);
  });
  it('mês inteiro = meta mensal exata', () => {
    expect(periodProportion(nov, cal, settings)).toBe(1);
    expect(periodGoal(settings, 'leads', nov, cal)).toBe(250);
  });
  it('dia e semana são proporcionais a 20 dias úteis', () => {
    const day = buildPeriod('hoje', NOW);
    const week = buildPeriod('semana', NOW);
    expect(periodGoal(settings, 'leads', day, cal)).toBe(13);   // 250/20 = 12,5
    expect(periodGoal(settings, 'leads', week, cal)).toBe(63);  // 250×5/20 = 62,5
    expect(periodGoal(settings, 'taxa_comparecimento', week, cal)).toBe(70);
  });
  it('dia sem expediente não tem meta de volume', () => {
    const sunday = buildPeriod('hoje', new Date(2026, 10, 15, 9));
    expect(periodGoal(settings, 'leads', sunday, cal)).toBe(0);
    expect(periodGoal(settings, 'faturamento', sunday, cal)).toBe(0);
  });
  it('situação e ritmo', () => {
    expect(goalStatus(90, 100)).toBe('healthy');
    expect(goalStatus(60, 100)).toBe('warning');
    expect(goalStatus(10, 100)).toBe('critical');
    expect(goalStatus(250, 300, true)).toBe('healthy');
    expect(expectedPace(nov, nov.start)).toBe(0);
    expect(expectedPace(nov, nov.end)).toBe(100);
  });
});
