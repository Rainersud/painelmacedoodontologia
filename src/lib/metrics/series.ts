// Séries para os mini gráficos em curva: o período cortado em dias (até ~2 meses) ou meses.
// Contagens = o que aconteceu em cada parte; taxas e médias = acumulado até aquela parte
// (curva estável, que termina exatamente no número mostrado no card).
import { eachDayOfInterval, eachMonthOfInterval, endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns';
import { leadOrigin } from './stages';
import { summarize, type MetricsInput } from './rules';
import type { DateRange } from './period';

export type SeriesKey =
  | 'leads' | 'agendamentos' | 'comparecimentos' | 'vendas' | 'faturamento' | 'investimento'
  | 'ticket' | 'taxaAgendamento' | 'taxaComparecimento' | 'taxaFechamento' | 'conversao'
  | 'cac' | 'cpl' | 'roi' | 'roas'
  | 'prospeccao_ativa' | 'indicacao_parceria' | 'social_selling' | 'indicacao_pac' | 'resgate'
  | 'facebook' | 'instagram' | 'google' | 'passou_na_frente';

export type MetricSeries = Record<SeriesKey, number[]> & { labels: string[] };

export function seriesParts(range: DateRange) {
  const days = (range.end.getTime() - range.start.getTime()) / 86400000;
  return days <= 62
    ? eachDayOfInterval(range).map(d => ({ start: startOfDay(d), end: endOfDay(d) }))
    : eachMonthOfInterval(range).map(m => ({
      start: m < range.start ? range.start : startOfMonth(m),
      end: endOfMonth(m) > range.end ? range.end : endOfMonth(m),
    }));
}

export function metricSeries(input: MetricsInput, range: DateRange, now = new Date()): MetricSeries {
  // partes que já aconteceram (o futuro não entra na curva)
  const parts = seriesParts(range).filter(p => p.start <= now);
  const out = { labels: [] as string[] } as MetricSeries;
  const push = (k: SeriesKey, v: number) => { ((out[k] ??= []) as number[]).push(Math.round(v * 100) / 100); };
  parts.forEach(p => {
    const m = summarize(input, p);
    const acc = summarize(input, { start: range.start, end: p.end });
    out.labels.push(p.start.toISOString());
    push('leads', m.newLeads);
    push('agendamentos', m.booked);
    push('comparecimentos', m.attendances);
    push('vendas', m.sales);
    push('faturamento', m.revenue);
    push('investimento', m.investment);
    push('ticket', acc.averageTicket);
    push('taxaAgendamento', acc.bookingRate);
    push('taxaComparecimento', acc.attendanceRate);
    push('taxaFechamento', acc.closingRate);
    push('conversao', acc.conversionRate);
    push('cac', acc.cac);
    push('cpl', acc.cpl);
    push('roi', acc.roi);
    push('roas', acc.roas);
    const created = input.leads.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t >= p.start.getTime() && t <= p.end.getTime();
    });
    (['prospeccao_ativa', 'indicacao_parceria', 'social_selling', 'indicacao_pac', 'resgate', 'facebook', 'instagram', 'google', 'passou_na_frente'] as const)
      .forEach(o => push(o, created.filter(l => leadOrigin(l) === o).length));
  });
  return out;
}
