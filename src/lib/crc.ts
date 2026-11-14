// CRC (Central de Relacionamento) — quadros de acompanhamento dentro do Follow Up.
// Aqui ficam só as regras: quem entra em cada quadro e em qual coluna está.
// Nada aqui busca dados; a tela passa leads, consultas, parcelas e fichas já carregados.

import { isSoldStatus } from '@/lib/metrics/stages';

export type CrcBoardKey =
  | 'sem_confirmacao'
  | 'aniversariantes'
  | 'desmarcacoes'
  | 'faltas'
  | 'faltas_primeira'
  | 'inadimplencia'
  | 'orcamentos'
  | 'tratamento_sem_agendamento';

export interface CrcStage {
  key: string;
  label: string;
  /** Coluna de desfecho (o caso está resolvido). */
  done?: boolean;
}

export interface CrcBoard {
  key: CrcBoardKey;
  label: string;
  /** Quem entra automaticamente (aparece no "i" do cartão). */
  rule: string;
  stages: CrcStage[];
}

export const CRC_BOARDS: CrcBoard[] = [
  {
    key: 'sem_confirmacao',
    label: 'Agendamento sem confirmação',
    rule: 'Consultas dos próximos 7 dias que ainda não foram confirmadas.',
    stages: [
      { key: 'a_confirmar', label: 'A confirmar' },
      { key: 'tentativa_1', label: 'Tentativa 1' },
      { key: 'tentativa_2', label: 'Tentativa 2' },
      { key: 'confirmado', label: 'Confirmado', done: true },
      { key: 'desmarcou', label: 'Desmarcou', done: true },
    ],
  },
  {
    key: 'aniversariantes',
    label: 'Aniversariantes',
    rule: 'Pacientes com data de nascimento na ficha de triagem que fazem aniversário neste mês.',
    stages: [
      { key: 'a_parabenizar', label: 'A parabenizar' },
      { key: 'mensagem_enviada', label: 'Mensagem enviada' },
      { key: 'respondeu', label: 'Respondeu', done: true },
    ],
  },
  {
    key: 'desmarcacoes',
    label: 'Desmarcações',
    rule: 'Consultas canceladas nos últimos 90 dias, sem nova consulta marcada.',
    stages: [
      { key: 'desmarcou', label: 'Desmarcou' },
      { key: 'tentando_reagendar', label: 'Tentando reagendar' },
      { key: 'reagendado', label: 'Reagendado', done: true },
      { key: 'sem_interesse', label: 'Sem interesse', done: true },
    ],
  },
  {
    key: 'faltas',
    label: 'Faltas',
    rule: 'Pacientes em tratamento que faltaram a uma consulta nos últimos 90 dias, sem nova consulta marcada.',
    stages: [
      { key: 'faltou', label: 'Faltou' },
      { key: 'contato_feito', label: 'Contato feito' },
      { key: 'reagendado', label: 'Reagendado', done: true },
      { key: 'sem_retorno', label: 'Sem retorno', done: true },
    ],
  },
  {
    key: 'faltas_primeira',
    label: 'Faltas 1ª consulta',
    rule: 'Leads no status "Faltou": não vieram à primeira consulta.',
    stages: [
      { key: 'faltou', label: 'Faltou' },
      { key: 'tentativa_1', label: 'Tentativa 1' },
      { key: 'tentativa_2', label: 'Tentativa 2' },
      { key: 'reagendado', label: 'Reagendado', done: true },
      { key: 'perdido', label: 'Perdido', done: true },
    ],
  },
  {
    key: 'inadimplencia',
    label: 'Inadimplência',
    rule: 'Pacientes com parcela pendente e vencida.',
    stages: [
      { key: 'vencida', label: 'Vencida' },
      { key: 'cobranca_enviada', label: 'Cobrança enviada' },
      { key: 'negociando', label: 'Negociando' },
      { key: 'acordo_feito', label: 'Acordo feito', done: true },
    ],
  },
  {
    key: 'orcamentos',
    label: 'Orçamentos em aberto',
    rule: 'Leads em "Orçamentos abertos", ou que compareceram com orçamento e ainda não fecharam.',
    stages: [
      { key: 'orcamento_entregue', label: 'Orçamento entregue' },
      { key: 'retorno_1', label: 'Retorno 1' },
      { key: 'retorno_2', label: 'Retorno 2' },
      { key: 'negociacao', label: 'Negociação' },
      { key: 'nao_fechou', label: 'Não fechou', done: true },
    ],
  },
  {
    key: 'tratamento_sem_agendamento',
    label: 'Tratamento sem agendamento',
    rule: 'Pacientes que fecharam tratamento, ainda não concluíram e estão sem próxima consulta marcada.',
    stages: [
      { key: 'sem_agenda', label: 'Sem agenda' },
      { key: 'contato_feito', label: 'Contato feito' },
      { key: 'agendado', label: 'Agendado', done: true },
    ],
  },
];

export const CRC_BOARD_MAP = Object.fromEntries(CRC_BOARDS.map(b => [b.key, b])) as Record<CrcBoardKey, CrcBoard>;

// ---------- Entradas ----------

export interface CrcLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  budget_value?: number | null;
  scheduled_appointment_at?: string | null;
  stage_entered_at?: string | null;
  closed_at?: string | null;
  completed_at?: string | null;
  updated_at: string;
}

export interface CrcAppointment {
  lead_id: string;
  scheduled_at: string;
  created_at?: string | null;
  confirmed_at?: string | null;
  attended_at?: string | null;
  cancelled_at?: string | null;
  /** Data trocada por outra consulta (fica só no histórico). */
  rescheduled_at?: string | null;
  /** Paciente faltou. */
  no_show_at?: string | null;
}

export interface CrcOverduePayment {
  lead_id: string;
  due_date: string;
  gross_value: number;
}

export interface CrcBirthday {
  lead_id: string;
  birth_date: string; // AAAA-MM-DD
}

export interface CrcCardRow {
  board: string;
  lead_id: string;
  stage: string;
  manual?: boolean | null;
  archived_at?: string | null;
  updated_at: string;
}

export interface CrcInput {
  now: Date;
  leads: CrcLead[];
  appointments: CrcAppointment[];
  overduePayments: CrcOverduePayment[];
  birthdays: CrcBirthday[];
  cards: CrcCardRow[];
}

export interface CrcItem {
  board: CrcBoardKey;
  lead: CrcLead;
  /** Coluna atual do kanban. */
  stage: string;
  /** Frase curta do motivo ("Consulta 14/11 às 10:00"). */
  reason: string;
  /** Data do fato que trouxe o paciente (para ordenar). */
  eventAt: string;
  /** Valor ligado ao caso (orçamento, valor vencido). */
  amount?: number;
  /** Entrou pela mão de alguém, não pela regra. */
  manual: boolean;
}

// ---------- Regras ----------

const DAY = 86_400_000;
const FIRST_NO_SHOW = new Set(['faltou', 'nao_compareceu']);
const SCHEDULED = new Set(['agendou', 'consulta_agendada']);
const LOST = new Set(['sem_interesse', 'descartados']);
const IN_TREATMENT = new Set(['fechado', 'tratamento_andamento']);

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${fmtDate(iso)} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function isActive(a: CrcAppointment) {
  return !a.cancelled_at && !a.attended_at && !a.rescheduled_at && !a.no_show_at;
}

interface Occurrence {
  reason: string;
  eventAt: string;
  /** A coluna salva só vale se foi mexida depois disso (um caso novo recomeça na 1ª coluna). */
  since?: string;
  amount?: number;
}

type Rule = (lead: CrcLead, ctx: Ctx) => Occurrence | null;

interface Ctx {
  now: Date;
  appts: CrcAppointment[];
  overdue: CrcOverduePayment[];
  birth?: string;
}

function hasFutureAppointment(lead: CrcLead, ctx: Ctx): boolean {
  const nowMs = ctx.now.getTime();
  if (SCHEDULED.has(lead.status) || lead.status === 'confirmado') {
    if (lead.scheduled_appointment_at && new Date(lead.scheduled_appointment_at).getTime() >= nowMs) return true;
  }
  return ctx.appts.some(a => isActive(a) && new Date(a.scheduled_at).getTime() >= nowMs);
}

const RULES: Record<CrcBoardKey, Rule> = {
  sem_confirmacao(lead, ctx) {
    if (lead.status === 'confirmado' || LOST.has(lead.status)) return null;
    const nowMs = ctx.now.getTime();
    const limit = nowMs + 7 * DAY;
    const inWindow = (iso?: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= nowMs && t <= limit;
    };
    const next = ctx.appts
      .filter(a => isActive(a) && !a.confirmed_at && inWindow(a.scheduled_at))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
    if (next) return { reason: `Consulta ${fmtDateTime(next.scheduled_at)}`, eventAt: next.scheduled_at, since: next.created_at ?? undefined };
    if (SCHEDULED.has(lead.status) && inWindow(lead.scheduled_appointment_at)) {
      // Consulta marcada no lead, sem registro de agenda (ou já confirmada lá).
      const confirmedThere = ctx.appts.some(a => a.confirmed_at && ms(a.scheduled_at) === ms(lead.scheduled_appointment_at!));
      if (confirmedThere) return null;
      return { reason: `Consulta ${fmtDateTime(lead.scheduled_appointment_at!)}`, eventAt: lead.scheduled_appointment_at!, since: lead.stage_entered_at ?? undefined };
    }
    return null;
  },

  aniversariantes(_lead, ctx) {
    if (!ctx.birth) return null;
    const [y, m, d] = ctx.birth.slice(0, 10).split('-').map(Number);
    if (!m || !d || m - 1 !== ctx.now.getMonth()) return null;
    const year = ctx.now.getFullYear();
    const day = new Date(year, m - 1, d, 12);
    const age = y ? year - y : null;
    const monthStart = new Date(year, m - 1, 1).toISOString();
    return {
      reason: `Faz ${age ? `${age} anos` : 'aniversário'} em ${fmtDate(day.toISOString())}`,
      eventAt: day.toISOString(),
      since: monthStart,
    };
  },

  desmarcacoes(lead, ctx) {
    if (LOST.has(lead.status)) return null;
    const from = ctx.now.getTime() - 90 * DAY;
    const last = ctx.appts
      .filter(a => a.cancelled_at && new Date(a.cancelled_at).getTime() >= from)
      .sort((a, b) => b.cancelled_at!.localeCompare(a.cancelled_at!))[0];
    if (!last) return null;
    if (hasFutureAppointment(lead, ctx)) return null;
    return { reason: `Desmarcou a consulta de ${fmtDate(last.scheduled_at)}`, eventAt: last.cancelled_at!, since: last.cancelled_at! };
  },

  faltas(lead, ctx) {
    if (!isSoldStatus(lead.status) || lead.completed_at) return null;
    const nowMs = ctx.now.getTime();
    const from = nowMs - 90 * DAY;
    // Faltou = falta registrada, ou consulta que já passou (1 dia de folga para registrar) sem presença
    const missed = ctx.appts
      .filter(a => !a.attended_at && !a.cancelled_at && !a.rescheduled_at)
      .filter(a => {
        const t = new Date(a.scheduled_at).getTime();
        return t >= from && (a.no_show_at ? true : t < nowMs - DAY);
      })
      .filter(a => !lead.closed_at || ms(a.scheduled_at) > ms(lead.closed_at))
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
    if (!missed) return null;
    const cameLater = ctx.appts.some(a => a.attended_at && ms(a.scheduled_at) > ms(missed.scheduled_at));
    if (cameLater || hasFutureAppointment(lead, ctx)) return null;
    return { reason: `Faltou em ${fmtDate(missed.scheduled_at)}`, eventAt: missed.scheduled_at, since: missed.scheduled_at };
  },

  faltas_primeira(lead) {
    if (!FIRST_NO_SHOW.has(lead.status)) return null;
    const at = lead.stage_entered_at || lead.scheduled_appointment_at || lead.updated_at;
    const when = lead.scheduled_appointment_at ? ` de ${fmtDate(lead.scheduled_appointment_at)}` : '';
    return { reason: `Faltou à 1ª consulta${when}`, eventAt: at, since: lead.stage_entered_at ?? undefined };
  },

  inadimplencia(_lead, ctx) {
    if (!ctx.overdue.length) return null;
    const total = ctx.overdue.reduce((s, p) => s + Number(p.gross_value || 0), 0);
    const oldest = ctx.overdue.map(p => p.due_date).sort()[0];
    const n = ctx.overdue.length;
    return {
      reason: `${n} parcela${n > 1 ? 's' : ''} vencida${n > 1 ? 's' : ''} desde ${fmtDate(oldest + 'T12:00:00')} · ${money(total)}`,
      eventAt: oldest,
      amount: total,
    };
  },

  orcamentos(lead) {
    if (isSoldStatus(lead.status) || LOST.has(lead.status)) return null;
    const budget = Number(lead.budget_value || 0);
    const open = lead.status === 'orcamentos_abertos' || (lead.status === 'compareceu' && budget > 0);
    if (!open) return null;
    return {
      reason: budget > 0 ? `Orçamento de ${money(budget)}` : 'Orçamento sem valor registrado',
      eventAt: lead.stage_entered_at || lead.updated_at,
      amount: budget || undefined,
    };
  },

  tratamento_sem_agendamento(lead, ctx) {
    if (!IN_TREATMENT.has(lead.status) || lead.completed_at) return null;
    if (hasFutureAppointment(lead, ctx)) return null;
    const at = lead.closed_at || lead.updated_at;
    return { reason: `Fechou em ${fmtDate(at)} · sem próxima consulta`, eventAt: at, since: lead.closed_at ?? undefined };
  },
};

/** Monta todos os quadros. Cada lead pode estar em mais de um quadro. */
export function buildCrcBoards(input: CrcInput): Record<CrcBoardKey, CrcItem[]> {
  const apptsBy = groupBy(input.appointments, a => a.lead_id);
  const overdueBy = groupBy(input.overduePayments, p => p.lead_id);
  const birthBy = new Map(input.birthdays.map(b => [b.lead_id, b.birth_date]));
  const cardBy = new Map(input.cards.map(c => [`${c.board}:${c.lead_id}`, c]));
  const leadBy = new Map(input.leads.map(l => [l.id, l]));

  const out = Object.fromEntries(CRC_BOARDS.map(b => [b.key, [] as CrcItem[]])) as Record<CrcBoardKey, CrcItem[]>;

  for (const board of CRC_BOARDS) {
    const first = board.stages[0].key;
    const valid = new Set(board.stages.map(s => s.key));
    const seen = new Set<string>();

    for (const lead of input.leads) {
      const ctx: Ctx = { now: input.now, appts: apptsBy.get(lead.id) ?? [], overdue: overdueBy.get(lead.id) ?? [], birth: birthBy.get(lead.id) };
      const occ = RULES[board.key](lead, ctx);
      if (!occ) continue;
      const card = cardBy.get(`${board.key}:${lead.id}`);
      // Tirado do quadro: só volta se acontecer um caso novo depois disso.
      if (card?.archived_at && !(occ.since && ms(occ.since) > ms(card.archived_at))) continue;
      const fresh = card && !card.archived_at && (!occ.since || ms(card.updated_at) >= ms(occ.since));
      const stage = fresh && valid.has(card.stage) ? card.stage : first;
      out[board.key].push({ board: board.key, lead, stage, reason: occ.reason, eventAt: occ.eventAt, amount: occ.amount, manual: false });
      seen.add(lead.id);
    }

    // Colocados à mão (a regra não pegou, mas alguém quis acompanhar)
    for (const card of input.cards) {
      if (card.board !== board.key || !card.manual || card.archived_at || seen.has(card.lead_id)) continue;
      const lead = leadBy.get(card.lead_id);
      if (!lead) continue;
      out[board.key].push({
        board: board.key, lead, stage: valid.has(card.stage) ? card.stage : first,
        reason: 'Adicionado manualmente', eventAt: card.updated_at, manual: true,
      });
    }

    out[board.key].sort((a, b) => sortKey(board.key, a, b));
  }
  return out;
}

function sortKey(board: CrcBoardKey, a: CrcItem, b: CrcItem) {
  // Agenda e aniversário: o mais próximo primeiro. Demais: quem espera há mais tempo primeiro.
  // Inadimplência: o maior valor vencido primeiro.
  if (board === 'inadimplencia') return (b.amount ?? 0) - (a.amount ?? 0);
  return ms(a.eventAt) - ms(b.eventAt);
}

function ms(iso: string) {
  return new Date(iso).getTime();
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k);
    if (arr) arr.push(r); else m.set(k, [r]);
  }
  return m;
}

/** Quantos estão "em aberto" (fora das colunas de desfecho). */
export function openCount(board: CrcBoardKey, items: CrcItem[]) {
  const done = new Set(CRC_BOARD_MAP[board].stages.filter(s => s.done).map(s => s.key));
  return items.filter(i => !done.has(i.stage)).length;
}
