import { describe, it, expect } from 'vitest';
import { buildPatients, summarize, cashByMonth, cashInRange, defaultReturnDate, ltvToReceiveByMonth, type LtvOppRow, type LtvPaymentRow } from './ltv';
import { revenue } from './metrics/rules';

const NOW = new Date('2026-11-14T12:00:00-03:00');

const opp = (id: string, status: string, front: number, closed: string, extra: Partial<LtvOppRow> = {}): LtvOppRow => ({
  id, lead_id: `L-${id}`, status, purchase_count: Number(status.split('_')[1]),
  lead: { name: id, treatment_value: front, closed_at: closed },
  ...extra,
});

const pay = (oppId: string | null, lead: string, gross: number, status: string, paid?: string, due?: string): LtvPaymentRow => ({
  lead_id: lead, upsell_opportunity_id: oppId, status, gross_value: gross, net_value: gross * 0.9,
  paid_at: paid ?? null, due_date: due ?? null, created_at: paid ?? '2026-11-01T12:00:00Z',
});

describe('LTV — pacientes e resumo', () => {
  const opps = [
    opp('a', 'comprou_1', 5000, '2026-08-01T12:00:00Z'),
    opp('b', 'comprou_2', 3000, '2026-08-10T12:00:00Z'),
    opp('c', 'comprou_3', 2000, '2026-09-01T12:00:00Z'),
    opp('d', 'comprou_1', 4000, '2026-10-01T12:00:00Z', { next_return_date: '2026-11-01' }),
  ];
  const payments = [
    pay(null, 'L-a', 5000, 'pago', '2026-08-01T12:00:00Z'),
    pay('b', 'L-b', 1000, 'pago', '2026-10-10T12:00:00Z'),
    pay('c', 'L-c', 600, 'pago', '2026-10-01T12:00:00Z'),
    pay('c', 'L-c', 400, 'pendente', undefined, '2026-12-10'),
  ];
  const patients = buildPatients(opps, payments);
  const s = summarize(patients, NOW);

  it('separa front e LTV', () => {
    expect(s.patients).toBe(4);
    expect(s.frontRevenue).toBe(14000);
    expect(s.ltvRevenue).toBe(2000); // 1000 (b) + 600 + 400 (c)
    expect(s.totalRevenue).toBe(16000);
  });

  it('recompra, compras e tickets', () => {
    expect(s.repeatPatients).toBe(2);
    expect(s.repurchaseRate).toBe(50);
    expect(s.ltvPurchases).toBe(3); // b = 1, c = 2
    expect(s.purchasesPerPatient).toBeCloseTo(7 / 4);
    expect(s.avgLtv).toBe(4000);
    expect(s.frontTicket).toBe(3500);
    expect(s.ltvTicket).toBeCloseTo(2000 / 3);
    expect(s.avgLtvRepeat).toBe((3000 + 1000 + 2000 + 1000) / 2);
    expect(s.ltvShare).toBeCloseTo(12.5);
  });

  it('grupos: front, LTV 1x, LTV 2x… com % da base', () => {
    const g = Object.fromEntries(s.groups.map(x => [x.key, x]));
    expect(g.comprou_1.label).toBe('Comprou no front');
    expect(g.comprou_1.patients).toBe(2);
    expect(g.comprou_1.share).toBe(50);
    expect(g.comprou_2.label).toBe('Comprou no LTV 1 vez');
    expect(g.comprou_2.patients).toBe(1);
    expect(g.comprou_2.stepConversion).toBe(50); // 2 de 4 chegaram ao LTV
    expect(g.comprou_3.stepConversion).toBe(50); // 1 de 2 foi além da 1ª recompra
    expect(s.groups.reduce((a, x) => a + x.patients, 0)).toBe(4);
  });

  it('dias até a 1ª recompra e retornos', () => {
    expect(s.avgDaysToRepurchase).toBe(Math.round((61 + 30) / 2));
    expect(s.returns.overdue).toBe(1);
    expect(s.returns.noDate).toBe(3);
  });

  it('recebido e a receber do LTV', () => {
    expect(s.ltvReceived).toBeCloseTo(1600 * 0.9);
    expect(s.ltvToReceive).toBeCloseTo(400 * 0.9);
    const due = ltvToReceiveByMonth(payments, 6, NOW);
    expect(due.months.find(m => m.month === '2026-12')!.value).toBeCloseTo(360);
  });

  it('caixa por mês separa front e LTV', () => {
    const m = cashByMonth(payments, 12, NOW);
    const oct = m.find(x => x.month === '2026-10')!;
    expect(oct.ltv).toBeCloseTo(1440);
    expect(oct.front).toBe(0);
    expect(m.find(x => x.month === '2026-08')!.front).toBeCloseTo(4500);
    const r = cashInRange(payments, new Date('2026-10-01T00:00:00-03:00'), new Date('2026-10-31T23:59:59-03:00'));
    expect(r.ltv).toBeCloseTo(1440);
  });

  it('pagamento do LTV entra no faturamento da meta da clínica', () => {
    const range = { start: new Date('2026-10-01T00:00:00-03:00'), end: new Date('2026-10-31T23:59:59-03:00') };
    expect(revenue(payments.map(p => ({ ...p, net_value: p.net_value ?? null })), range)).toBeCloseTo(1440);
  });

  it('retorno padrão: 6 meses depois', () => {
    expect(defaultReturnDate('2026-11-14T12:00:00')).toBe('2027-05-14');
  });
});
