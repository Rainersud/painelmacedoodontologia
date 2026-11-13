import { describe, it, expect } from 'vitest';
import { campaignBreakdown, campaignKey, campaignSuggestions, NO_CAMPAIGN } from './campaigns';

const range = { start: new Date('2026-11-01T03:00:00Z'), end: new Date('2026-12-01T02:59:59Z') };
const d = (day: number) => `2026-11-${String(day).padStart(2, '0')}T15:00:00Z`;

describe('ROI por campanha', () => {
  const leads = [
    { id: 'a', status: 'fechado', created_at: d(2), closed_at: d(10), lead_arrival_source: 'facebook', campaign: 'Black Friday' },
    { id: 'b', status: 'agendou', created_at: d(3), lead_arrival_source: 'facebook', campaign: ' black friday ' },
    { id: 'c', status: 'novo_lead', created_at: d(4), lead_arrival_source: 'instagram', campaign: null },
    { id: 'd', status: 'novo_lead', created_at: d(4), lead_arrival_source: 'indicacao_pac', campaign: null },
  ];
  const appts = [
    { id: '1', lead_id: 'a', created_at: d(3), scheduled_at: d(5), attended_at: d(5) },
    { id: '2', lead_id: 'b', created_at: d(4), scheduled_at: d(20) },
  ];
  const pays = [{ lead_id: 'a', status: 'pago', net_value: 6000, paid_at: d(10) }];
  const ads = [
    { name: 'Black Friday', investment: 1000 },
    { name: 'Lentes', investment: 500, revenue: 2000, sales: 1 },
  ];
  const rows = campaignBreakdown(leads, appts, pays, ads, range);
  const by = Object.fromEntries(rows.map(r => [r.name, r]));

  it('junta leads com a mesma campanha escrita de jeitos diferentes', () => {
    expect(by['Black Friday']).toMatchObject({
      leads: 2, agendamentos: 2, comparecimentos: 1, vendas: 1, receita: 6000, investimento: 1000, digitado: false,
    });
  });
  it('campanha sem leads marcados usa o que foi digitado no Funil de Tráfego', () => {
    expect(by['Lentes']).toMatchObject({ receita: 2000, vendas: 1, investimento: 500, digitado: true });
  });
  it('"Sem campanha" só para leads de origem paga, e fica por último', () => {
    expect(by[NO_CAMPAIGN].leads).toBe(1);
    expect(rows[rows.length - 1].name).toBe(NO_CAMPAIGN);
  });
  it('sugestões sem repetição', () => {
    expect(campaignKey('  Promoção  Implante ')).toBe('promocao implante');
    expect(campaignSuggestions(['Lentes', 'lentes ', 'Black Friday', null])).toEqual(['Black Friday', 'Lentes']);
  });
});
