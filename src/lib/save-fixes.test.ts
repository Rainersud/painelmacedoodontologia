import { describe, it, expect } from 'vitest';
import { toLocalInputValue } from './datetime';
import { describeError } from './errors';

describe('data da consulta no campo de data/hora', () => {
  it('mostra o horário local e não muda ao salvar de novo', () => {
    const local = new Date(2026, 10, 20, 14, 30); // 20/11 14:30 local
    const shown = toLocalInputValue(local.toISOString());
    expect(shown).toBe('2026-11-20T14:30');
    // salvar de novo (o que o formulário faz) devolve o mesmo instante
    expect(new Date(shown).toISOString()).toBe(local.toISOString());
  });
  it('vazio quando não há data', () => {
    expect(toLocalInputValue(null)).toBe('');
    expect(toLocalInputValue('lixo')).toBe('');
  });
});

describe('mensagens de erro', () => {
  it('explica permissão, conexão e campo obrigatório', () => {
    expect(describeError({ code: '42501', message: 'new row violates row-level security' })).toMatch(/Sem permissão/);
    expect(describeError(new TypeError('Failed to fetch'))).toMatch(/Sem conexão/);
    expect(describeError({ code: '23502', message: 'null value', details: 'name' })).toMatch(/obrigatório/);
    expect(describeError({ message: 'algo' })).toBe('Erro: algo');
  });
});
