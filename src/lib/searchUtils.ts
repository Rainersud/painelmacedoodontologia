// Normalize string: lowercase + remove diacritics
export function normalize(s: string): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Returns true if normalized haystack contains all normalized query tokens (any order)
export function fuzzyMatch(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every(t => h.includes(t));
}
