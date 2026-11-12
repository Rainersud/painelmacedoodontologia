// Utilities to display dates/times in Brasília timezone (America/Sao_Paulo).
import { format as fnsFormat, formatDistanceToNow as fnsDistance } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const BR_TZ = 'America/Sao_Paulo';

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** Format a date in Brasília timezone using date-fns tokens. */
export function formatBR(input: Date | string | number, pattern: string): string {
  return fnsFormat(toZonedTime(toDate(input), BR_TZ), pattern, { locale: ptBR });
}

/** Relative distance ("há 5 min") — instant difference is timezone-agnostic, kept for consistency. */
export function distanceBR(input: Date | string | number, opts: { addSuffix?: boolean } = { addSuffix: true }) {
  return fnsDistance(toDate(input), { addSuffix: opts.addSuffix, locale: ptBR });
}

/** Intl-based formatter forced to Brasília timezone. */
export function intlBR(
  input: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' },
): string {
  return toDate(input).toLocaleString('pt-BR', { timeZone: BR_TZ, ...opts });
}

export function intlDateBR(input: Date | string | number, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }): string {
  return toDate(input).toLocaleDateString('pt-BR', { timeZone: BR_TZ, ...opts });
}

export function intlTimeBR(input: Date | string | number, opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }): string {
  return toDate(input).toLocaleTimeString('pt-BR', { timeZone: BR_TZ, ...opts });
}

/**
 * Valor para <input type="datetime-local"> no horário LOCAL (Brasília).
 * Não use toISOString().slice(0,16): ele dá o horário UTC (3h a mais) e,
 * ao salvar de novo, a data anda 3 horas.
 */
export function toLocalInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
