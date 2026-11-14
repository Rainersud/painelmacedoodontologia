import { describe, it, expect } from 'vitest';
import { monthWeeks, evaluateGroup, referralEvents, countIn, type GoalResult, type Week } from './bonus';

const goal = (current: number, target: number): GoalResult => ({ key: 'x', label: 'x', current, target, hit: current >= target });

describe('bônus por metas — semanas do mês', () => {
  it('novembro/2026 tem 4 semanas (seg a dom, pela quinta-feira)', () => {
    const w = monthWeeks(new Date(2026, 10, 14));
    expect(w).toHaveLength(4);
    expect(w[0].start.getDate()).toBe(2);   // seg 02/11
    expect(w[3].end.getDate()).toBe(29);    // dom 29/11
  });
  it('mês com 5 quintas tem 5 semanas', () => {
    expect(monthWeeks(new Date(2026, 9, 1))).toHaveLength(5); // outubro/2026
  });
});

describe('bônus por metas — regra de pagamento', () => {
  const weeks = monthWeeks(new Date(2026, 10, 1));
  const after = new Date(2026, 11, 5);

  it('R$ 100 por semana com TODAS as metas do grupo batidas', () => {
    const r = evaluateGroup('atendimento', weeks, (w: Week) =>
      w === weeks[1] ? [goal(50, 40), goal(10, 20), goal(3, 3)] : [goal(50, 40), goal(20, 20), goal(3, 3)], 100, after);
    expect(r.weeksHit).toBe(3);
    expect(r.weeks[1].state).toBe('nao_batida');
    expect(r.weeklyTotal).toBe(300);
    expect(r.doubleBonus).toBe(0);
    expect(r.total).toBe(300);
  });

  it('todas as 4 semanas batidas = bônus dobrado (400 + 400)', () => {
    const r = evaluateGroup('indicacoes', weeks, () => [goal(12, 10)], 100, after);
    expect(r.weeklyTotal).toBe(400);
    expect(r.doubleBonus).toBe(400);
    expect(r.total).toBe(800);
  });

  it('mês em andamento: semana atual em andamento e semanas futuras', () => {
    const now = new Date(2026, 10, 14, 12);
    const r = evaluateGroup('indicacoes', weeks, () => [goal(2, 10)], 100, now);
    expect(r.weeks.map(x => x.state)).toEqual(['nao_batida', 'em_andamento', 'futura', 'futura']);
    expect(r.doubleStillPossible).toBe(false);
  });
});

describe('bônus por metas — indicações de todo o painel, sem contar duas vezes', () => {
  it('card do lead, triagem e cadastro com origem indicação viram uma indicação por pessoa', () => {
    const ev = referralEvents({
      referrals: [{ referred_lead_id: 'A', created_at: '2026-11-10T10:00:00' }],
      triage: [
        { id: 't1', converted_lead_id: 'A', created_at: '2026-11-09T10:00:00' }, // mesma pessoa, antes
        { id: 't2', converted_lead_id: null, created_at: '2026-11-11T10:00:00' },
      ],
      leads: [
        { id: 'A', created_at: '2026-11-10T10:00:00', source: 'indicacao' },
        { id: 'B', created_at: '2026-11-12T10:00:00', lead_arrival_source: 'indicacao_pac' },
        { id: 'C', created_at: '2026-11-12T10:00:00', lead_arrival_source: 'facebook' },
      ],
    });
    expect(ev).toHaveLength(3); // A, t2, B
    const week = monthWeeks(new Date(2026, 10, 1))[1]; // 09 a 15/11
    expect(countIn(ev, week)).toBe(3);
  });
});
