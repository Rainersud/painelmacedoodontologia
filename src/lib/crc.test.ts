import { describe, it, expect } from 'vitest';
import { buildCrcBoards, openCount, CRC_BOARDS, type CrcLead, type CrcInput } from './crc';

const NOW = new Date('2026-11-12T12:00:00Z');
const iso = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

function lead(id: string, status: string, extra: Partial<CrcLead> = {}): CrcLead {
  return { id, name: id, phone: '11999999999', status, updated_at: iso(-1), ...extra };
}

function build(partial: Partial<CrcInput>) {
  return buildCrcBoards({ now: NOW, leads: [], appointments: [], overduePayments: [], birthdays: [], cards: [], ...partial });
}

const ids = (items: { lead: { id: string } }[]) => items.map(i => i.lead.id);

describe('CRC — quem entra em cada quadro', () => {
  it('tem os 5 quadros, cada um com colunas', () => {
    expect(CRC_BOARDS).toHaveLength(5);
    CRC_BOARDS.forEach(b => expect(b.stages.length).toBeGreaterThan(1));
  });

  it('agendamento sem confirmação: todo Agendado entra, na confirmação certa pela hora', () => {
    const H = 3_600_000;
    const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
    const r = build({
      leads: [
        lead('longe', 'agendou', { scheduled_appointment_at: iso(20) }),
        lead('amanha', 'agendou', { scheduled_appointment_at: at(20 * H) }),
        lead('duasHoras', 'agendou', { scheduled_appointment_at: at(1.5 * H) }),
        lead('agora', 'agendou', { scheduled_appointment_at: at(5 * 60_000) }),
        lead('confirmado', 'confirmado', { scheduled_appointment_at: iso(1) }),
        lead('passou', 'agendou', { scheduled_appointment_at: iso(-1) }),
        lead('outro', 'fechado'),
      ],
      appointments: [{ lead_id: 'outro', scheduled_at: iso(3) }],
    });
    const stage = Object.fromEntries(r.sem_confirmacao.map(i => [i.lead.id, i.stage]));
    expect(stage).toEqual({
      longe: 'agendado', amanha: 'confirmacao_1', duasHoras: 'confirmacao_2', agora: 'confirmacao_3', confirmado: 'confirmado',
    });
    // Só as 3 confirmações contam como "a tratar"
    expect(openCount('sem_confirmacao', r.sem_confirmacao)).toBe(3);
  });

  it('aniversariantes do mês, com idade', () => {
    const r = build({
      leads: [lead('nov', 'fechado'), lead('dez', 'fechado')],
      birthdays: [{ lead_id: 'nov', birth_date: '1980-11-20' }, { lead_id: 'dez', birth_date: '1980-12-20' }],
    });
    expect(ids(r.aniversariantes)).toEqual(['nov']);
    expect(r.aniversariantes[0].reason).toContain('46 anos');
  });

  it('desmarcações: some quando já existe nova consulta', () => {
    const r = build({
      leads: [lead('d1', 'agendou'), lead('d2', 'agendou')],
      appointments: [
        { lead_id: 'd1', scheduled_at: iso(-5), cancelled_at: iso(-6) },
        { lead_id: 'd2', scheduled_at: iso(-5), cancelled_at: iso(-6) },
        { lead_id: 'd2', scheduled_at: iso(4) },
      ],
    });
    expect(ids(r.nao_compareceu)).toEqual(['d1']);
  });

  it('faltas: paciente em tratamento com consulta passada sem presença', () => {
    const r = build({
      leads: [lead('t1', 'fechado', { closed_at: iso(-30) }), lead('t2', 'fechado', { closed_at: iso(-30) })],
      appointments: [
        { lead_id: 't1', scheduled_at: iso(-10) },
        { lead_id: 't2', scheduled_at: iso(-10), attended_at: iso(-10) },
      ],
    });
    expect(ids(r.nao_compareceu)).toEqual(['t1']);
  });

  it('faltas da 1ª consulta: status Faltou (e o nome antigo nao_compareceu)', () => {
    const r = build({ leads: [lead('f1', 'faltou'), lead('f2', 'nao_compareceu'), lead('x', 'compareceu')] });
    expect(ids(r.nao_compareceu).sort()).toEqual(['f1', 'f2']);
  });

  it('inadimplência soma as parcelas vencidas do paciente', () => {
    const r = build({
      leads: [lead('i1', 'fechado')],
      overduePayments: [
        { lead_id: 'i1', due_date: '2026-10-01', gross_value: 300 },
        { lead_id: 'i1', due_date: '2026-11-01', gross_value: 200 },
      ],
    });
    expect(r.inadimplencia[0].amount).toBe(500);
    expect(r.inadimplencia[0].reason).toContain('2 parcelas');
  });

  it('orçamentos em aberto: todo mundo que compareceu, até a venda', () => {
    const r = build({
      leads: [
        lead('o1', 'orcamentos_abertos'),
        lead('o2', 'compareceu', { budget_value: 5000 }),
        lead('o3', 'compareceu'),
        lead('o4', 'fechado', { budget_value: 5000 }),
        lead('o5', 'sem_interesse'),
        lead('o6', 'novo_lead'),
      ],
      appointments: [{ lead_id: 'o5', scheduled_at: iso(-3), attended_at: iso(-3) }],
    });
    expect(ids(r.orcamentos).sort()).toEqual(['o1', 'o2', 'o3', 'o5']);
  });

});

describe('CRC — Não compareceu / Reagendar', () => {
  it('junta desmarcação, falta no tratamento e falta na 1ª consulta', () => {
    const r = build({
      leads: [lead('d1', 'agendou'), lead('t1', 'fechado', { closed_at: iso(-30) }), lead('f1', 'faltou')],
      appointments: [
        { lead_id: 'd1', scheduled_at: iso(-5), cancelled_at: iso(-6) },
        { lead_id: 't1', scheduled_at: iso(-10) },
      ],
    });
    expect(ids(r.nao_compareceu).sort()).toEqual(['d1', 'f1', 't1']);
  });

  it('a ordem dos quadros segue a rotina da clínica', () => {
    expect(CRC_BOARDS.map(b => b.key)).toEqual([
      'sem_confirmacao', 'nao_compareceu', 'orcamentos', 'inadimplencia', 'aniversariantes',
    ]);
  });
});

describe('CRC — colunas salvas', () => {
  it('usa a coluna salva e conta só os em aberto', () => {
    const r = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-3) }), lead('f2', 'faltou', { stage_entered_at: iso(-3) })],
      cards: [{ board: 'nao_compareceu', lead_id: 'f1', stage: 'reagendado', updated_at: iso(-1) }],
    });
    expect(r.nao_compareceu.find(i => i.lead.id === 'f1')!.stage).toBe('reagendado');
    expect(openCount('nao_compareceu', r.nao_compareceu)).toBe(1);
  });

  it('caso novo recomeça na 1ª coluna', () => {
    const r = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-1) })],
      cards: [{ board: 'nao_compareceu', lead_id: 'f1', stage: 'sem_interesse', updated_at: iso(-40) }],
    });
    expect(r.nao_compareceu[0].stage).toBe('a_reagendar');
  });

  it('tirado do quadro não volta, a não ser que aconteça de novo', () => {
    const base = { leads: [lead('f1', 'faltou', { stage_entered_at: iso(-10) })] };
    const hidden = build({ ...base, cards: [{ board: 'nao_compareceu', lead_id: 'f1', stage: 'a_reagendar', archived_at: iso(-2), updated_at: iso(-2) }] });
    expect(hidden.nao_compareceu).toHaveLength(0);
    const again = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-1) })],
      cards: [{ board: 'nao_compareceu', lead_id: 'f1', stage: 'a_reagendar', archived_at: iso(-2), updated_at: iso(-2) }],
    });
    expect(again.nao_compareceu).toHaveLength(1);
  });

  it('paciente colocado à mão aparece mesmo fora da regra', () => {
    const r = build({
      leads: [lead('m1', 'fechado')],
      cards: [{ board: 'nao_compareceu', lead_id: 'm1', stage: 'tentativa_1', manual: true, updated_at: iso(-1) }],
    });
    expect(r.nao_compareceu[0]).toMatchObject({ manual: true, stage: 'tentativa_1' });
  });
});

describe('CRC — Fim de ciclo', () => {
  it('quem não quer mais contato sai dos quadros, menos da cobrança', () => {
    const r = build({
      leads: [lead('x', 'faltou', { contact_opt_out_at: iso(-1) })],
      overduePayments: [{ lead_id: 'x', due_date: '2026-10-01', gross_value: 100 }],
    });
    expect(r.nao_compareceu).toHaveLength(0);
    expect(r.inadimplencia).toHaveLength(1);
  });

  it('desfecho recente continua visível por 7 dias', () => {
    const r = build({
      leads: [lead('x', 'sem_interesse', { contact_opt_out_at: iso(-1) }), lead('y', 'sem_interesse')],
      cards: [
        { board: 'nao_compareceu', lead_id: 'x', stage: 'fim_de_ciclo', updated_at: iso(-1) },
        { board: 'nao_compareceu', lead_id: 'y', stage: 'sem_interesse', updated_at: iso(-10) },
      ],
    });
    expect(r.nao_compareceu.map(i => [i.lead.id, i.stage])).toEqual([['x', 'fim_de_ciclo']]);
  });
});
