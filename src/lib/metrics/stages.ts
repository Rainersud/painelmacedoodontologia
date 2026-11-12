// Etapas e origens do lead com nome único.

/**
 * "agendou" e "consulta_agendada" são a mesma etapa ("Agendado").
 * O Funil (Comercial 1) usa "agendou"; telas antigas ainda gravam "consulta_agendada".
 */
export const STATUS_ALIASES: Record<string, string> = {
  consulta_agendada: 'agendou',
  nao_compareceu: 'faltou',
};

export function normalizeStatus<T extends string | null | undefined>(status: T): T | string {
  if (!status) return status;
  return STATUS_ALIASES[status] ?? status;
}

/** Etapas que só existem depois de uma venda fechada. */
export const SOLD_STATUS_LIST = ['fechado', 'pos_venda', 'tratamento_andamento', 'concluido'] as const;
export const SOLD_STATUSES = new Set<string>(SOLD_STATUS_LIST);

export function isSoldStatus(status: string | null | undefined): boolean {
  return !!status && SOLD_STATUSES.has(status);
}

/** Origem oficial do lead: o campo "Como o lead chegou?" (lead_arrival_source). */
export const ARRIVAL_SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  passou_na_frente: 'Passou na frente',
  indicacao_pac: 'Indicação de paciente',
  prospeccao_ativa: 'Prospecção ativa',
  indicacao_parceria: 'Indicação de parceria',
  social_selling: 'Social selling',
};

export function leadOrigin(lead: { lead_arrival_source?: string | null }): string {
  return lead.lead_arrival_source || 'passou_na_frente';
}

export function leadOriginLabel(lead: { lead_arrival_source?: string | null }): string {
  const key = leadOrigin(lead);
  return ARRIVAL_SOURCE_LABELS[key] ?? key;
}
