import { describe, expect, it } from 'vitest';
import { buscarScripts, preencher, REGUAS, ROTINA_CRC, SCRIPTS } from './crcGuide';

describe('guia da CRC', () => {
  it('busca sem acento e por várias palavras', () => {
    const r = buscarScripts(SCRIPTS, 'preco whatsapp', 'todas', null);
    expect(r.map(s => s.id)).toContain('preco-whatsapp');
    expect(buscarScripts(SCRIPTS, 'cirurgia guiada', 'todas', null).map(s => s.id)).toEqual(['c2-d5']);
  });
  it('acha o script de indicação', () => {
    expect(buscarScripts(SCRIPTS, 'indicacao', 'todas', null).map(s => s.id)).toContain('indicacao-presente');
  });
  it('filtra por objeção e etapa', () => {
    const decisor = buscarScripts(SCRIPTS, '', 'todas', 'decisor').map(s => s.id);
    expect(decisor).toContain('c2-combinado-decisor');
    expect(buscarScripts(SCRIPTS, '', 'faltosos', null).every(s => s.etapa === 'faltosos')).toBe(true);
  });
  it('preenche os campos e mantém os vazios', () => {
    const t = preencher('Oi, [Nome]! Aqui é a [Seu Nome] da clínica [Nome da Clínica], às [Horário].', { paciente: 'Maria', crc: 'Ariane' });
    expect(t).toBe('Oi, Maria! Aqui é a Ariane da clínica [Nome da Clínica], às [Horário].');
  });
  it('rotina: ids únicos e scripts existentes', () => {
    const tarefas = ROTINA_CRC.flatMap(b => b.tarefas);
    expect(new Set(tarefas.map(t => t.id)).size).toBe(tarefas.length);
    for (const t of tarefas) if (t.script) expect(SCRIPTS.some(s => s.id === t.script)).toBe(true);
    expect(new Set(SCRIPTS.map(s => s.id)).size).toBe(SCRIPTS.length);
    for (const r of REGUAS) for (const p of r.passos) for (const id of p.scripts ?? []) expect(SCRIPTS.some(s => s.id === id)).toBe(true);
  });
});
