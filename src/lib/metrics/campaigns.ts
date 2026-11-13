// ROI por campanha: cada lead pode ser marcado com a campanha de onde veio (leads.campaign).
// Leads, agendamentos, comparecimentos, vendas e faturamento saem dos leads marcados (regra única);
// o investimento vem do Funil de Tráfego (ad_creatives), casado pelo nome da campanha.
// Campanhas do Funil de Tráfego sem nenhum lead marcado continuam mostrando o que foi digitado lá.
import { inRange, type DateRange } from './period';
import {
  attendances, bookedAppointments, newLeads, safeDiv, sales,
  type AppointmentRow, type LeadRow, type PaymentRow,
} from './rules';
import { leadOrigin } from './stages';

export const NO_CAMPAIGN = 'Sem campanha';
const PAID = new Set(['facebook', 'instagram', 'google']);

export interface CampaignAd {
  name: string;
  investment: number | string | null;
  revenue?: number | string | null;
  sales?: number | null;
}

export interface CampaignRow {
  name: string;
  investimento: number;
  receita: number;
  vendas: number;
  leads: number;
  agendamentos: number;
  comparecimentos: number;
  /** true = números digitados no Funil de Tráfego (nenhum lead marcado com esta campanha). */
  digitado: boolean;
}

/** Normaliza o nome para casar "Black Friday " com "black friday". */
export const campaignKey = (name: string | null | undefined) =>
  (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function campaignBreakdown(
  leads: (LeadRow & { campaign?: string | null })[],
  appointments: AppointmentRow[],
  payments: PaymentRow[],
  ads: CampaignAd[],
  range: DateRange,
): CampaignRow[] {
  const byId = new Map(leads.map(l => [l.id, l]));
  const rows = new Map<string, CampaignRow>();
  const row = (key: string, name: string) => {
    let r = rows.get(key);
    if (!r) {
      r = { name, investimento: 0, receita: 0, vendas: 0, leads: 0, agendamentos: 0, comparecimentos: 0, digitado: false };
      rows.set(key, r);
    }
    return r;
  };

  // Lead sem campanha só entra em "Sem campanha" se veio de origem paga (é o que falta marcar)
  const target = (l: (LeadRow & { campaign?: string | null }) | undefined) => {
    if (!l) return null;
    const k = campaignKey(l.campaign);
    if (k) return { key: k, name: l.campaign!.trim() };
    return PAID.has(leadOrigin(l)) ? { key: '__none__', name: NO_CAMPAIGN } : null;
  };
  const viaLead = (id?: string | null) => target(id ? byId.get(id) : undefined);

  newLeads(leads, range).forEach(l => { const t = target(l); if (t) row(t.key, t.name).leads += 1; });
  bookedAppointments(appointments, range).forEach(a => { const t = viaLead(a.lead_id); if (t) row(t.key, t.name).agendamentos += 1; });
  attendances(appointments, range).forEach(a => { const t = viaLead(a.lead_id); if (t) row(t.key, t.name).comparecimentos += 1; });
  sales(leads, range).forEach(l => { const t = target(l); if (t) row(t.key, t.name).vendas += 1; });
  payments
    .filter(p => p.status === 'pago' && inRange(p.paid_at, range))
    .forEach(p => { const t = viaLead(p.lead_id); if (t) row(t.key, t.name).receita += Number(p.net_value || 0); });

  for (const ad of ads) {
    const key = campaignKey(ad.name);
    if (!key) continue;
    const existing = rows.get(key);
    if (existing) {
      existing.name = ad.name.trim(); // nome como está no Funil de Tráfego
      existing.investimento += Number(ad.investment || 0);
    } else {
      rows.set(key, {
        name: ad.name.trim(),
        investimento: Number(ad.investment || 0),
        receita: Number(ad.revenue || 0),
        vendas: Number(ad.sales || 0),
        leads: 0, agendamentos: 0, comparecimentos: 0,
        digitado: true,
      });
    }
  }

  return [...rows.values()].sort((a, b) =>
    (a.name === NO_CAMPAIGN ? 1 : 0) - (b.name === NO_CAMPAIGN ? 1 : 0) ||
    safeDiv(b.receita, b.investimento || 1) - safeDiv(a.receita, a.investimento || 1) ||
    b.leads - a.leads);
}

/** Campanhas já usadas (para sugerir na ficha do lead), sem repetir. */
export function campaignSuggestions(names: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const k = campaignKey(n);
    if (k && !seen.has(k)) seen.set(k, n!.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
