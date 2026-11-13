// O banco devolve no máximo 1.000 linhas por consulta. Listas que podem passar disso
// (pagamentos, retornos, alertas, indicações, recompras) são buscadas em páginas.
// Sem isso, a tela mostrava só as primeiras 1.000 linhas e os totais ficavam menores, sem aviso.

interface RangeQuery<T> {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
}

const PAGE = 1000;

/** Executa a consulta página por página e junta tudo. Use uma consulta com .order(). */
export async function allPages<T>(query: RangeQuery<T>): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    if (from > 200_000) break; // trava de segurança
  }
  return { data: out, error: null };
}
