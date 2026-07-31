/**
 * Utilitários de sanitização — proteção contra XSS.
 *
 * Regra: qualquer dado vindo do usuário/banco que for interpolado em HTML
 * (window.open + document.write, templates de impressão, etc.) DEVE passar
 * por `escapeHtml`. Qualquer URL vinda do usuário DEVE passar por `safeUrl`.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/** Escapa caracteres perigosos para interpolação segura em HTML. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'/]/g, (c) => HTML_ESCAPE_MAP[c]);
}

/** Escapa e aplica fallback quando o valor está vazio. */
export function esc(value: unknown, fallback = '-'): string {
  const str = value === null || value === undefined ? '' : String(value).trim();
  return str ? escapeHtml(str) : fallback;
}

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Valida uma URL fornecida pelo usuário, bloqueando esquemas perigosos
 * (`javascript:`, `data:`, `vbscript:`). Retorna `undefined` se for insegura.
 */
export function safeUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  // URLs relativas do próprio app são seguras
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return SAFE_PROTOCOLS.includes(parsed.protocol.toLowerCase()) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/** `true` quando a URL é aceitável para salvar num campo de link (http/https). */
export function isValidHttpUrl(url: unknown): boolean {
  const safe = safeUrl(url);
  return !!safe && /^https?:/i.test(safe);
}
