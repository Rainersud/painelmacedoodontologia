// Insights do funil de vendas: leem os números do período contra as metas (escada do
// objetivo central) e dizem onde está o gargalo e quanto vale corrigir cada etapa.

export interface FunnelNumbers {
  leads: number;
  agendamentos: number;
  comparecimentos: number;
  vendas: number;
  faturamento: number;
  ticket: number;
}

export interface FunnelInput {
  actual: FunnelNumbers;
  /** metas do período inteiro */
  target: FunnelNumbers;
  /** taxas meta (%): agendamento, comparecimento, fechamento */
  targetRates: { agendamento: number; comparecimento: number; fechamento: number };
  /** fração do período já decorrida (0 a 1), para julgar o ritmo */
  pace: number;
  /** período anterior (ou do ano passado), se houver */
  previous?: FunnelNumbers;
  previousLabel?: string;
}

export type InsightTone = 'critical' | 'warning' | 'good';
export interface FunnelInsight { tone: InsightTone; title: string; text: string }

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const rate = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export function funnelRates(n: FunnelNumbers) {
  return {
    agendamento: rate(n.agendamentos, n.leads),
    comparecimento: rate(n.comparecimentos, n.agendamentos),
    fechamento: rate(n.vendas, n.comparecimentos),
    conversao: rate(n.vendas, n.leads),
  };
}

export function funnelInsights(input: FunnelInput): FunnelInsight[] {
  const { actual: a, target: t, targetRates: tr, pace } = input;
  const r = funnelRates(a);
  const out: FunnelInsight[] = [];
  const ticket = a.ticket || t.ticket;
  const fech = r.fechamento || tr.fechamento;
  const comp = r.comparecimento || tr.comparecimento;

  // 1) Gargalo: a etapa mais longe da taxa meta, e quanto vale corrigi-la
  const stages = [
    {
      name: 'Agendamento', real: r.agendamento, meta: tr.agendamento, base: a.leads, baseNoun: 'leads',
      extraVendas: (a.leads * (tr.agendamento - r.agendamento)) / 100 * (comp / 100) * (fech / 100),
      how: 'responda em até 5 min, faça a cadência de follow-up D1 a D14 e ofereça dois horários na primeira conversa',
    },
    {
      name: 'Comparecimento', real: r.comparecimento, meta: tr.comparecimento, base: a.agendamentos, baseNoun: 'agendamentos',
      extraVendas: (a.agendamentos * (tr.comparecimento - r.comparecimento)) / 100 * (fech / 100),
      how: 'faça as três confirmações do CRC (24h, 2h e 10 min antes) e reagende na hora quem não compareceu',
    },
    {
      name: 'Fechamento', real: r.fechamento, meta: tr.fechamento, base: a.comparecimentos, baseNoun: 'comparecimentos',
      extraVendas: (a.comparecimentos * (tr.fechamento - r.fechamento)) / 100,
      how: 'apresente o plano completo, trate objeções de preço com crédito (PAGMAIS / MAIORAL) e faça follow-up dos orçamentos em aberto em 24h',
    },
  ].filter(s => s.base > 0);

  const below = stages.filter(s => s.real < s.meta).sort((x, y) => x.real / x.meta - y.real / y.meta);
  if (below.length) {
    const g = below[0];
    const extra = Math.max(0, g.extraVendas);
    out.push({
      tone: g.real < g.meta * 0.6 ? 'critical' : 'warning',
      title: `Gargalo: ${g.name.toLowerCase()}`,
      text: `${g.name} em ${pct(g.real)} (meta ${pct(g.meta)}) sobre ${g.base} ${g.baseNoun}.`
        + (extra >= 0.5 ? ` Chegando na meta, viram cerca de ${Math.round(extra)} venda(s) a mais (${brl(extra * ticket)}).` : '')
        + ` Para isso: ${g.how}.`,
    });
  }

  // 2) Faturamento contra o ritmo esperado
  const expected = t.faturamento * pace;
  if (t.faturamento > 0) {
    const missing = Math.max(0, t.faturamento - a.faturamento);
    if (a.faturamento >= t.faturamento) {
      out.push({ tone: 'good', title: 'Meta de faturamento batida', text: `${brl(a.faturamento)} de ${brl(t.faturamento)} no período.` });
    } else if (a.faturamento < expected * 0.85) {
      const vendasFaltam = ticket > 0 ? Math.ceil(missing / ticket) : 0;
      const leadsNecessarios = Math.ceil(vendasFaltam / ((fech / 100) * (comp / 100) * ((r.agendamento || tr.agendamento) / 100) || 1));
      out.push({
        tone: a.faturamento < expected * 0.55 ? 'critical' : 'warning',
        title: 'Faturamento abaixo do ritmo',
        text: `${brl(a.faturamento)} de ${brl(t.faturamento)} (${pct(rate(a.faturamento, t.faturamento))}); o esperado até agora era ${brl(expected)}.`
          + (vendasFaltam > 0 ? ` Faltam ${brl(missing)} = ${vendasFaltam} venda(s) no ticket de ${brl(ticket)}, o que pede uns ${leadsNecessarios} leads nas taxas atuais.` : ''),
      });
    } else {
      out.push({ tone: 'good', title: 'Faturamento no ritmo', text: `${brl(a.faturamento)} de ${brl(t.faturamento)}, dentro do esperado para esta altura do período.` });
    }
  }

  // 3) Ticket médio
  if (a.vendas > 0 && t.ticket > 0 && a.ticket < t.ticket * 0.9) {
    out.push({
      tone: 'warning',
      title: 'Ticket médio abaixo da meta',
      text: `Ticket de ${brl(a.ticket)} contra ${brl(t.ticket)}. No ticket da meta, as ${a.vendas} venda(s) teriam faturado ${brl(a.vendas * t.ticket)} (${brl(a.vendas * (t.ticket - a.ticket))} a mais).`,
    });
  }

  // 4) Volume de leads
  const leadsEsperados = t.leads * pace;
  if (t.leads > 0 && a.leads < leadsEsperados * 0.85) {
    out.push({
      tone: a.leads < leadsEsperados * 0.55 ? 'critical' : 'warning',
      title: 'Volume de leads abaixo do ritmo',
      text: `${a.leads} leads de ${Math.round(leadsEsperados)} esperados até agora (meta do período: ${t.leads}). Revise verba e criativos no Funil de tráfego pago e ative as origens estratégicas (indicação, prospecção ativa, parcerias).`,
    });
  }

  // 5) Etapas acima da meta: o que está funcionando
  const above = stages.filter(s => s.real >= s.meta && s.base >= 5);
  for (const s of above.slice(0, 1)) {
    out.push({ tone: 'good', title: `${s.name} acima da meta`, text: `${pct(s.real)} contra meta de ${pct(s.meta)}. Mantenha o processo e use como referência para a equipe.` });
  }

  // 6) Comparação
  const p = input.previous;
  if (p && p.faturamento > 0) {
    const d = rate(a.faturamento - p.faturamento, p.faturamento);
    out.push({
      tone: d >= 0 ? 'good' : 'warning',
      title: `Comparado ao ${input.previousLabel ?? 'período anterior'}`,
      text: `Faturamento ${d >= 0 ? '+' : ''}${pct(d)} (${brl(p.faturamento)} → ${brl(a.faturamento)}); vendas ${p.vendas} → ${a.vendas}; leads ${p.leads} → ${a.leads}.`,
    });
  }

  const order: Record<InsightTone, number> = { critical: 0, warning: 1, good: 2 };
  return out.sort((x, y) => order[x.tone] - order[y.tone]);
}
