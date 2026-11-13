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
  it('tem os 8 quadros do print, cada um com colunas', () => {
    expect(CRC_BOARDS).toHaveLength(8);
    CRC_BOARDS.forEach(b => expect(b.stages.length).toBeGreaterThan(1));
  });

  it('agendamento sem confirmação: só os próximos 7 dias, não confirmados', () => {
    const r = build({
      leads: [
        lead('agendado', 'agendou', { scheduled_appointment_at: iso(2) }),
        lead('longe', 'agendou', { scheduled_appointment_at: iso(20) }),
        lead('confirmado', 'confirmado', { scheduled_appointment_at: iso(1) }),
        lead('agenda', 'fechado'),
        lead('agendaConfirmada', 'fechado'),
      ],
      appointments: [
        { lead_id: 'agenda', scheduled_at: iso(3) },
        { lead_id: 'agendaConfirmada', scheduled_at: iso(3), confirmed_at: iso(-1) },
      ],
    });
    expect(ids(r.sem_confirmacao).sort()).toEqual(['agenda', 'agendado']);
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
    expect(ids(r.desmarcacoes)).toEqual(['d1']);
  });

  it('faltas: paciente em tratamento com consulta passada sem presença', () => {
    const r = build({
      leads: [lead('t1', 'fechado', { closed_at: iso(-30) }), lead('t2', 'fechado', { closed_at: iso(-30) })],
      appointments: [
        { lead_id: 't1', scheduled_at: iso(-10) },
        { lead_id: 't2', scheduled_at: iso(-10), attended_at: iso(-10) },
      ],
    });
    expect(ids(r.faltas)).toEqual(['t1']);
  });

  it('faltas da 1ª consulta: status Faltou (e o nome antigo nao_compareceu)', () => {
    const r = build({ leads: [lead('f1', 'faltou'), lead('f2', 'nao_compareceu'), lead('x', 'compareceu')] });
    expect(ids(r.faltas_primeira).sort()).toEqual(['f1', 'f2']);
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

  it('orçamentos em aberto: não entra quem fechou', () => {
    const r = build({
      leads: [
        lead('o1', 'orcamentos_abertos'),
        lead('o2', 'compareceu', { budget_value: 5000 }),
        lead('o3', 'compareceu'),
        lead('o4', 'fechado', { budget_value: 5000 }),
      ],
    });
    expect(ids(r.orcamentos).sort()).toEqual(['o1', 'o2']);
  });

  it('tratamento sem agendamento: fechou, não concluiu, sem próxima consulta', () => {
    const r = build({
      leads: [
        lead('s1', 'fechado'),
        lead('s2', 'fechado'),
        lead('s3', 'fechado', { completed_at: iso(-2) }),
      ],
      appointments: [{ lead_id: 's2', scheduled_at: iso(5) }],
    });
    expect(ids(r.tratamento_sem_agendamento)).toEqual(['s1']);
  });
});

describe('CRC — colunas salvas', () => {
  it('usa a coluna salva e conta só os em aberto', () => {
    const r = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-3) }), lead('f2', 'faltou', { stage_entered_at: iso(-3) })],
      cards: [{ board: 'faltas_primeira', lead_id: 'f1', stage: 'reagendado', updated_at: iso(-1) }],
    });
    expect(r.faltas_primeira.find(i => i.lead.id === 'f1')!.stage).toBe('reagendado');
    expect(openCount('faltas_primeira', r.faltas_primeira)).toBe(1);
  });

  it('caso novo recomeça na 1ª coluna', () => {
    const r = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-1) })],
      cards: [{ board: 'faltas_primeira', lead_id: 'f1', stage: 'perdido', updated_at: iso(-40) }],
    });
    expect(r.faltas_primeira[0].stage).toBe('faltou');
  });

  it('tirado do quadro não volta, a não ser que aconteça de novo', () => {
    const base = { leads: [lead('f1', 'faltou', { stage_entered_at: iso(-10) })] };
    const hidden = build({ ...base, cards: [{ board: 'faltas_primeira', lead_id: 'f1', stage: 'faltou', archived_at: iso(-2), updated_at: iso(-2) }] });
    expect(hidden.faltas_primeira).toHaveLength(0);
    const again = build({
      leads: [lead('f1', 'faltou', { stage_entered_at: iso(-1) })],
      cards: [{ board: 'faltas_primeira', lead_id: 'f1', stage: 'faltou', archived_at: iso(-2), updated_at: iso(-2) }],
    });
    expect(again.faltas_primeira).toHaveLength(1);
  });

  it('paciente colocado à mão aparece mesmo fora da regra', () => {
    const r = build({
      leads: [lead('m1', 'fechado')],
      cards: [{ board: 'desmarcacoes', lead_id: 'm1', stage: 'tentando_reagendar', manual: true, updated_at: iso(-1) }],
    });
    expect(r.desmarcacoes[0]).toMatchObject({ manual: true, stage: 'tentando_reagendar' });
  });
});
