import { describe, expect, it } from 'vitest';
import { phoneKey, uniquePhones } from './exportPhones';

describe('exportar telefones sem repetidos', () => {
  it('normaliza formatos diferentes do mesmo número', () => {
    expect(phoneKey('+55 (11) 98765-4321')).toBe('11987654321');
    expect(phoneKey('11987654321')).toBe('11987654321');
    expect(phoneKey('5511987654321')).toBe('11987654321');
    expect(phoneKey('011987654321')).toBe('11987654321');
    expect(phoneKey('123')).toBeNull();
  });
  it('não repete número: fica o contato mais antigo; WhatsApp diferente entra também', () => {
    const { rows, duplicados } = uniquePhones([
      { name: 'Ana nova', phone: '(11) 98765-4321', created_at: '2026-11-10T10:00:00Z' },
      { name: 'Ana', phone: '5511987654321', whatsapp: '11987654321', created_at: '2026-10-01T10:00:00Z' },
      { name: 'Beto', phone: '21 3333-4444', whatsapp: '21999998888', created_at: '2026-10-05T10:00:00Z' },
    ]);
    expect(rows.map(r => [r.nome, r.telefone])).toEqual([
      ['Ana', '(11) 98765-4321'],
      ['Beto', '(21) 3333-4444'],
      ['Beto', '(21) 99999-8888'],
    ]);
    expect(new Set(rows.map(r => r.whatsapp)).size).toBe(rows.length);
    expect(duplicados).toBe(1);
  });
});
