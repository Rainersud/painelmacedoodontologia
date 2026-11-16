// "Planilha de Controle Geral" (uma aba por mês), preenchida pelo sistema.
//
// Linhas (A:P a partir da linha 21): um lead por linha, os leads que ENTRARAM no mês.
// MÉTRICAS GERAIS (Q:AA): por origem — as fórmulas COUNTIFS / SUMIFS da planilha.
// Métricas por dia (AC:AK e AM:AU): as fórmulas COUNTIF / SUMIF por data.
// Origens = "Como o lead chegou?" do sistema (escolha do Rainer em 15/11/2026).
import { eachDayOfInterval, endOfMonth, isSameDay, startOfMonth } from 'date-fns';
import { ARRIVAL_SOURCE_LABELS, isSoldStatus } from '@/lib/metrics';
import { div } from './acompanhamento';

export type SimNao = 'SIM' | 'NÃO' | 'ESP' | '';

/** Uma linha de lead (colunas A a P). */
export interface ControleRow {
  leadId: string;
  /** A */ data: Date;
  /** B */ nome: string;
  /** C */ numero: string;
  /** D */ especialidade: string;
  /** E */ ultimoContato: Date | null;
  /** F */ dataAgendamento: Date | null;
  /** G */ clinica: string;
  /** H */ origem: string;
  /** I */ objecoes: string;
  /** J */ crc: string;
  /** K */ agendou: SimNao;
  /** L */ compareceu: SimNao;
  /** M */ orcamento: number | null;
  /** N */ fechou: SimNao;
  /** O */ valorFechado: number | null;
  /** P */ dataFechamento: Date | null;
}

/** Origens (coluna Q), na ordem do campo "Como o lead chegou?". */
export const CONTROLE_ORIGENS = Object.values(ARRIVAL_SOURCE_LABELS);

export interface LeadForControle {
  id: string;
  name: string;
  phone: string | null;
  interest_product: string | null;
  created_at: string;
  last_interaction_at: string | null;
  status: string | null;
  lead_arrival_source: string | null;
  loss_reason: string | null;
  assigned_agent_id: string | null;
  budget_value: number | string | null;
  treatment_value: number | string | null;
  closed_at: string | null;
  scheduled_appointment_at: string | null;
  clinica: string | null;
}
export interface ApptForControle {
  lead_id: string | null;
  scheduled_at: string;
  attended_at: string | null;
  cancelled_at: string | null;
  rescheduled_at: string | null;
  no_show_at: string | null;
}

/** Nome do tratamento como aparece no cadastro. */
const TREATMENT_LABELS: Record<string, string> = {
  implante: 'Implante', protese_flexivel: 'Prótese Flexível', protese_total: 'Prótese Total', outro: 'Outro',
};

const LOST = new Set(['nao_cliente', 'perdido', 'lost']);
const toNum = (v: number | string | null) => (v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Monta as linhas A:P a partir do cadastro do Comercial 1 / CRC / Comercial 2. */
export function buildControleRows(
  leads: LeadForControle[],
  appts: ApptForControle[],
  agentName: (id: string | null) => string,
  now = new Date(),
): ControleRow[] {
  const byLead = new Map<string, ApptForControle[]>();
  appts.forEach(a => { if (a.lead_id) (byLead.get(a.lead_id) ?? byLead.set(a.lead_id, []).get(a.lead_id)!).push(a); });
  return leads
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(l => {
      // consulta que vale: a última que não foi substituída por reagendamento
      const list = (byLead.get(l.id) ?? []).filter(a => !a.rescheduled_at).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
      const last = list[list.length - 1];
      const attended = list.some(a => a.attended_at);
      const sold = isSoldStatus(l.status);
      const agendamento = last?.scheduled_at ?? l.scheduled_appointment_at;
      const compareceu: SimNao = !list.length ? '' : attended ? 'SIM'
        : last && new Date(last.scheduled_at) > now && !last.cancelled_at ? 'ESP' : 'NÃO';
      const fechou: SimNao = sold ? 'SIM' : LOST.has(l.status ?? '') || l.loss_reason ? 'NÃO' : attended ? 'ESP' : '';
      return {
        leadId: l.id,
        data: new Date(l.created_at),
        nome: l.name,
        numero: l.phone ?? '',
        especialidade: l.interest_product ? TREATMENT_LABELS[l.interest_product] ?? l.interest_product : '',
        ultimoContato: l.last_interaction_at ? new Date(l.last_interaction_at) : null,
        dataAgendamento: agendamento ? new Date(agendamento) : null,
        clinica: l.clinica ?? '',
        origem: ARRIVAL_SOURCE_LABELS[l.lead_arrival_source || 'passou_na_frente'] ?? (l.lead_arrival_source ?? ''),
        objecoes: l.loss_reason ?? '',
        crc: agentName(l.assigned_agent_id),
        agendou: list.length || l.scheduled_appointment_at ? 'SIM' : 'NÃO',
        compareceu,
        orcamento: toNum(l.budget_value),
        fechou,
        valorFechado: sold ? toNum(l.treatment_value) ?? toNum(l.budget_value) : null,
        dataFechamento: sold && l.closed_at ? new Date(l.closed_at) : null,
      };
    });
}

/** MÉTRICAS GERAIS (Q:AA) — uma linha por origem e o TOTAL. */
export interface OrigemRow {
  /** Q */ categoria: string;
  /** R = COUNTIF(H, Q) */ qtd: number;
  /** S = COUNTIFS(H, Q, K, "SIM") */ agendamentos: number;
  /** T = S/R */ cvAg: number | null;
  /** U = COUNTIFS(H, Q, L, "SIM") */ comparecimentos: number;
  /** V = U/S */ cvCp: number | null;
  /** W = COUNTIFS(H, Q, N, "SIM") */ fechamentos: number;
  /** X = AA/Z */ cvFch: number | null;
  /** Y = AA/W */ ticket: number | null;
  /** Z = SUMIFS(M, H, Q) */ oportunidade: number;
  /** AA = SUMIFS(O, H, Q) */ vendas: number;
}

function origemRow(categoria: string, rows: ControleRow[]): OrigemRow {
  const agend = rows.filter(r => r.agendou === 'SIM').length;
  const comp = rows.filter(r => r.compareceu === 'SIM').length;
  const fech = rows.filter(r => r.fechou === 'SIM').length;
  const oport = rows.reduce((s, r) => s + (r.orcamento ?? 0), 0);
  const vendas = rows.reduce((s, r) => s + (r.valorFechado ?? 0), 0);
  return {
    categoria, qtd: rows.length, agendamentos: agend, cvAg: div(agend, rows.length),
    comparecimentos: comp, cvCp: div(comp, agend), fechamentos: fech,
    cvFch: div(vendas, oport), ticket: div(vendas, fech), oportunidade: oport, vendas,
  };
}

export function controleByOrigin(rows: ControleRow[], categorias = CONTROLE_ORIGENS): { origens: OrigemRow[]; total: OrigemRow } {
  const origens = categorias.map(c => origemRow(c, rows.filter(r => r.origem === c)));
  const sum = (k: keyof OrigemRow) => origens.reduce((s, o) => s + (o[k] as number), 0);
  const t = { qtd: sum('qtd'), agendamentos: sum('agendamentos'), comparecimentos: sum('comparecimentos'), fechamentos: sum('fechamentos'), oportunidade: sum('oportunidade'), vendas: sum('vendas') };
  return {
    origens,
    total: {
      categoria: 'TOTAL', ...t,
      cvAg: div(t.agendamentos, t.qtd), cvCp: div(t.comparecimentos, t.agendamentos),
      cvFch: div(t.vendas, t.oportunidade), ticket: div(t.vendas, t.fechamentos),
    },
  };
}

/** Métricas por dia (AC:AK / AM:AU). */
export interface DiaRow {
  /** AC */ data: Date;
  /** AD = COUNTIF(A, dia) */ leads: number;
  /** AE = COUNTIFS(A, dia, K, "SIM") */ leadsAgendados: number;
  /** AF = COUNTIF(F, dia) */ agendamentosDia: number;
  /** AG = AF - AH */ faltas: number;
  /** AH = COUNTIFS(F, dia, L, "SIM") */ comparecimentos: number;
  /** AI = SUMIF(F, dia, M) */ oportunidade: number;
  /** AJ = SUMIF(P, dia, O) */ fechamentosValor: number;
  /** AK = COUNTIF(P, dia) */ fechados: number;
}

export function controleByDay(rows: ControleRow[], month: Date): DiaRow[] {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map(d => {
    const on = (x: Date | null) => !!x && isSameDay(x, d);
    const ag = rows.filter(r => on(r.dataAgendamento));
    const comp = ag.filter(r => r.compareceu === 'SIM').length;
    const fech = rows.filter(r => on(r.dataFechamento));
    return {
      data: d,
      leads: rows.filter(r => on(r.data)).length,
      leadsAgendados: rows.filter(r => on(r.data) && r.agendou === 'SIM').length,
      agendamentosDia: ag.length,
      faltas: ag.length - comp,
      comparecimentos: comp,
      oportunidade: ag.reduce((s, r) => s + (r.orcamento ?? 0), 0),
      fechamentosValor: fech.reduce((s, r) => s + (r.valorFechado ?? 0), 0),
      fechados: fech.length,
    };
  });
}
