// Mensagens de erro que dizem o que aconteceu e o que fazer.
// O Supabase devolve códigos do Postgres/PostgREST; aqui viram texto para a equipe.

interface DbError { code?: string; message?: string; details?: string; hint?: string }

export function describeError(err: unknown): string {
  const e = (err ?? {}) as DbError;
  const msg = String(e.message ?? err ?? '');
  if (/failed to fetch|network|load failed|timeout/i.test(msg)) {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  }
  switch (e.code) {
    case '42501':
    case 'PGRST301':
      return 'Sem permissão para salvar. Entre de novo no painel ou peça acesso ao administrador.';
    case '23505':
      return 'Já existe um registro igual a este.';
    case '23503':
      return 'O registro ligado a este (lead, paciente ou atendente) não existe mais.';
    case '23502':
      return `Falta preencher um campo obrigatório${e.details ? ` (${e.details})` : ''}.`;
    case '22P02':
      return `Valor inválido: ${e.message ?? ''}`.trim();
    case 'PGRST204':
      return 'O banco não tem um dos campos enviados. Avise o suporte técnico.';
  }
  return msg ? `Erro: ${msg}` : 'Não foi possível salvar. Tente de novo.';
}
