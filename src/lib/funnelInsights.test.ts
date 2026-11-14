import { describe, it, expect } from 'vitest';
import { funnelInsights, funnelRates } from './funnelInsights';

const target = { leads: 286, agendamentos: 143, comparecimentos: 57, vendas: 17, faturamento: 100000, ticket: 6000 };
const targetRates = { agendamento: 50, comparecimento: 40, fechamento: 30 };

describe('funil de vendas — insights', () => {
  it('taxas do funil', () => {
    const r = funnelRates({ leads: 200, agendamentos: 100, comparecimentos: 25, vendas: 5, faturamento: 25000, ticket: 5000 });
    expect(r.agendamento).toBe(50);
    expect(r.comparecimento).toBe(25);
    expect(r.fechamento).toBe(20);
    expect(r.conversao).toBe(2.5);
  });

  it('aponta o gargalo e quanto vale corrigir', () => {
    const ins = funnelInsights({
      actual: { leads: 200, agendamentos: 100, comparecimentos: 20, vendas: 5, faturamento: 25000, ticket: 5000 },
      target, targetRates, pace: 0.5,
    });
    const g = ins.find(i => i.title.startsWith('Gargalo'))!;
    expect(g.title).toBe('Gargalo: comparecimento'); // 20% contra 40% é o pior
    expect(g.tone).toBe('critical');
    // 100 × (40−20)% × 25% de fechamento = 5 vendas a mais × R$ 5.000
    expect(g.text).toContain('5 venda(s) a mais (R$ 25.000)');
    expect(ins[0].tone).toBe('critical');
  });

  it('faturamento abaixo do ritmo calcula vendas e leads que faltam', () => {
    const ins = funnelInsights({
      actual: { leads: 100, agendamentos: 50, comparecimentos: 20, vendas: 6, faturamento: 30000, ticket: 5000 },
      target, targetRates, pace: 0.8,
    });
    const f = ins.find(i => i.title === 'Faturamento abaixo do ritmo')!;
    expect(f.text).toContain('Faltam R$ 70.000 = 14 venda(s)');
  });

  it('ticket abaixo da meta e comparação com o período escolhido', () => {
    const ins = funnelInsights({
      actual: { leads: 300, agendamentos: 150, comparecimentos: 60, vendas: 18, faturamento: 90000, ticket: 5000 },
      target, targetRates, pace: 1,
      previous: { leads: 250, agendamentos: 120, comparecimentos: 50, vendas: 15, faturamento: 60000, ticket: 4000 },
      previousLabel: 'mesmo período de 2025',
    });
    expect(ins.find(i => i.title === 'Ticket médio abaixo da meta')!.text).toContain('R$ 18.000 a mais');
    expect(ins.find(i => i.title.startsWith('Comparado'))!.title).toBe('Comparado ao mesmo período de 2025');
    expect(ins.find(i => i.title.startsWith('Comparado'))!.text).toContain('+50%');
  });
});
