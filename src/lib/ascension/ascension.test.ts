import { describe, expect, it } from 'vitest';
import { endOfDay, endOfMonth, startOfMonth } from 'date-fns';
import { createBusinessCalendar } from '@/lib/metrics';
import { buildDailyRows, dashboardCells } from './acompanhamento';
import { buildControleRows, controleByDay, controleByOrigin, type LeadForControle } from './controleGeral';

const cal = createBusinessCalendar(62, []);
const at = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString();

describe('Acompanhamento Diario + Dashboard', () => {
  const input = {
    leads: [
      { id: 'a', created_at: at(2), status: 'fechado', closed_at: at(4) },
      { id: 'b', created_at: at(2), status: 'agendou' },
      { id: 'c', created_at: at(3), status: 'novo_lead' },
    ],
    appointments: [
      { id: '1', lead_id: 'a', created_at: at(2), scheduled_at: at(3), attended_at: at(3) },
      { id: '2', lead_id: 'b', created_at: at(2), scheduled_at: at(3) },
    ],
    payments: [{ lead_id: 'a', status: 'pago', net_value: 1000, paid_at: at(4, 15) }],
    costs: [{ amount: 2100, category: 'anuncios', reference_month: '2026-11-01' }],
    calendar: cal,
    money: new Map([['a', { budget_value: 5000, treatment_value: 4000 }], ['b', { budget_value: 3000 }]]),
  };
  const rows = buildDailyRows(input, { start: new Date(2026, 10, 2), end: endOfDay(new Date(2026, 10, 4)) }, new Date(2026, 10, 10));

  it('linha por dia com as colunas N a V', () => {
    const [d2, d3, d4] = rows;
    expect([d2.leads, d2.agendados, d3.leads]).toEqual([2, 2, 1]);
    expect([d3.avaliacoes, d3.comparecimentos, d3.faltas, d3.oportunidade]).toEqual([2, 1, 1, 5000]);
    expect([d4.fechados, d4.fechamentosValor, d4.entrada]).toEqual([1, 4000, 1000]);
    expect(d2.investimento).toBeCloseTo(100); // 2100 ÷ 21 dias úteis de novembro
  });
  it('fórmulas W a AA (IFERROR → vazio)', () => {
    const [d2, d3, d4] = rows;
    expect(d2.convAgendamento).toBe(1);        // O/N
    expect(d3.convComparecimento).toBe(0.5);   // R/P
    expect(d4.ticket).toBe(4000);              // T/U
    expect(d4.taxaEntrada).toBe(0.25);         // V/T
    expect(d4.taxaFechamento).toBeNull();      // T/S com S = 0
  });
  it('Dashboard soma o período e divide igual à planilha', () => {
    const c = dashboardCells(rows);
    expect([c.leads, c.agendamentos, c.comparecimentos, c.fechamentos]).toEqual([3, 2, 1, 1]);
    expect(c.custoLead).toBeCloseTo(100);       // G4/D10 = 300/3
    expect(c.taxaComparecimento).toBe(0.5);     // F18/E14
    expect(c.tkm).toBe(5000);                   // A28/F18
    expect(c.taxaEntrada).toBe(0.25);           // J28/G28
  });
});

describe('Planilha de Controle Geral', () => {
  const base: Omit<LeadForControle, 'id' | 'created_at'> = {
    name: 'X', phone: '1', interest_product: 'Implante', last_interaction_at: null, status: 'novo_lead',
    lead_arrival_source: 'facebook', loss_reason: null, assigned_agent_id: 'u1', budget_value: null,
    treatment_value: null, closed_at: null, scheduled_appointment_at: null, clinica: 'HOFF',
  };
  const leads: LeadForControle[] = [
    { ...base, id: 'a', created_at: at(2), status: 'fechado', budget_value: 5000, treatment_value: 4000, closed_at: at(5) },
    { ...base, id: 'b', created_at: at(2), lead_arrival_source: 'indicacao_pac', budget_value: 3000, loss_reason: 'Preço' },
    { ...base, id: 'c', created_at: at(3) },
  ];
  const appts = [
    { lead_id: 'a', scheduled_at: at(4), attended_at: at(4), cancelled_at: null, rescheduled_at: null, no_show_at: null },
    { lead_id: 'b', scheduled_at: at(4), attended_at: null, cancelled_at: null, rescheduled_at: null, no_show_at: null },
  ];
  const rows = buildControleRows(leads, appts, () => 'Ariane', new Date(2026, 10, 10));

  it('linhas A:P vêm do cadastro', () => {
    expect(rows.map(r => [r.agendou, r.compareceu, r.fechou])).toEqual([['SIM', 'SIM', 'SIM'], ['SIM', 'NÃO', 'NÃO'], ['NÃO', '', '']]);
    expect(rows[0]).toMatchObject({ origem: 'Facebook', clinica: 'HOFF', crc: 'Ariane', valorFechado: 4000, objecoes: '' });
    expect(rows[1].objecoes).toBe('Preço');
  });
  it('MÉTRICAS GERAIS por origem e TOTAL', () => {
    const { origens, total } = controleByOrigin(rows);
    const fb = origens.find(o => o.categoria === 'Facebook')!;
    expect([fb.qtd, fb.agendamentos, fb.comparecimentos, fb.fechamentos, fb.oportunidade, fb.vendas]).toEqual([2, 1, 1, 1, 5000, 4000]);
    expect(fb.cvAg).toBe(0.5);
    expect(fb.cvFch).toBe(0.8);  // AA/Z
    expect([total.qtd, total.agendamentos, total.oportunidade]).toEqual([3, 2, 8000]);
  });
  it('métricas por dia do mês', () => {
    const dias = controleByDay(rows, new Date(2026, 10, 1));
    expect(dias).toHaveLength(30);
    const d4 = dias[3];
    expect([d4.agendamentosDia, d4.comparecimentos, d4.faltas, d4.oportunidade]).toEqual([2, 1, 1, 8000]);
    expect([dias[1].leads, dias[1].leadsAgendados, dias[4].fechados, dias[4].fechamentosValor]).toEqual([2, 2, 1, 4000]);
    expect(dias[0].data).toEqual(startOfMonth(new Date(2026, 10, 1)));
    expect(dias[29].data.getDate()).toBe(endOfMonth(new Date(2026, 10, 1)).getDate());
  });
});
