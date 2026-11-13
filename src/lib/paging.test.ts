import { describe, it, expect } from 'vitest';
import { allPages } from './paging';

const fakeQuery = (total: number, failAt?: number) => {
  const calls: Array<[number, number]> = [];
  return {
    calls,
    range(from: number, to: number) {
      calls.push([from, to]);
      if (failAt !== undefined && from >= failAt) return Promise.resolve({ data: null, error: { message: 'falhou' } });
      const n = Math.max(0, Math.min(total, to + 1) - from);
      return Promise.resolve({ data: Array.from({ length: n }, (_, i) => from + i), error: null });
    },
  };
};

describe('busca em páginas', () => {
  it('junta mais de 1.000 linhas', async () => {
    const q = fakeQuery(2500);
    const { data, error } = await allPages(q);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(q.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it('para numa página exata de 1.000 depois de uma vazia', async () => {
    const q = fakeQuery(1000);
    expect((await allPages(q)).data).toHaveLength(1000);
    expect(q.calls).toHaveLength(2);
  });
  it('devolve o erro e o que já veio', async () => {
    const { data, error } = await allPages(fakeQuery(5000, 1000));
    expect(data).toHaveLength(1000);
    expect(error).toEqual({ message: 'falhou' });
  });
});
