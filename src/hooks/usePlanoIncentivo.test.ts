import { describe, expect, it } from 'vitest';
import { endOfDay, endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear } from 'date-fns';
import { chartParts } from './usePlanoIncentivo';

const weekday = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5;

describe('gráfico do Plano de Incentivo segue o filtro de data', () => {
  it('Mês: semanas dentro do próprio mês (sem dias de outros meses)', () => {
    const nov = new Date(2026, 10, 14);
    const p = chartParts({ start: startOfMonth(nov), end: endOfMonth(nov) }, weekday, nov);
    expect(p.unit).toBe('semana');
    expect(p.items.map(i => i.label)).toEqual(['02/11–08/11', '09/11–15/11', '16/11–22/11', '23/11–29/11', '30/11–30/11']);
    expect(p.items.every(i => i.range.start >= startOfMonth(nov) && i.range.end <= endOfMonth(nov))).toBe(true);
    expect(p.items.findIndex(i => i.current)).toBe(1);
  });
  it('Outubro escolhido mostra outubro', () => {
    const out = new Date(2026, 9, 10);
    const p = chartParts({ start: startOfMonth(out), end: endOfMonth(out) }, weekday);
    expect(p.items[0].label.startsWith('01/10')).toBe(true);
    expect(p.items[p.items.length - 1].label.endsWith('31/10')).toBe(true);
  });
  it('Semana: dias úteis da semana; Dia: só o dia', () => {
    const w = chartParts({ start: new Date(2026, 10, 9), end: endOfDay(new Date(2026, 10, 15)) }, weekday);
    expect(w.unit).toBe('dia');
    expect(w.items).toHaveLength(5);
    const d = chartParts({ start: startOfDay(new Date(2026, 10, 12)), end: endOfDay(new Date(2026, 10, 12)) }, weekday);
    expect(d.items).toHaveLength(1);
  });
  it('Ano: 12 meses', () => {
    const y = new Date(2026, 5, 1);
    const p = chartParts({ start: startOfYear(y), end: endOfYear(y) }, weekday);
    expect(p.unit).toBe('mes');
    expect(p.items).toHaveLength(12);
  });
});
