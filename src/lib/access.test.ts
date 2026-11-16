import { describe, expect, it } from 'vitest';
import { buildAccess, canOpenPath, canWorkStatus } from './access';

describe('acessos por pessoa', () => {
  it('admin pode tudo', () => {
    const a = buildAccess(true, 'comparecimento');
    expect(a.canFinance && a.canEditGoals && a.canAdmin).toBe(true);
    expect(canWorkStatus(a, 'compareceu')).toBe(true);
    expect(canOpenPath(a, '/configuracoes')).toBe(true);
  });
  it('Ariane (atendimento): todo o sistema, sem Compareceu/Não compareceu, sem financeiro, metas e administração', () => {
    const a = buildAccess(false, 'atendimento');
    expect(canOpenPath(a, '/objetivos')).toBe(true);
    expect(canOpenPath(a, '/comercial-2')).toBe(true);
    expect(canOpenPath(a, '/configuracoes')).toBe(false);
    expect(canWorkStatus(a, 'compareceu')).toBe(false);
    expect(canWorkStatus(a, 'faltou')).toBe(false);
    expect(canWorkStatus(a, 'agendou')).toBe(true);
    expect(a.canFinance || a.canEditGoals || a.canAdmin).toBe(false);
    expect(a.canEditLeadData).toBe(true);
  });
  it('Lidiane (comparecimento): só Comercial 1, só Agendado / Compareceu / Não compareceu, sem editar o card', () => {
    const a = buildAccess(false, 'comparecimento');
    expect(canOpenPath(a, '/funil')).toBe(true);
    expect(canOpenPath(a, '/objetivos')).toBe(false);
    expect(canOpenPath(a, '/crc')).toBe(false);
    expect(canWorkStatus(a, 'compareceu')).toBe(true);
    expect(canWorkStatus(a, 'faltou')).toBe(true);
    expect(canWorkStatus(a, 'agendou')).toBe(true);
    expect(canWorkStatus(a, 'novo_lead')).toBe(false);
    expect(canWorkStatus(a, 'quase_cliente')).toBe(false);
    expect(a.canEditLeadData || a.canFinance || a.canEditGoals).toBe(false);
  });
  it('conta criada pelo link (ou sem perfil) fica sem acesso até ser liberada', () => {
    for (const a of [buildAccess(false, null), buildAccess(false, 'pendente')]) {
      expect(a.pending).toBe(true);
      expect(canOpenPath(a, '/funil')).toBe(false);
      expect(canOpenPath(a, '/objetivos')).toBe(false);
      expect(canWorkStatus(a, 'compareceu')).toBe(false);
    }
  });
});
