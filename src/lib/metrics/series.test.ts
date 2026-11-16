import { describe, expect, it } from 'vitest';
import { endOfDay } from 'date-fns';
import { createBusinessCalendar } from './calendar';
import { metricSeries } from './series';
import { summarize } from './rules';

const at = (d: number) => new Date(2026, 10, d, 10).toISOString();
const input = {
  leads: [
    { id: 'a', created_at: at(2), status: 'fechado', closed_at: at(5), lead_arrival_source: 'resgate' },
    { id: 'b', created_at: at(3), status: 'agendou', lead_arrival_source: 'facebook' },
    { id: 'c', created_at: at(3), status: 'novo_lead', lead_arrival_source: 'prospeccao_ativa' },
  ],
  appointments: [
    { id: '1', lead_id: 'a', created_at: at(2), scheduled_at: at(4), attended_at: at(4) },
    { id: '2', lead_id: 'b', created_at: at(3), scheduled_at: at(4) },
  ],
  payments: [{ lead_id: 'a', status: 'pago', net_value: 3000, paid_at: at(5) }],
  costs: [{ amount: 2100, category: 'anuncios', reference_month: '2026-11-01' }],
  calendar: createBusinessCalendar(62, []),
};

describe('séries dos mini gráficos', () => {
  const range = { start: new Date(2026, 10, 1), end: endOfDay(new Date(2026, 10, 30)) };
  const s = metricSeries(input, range, new Date(2026, 10, 10, 12));
  const full = summarize(input, { start: range.start, end: endOfDay(new Date(2026, 10, 10)) });
  it('só até hoje e uma parte por dia', () => {
    expect(s.labels).toHaveLength(10);
  });
  it('contagens somam o total do período', () => {
    expect(s.leads.reduce((a, b) => a + b, 0)).toBe(full.newLeads);
    expect(s.faturamento.reduce((a, b) => a + b, 0)).toBe(full.revenue);
    expect(s.resgate.reduce((a, b) => a + b, 0)).toBe(1);
  });
  it('taxas acumuladas terminam no número do card', () => {
    expect(s.conversao[s.conversao.length - 1]).toBeCloseTo(full.conversionRate, 1);
    expect(s.ticket[s.ticket.length - 1]).toBeCloseTo(full.averageTicket, 1);
  });
});
