// Acessos por pessoa (pedido do Rainer em 15/11/2026).
//
// - Admin: tudo.
// - "atendimento" (Ariane): todo o sistema e trabalha nos leads, menos as colunas
//   "Compareceu" e "Não compareceu" do Comercial 1.
// - "comparecimento" (Lidiane): só as colunas "Compareceu" e "Não compareceu" do Comercial 1;
//   faz as tarefas e anotações desses leads e pode mandá-los para outra etapa, sem editar o card.
// - Quem não é admin só VISUALIZA: financeiro (orçamento, pagamentos, custos, criativos),
//   metas e regras; a administração (Configurações) fica oculta.
//
// O bloqueio é na tela e nas ações (mutações); a trava no banco vem numa etapa seguinte.

export type Perfil = 'pendente' | 'completo' | 'atendimento' | 'comparecimento';

export const PERFIL_LABELS: Record<Perfil, string> = {
  pendente: 'Aguardando liberação (sem acesso)',
  completo: 'Completo (sem financeiro e metas)',
  atendimento: 'Atendimento — sem Compareceu / Não compareceu',
  comparecimento: 'Comparecimento — Agendado, Compareceu e Não compareceu',
};

/** Colunas do Comercial 1 que separam os dois perfis. */
export const COMPARECIMENTO_STATUSES = ['compareceu', 'faltou'] as const;
/** Lidiane também trabalha o Agendado: é de lá que ela move para Compareceu / Não compareceu. */
export const COMPARECIMENTO_WORK_STATUSES = ['agendou', 'compareceu', 'faltou'] as const;

export interface Access {
  perfil: Perfil | 'admin';
  /** conta criada pelo link, ainda sem acesso liberado */
  pending: boolean;
  isAdmin: boolean;
  /** lançar orçamento, pagamentos, custos, criativos, valor de venda */
  canFinance: boolean;
  /** editar metas, taxas, regras de bônus */
  canEditGoals: boolean;
  /** ver e usar Configurações */
  canAdmin: boolean;
  /** editar os dados do card do lead (nome, telefone, origem, clínica…) */
  canEditLeadData: boolean;
  /** colunas do Comercial 1 bloqueadas (em preto e branco) */
  lockedStatuses: string[];
  /** se definido, só estas colunas do Comercial 1 ficam liberadas */
  onlyStatuses: string[] | null;
  /** telas liberadas (null = todas) */
  allowedPaths: string[] | null;
}

export function buildAccess(isAdmin: boolean, perfil: Perfil | null): Access {
  if (isAdmin) {
    return {
      perfil: 'admin', pending: false, isAdmin: true, canFinance: true, canEditGoals: true, canAdmin: true,
      canEditLeadData: true, lockedStatuses: [], onlyStatuses: null, allowedPaths: null,
    };
  }
  const p: Perfil = perfil ?? 'pendente';
  const base = { pending: false, isAdmin: false, canFinance: false, canEditGoals: false, canAdmin: false } as const;
  if (p === 'pendente') {
    return {
      ...base, pending: true, perfil: p, canEditLeadData: false,
      lockedStatuses: [], onlyStatuses: [], allowedPaths: [],
    };
  }
  if (p === 'comparecimento') {
    return {
      ...base, perfil: p, canEditLeadData: false,
      lockedStatuses: [], onlyStatuses: [...COMPARECIMENTO_WORK_STATUSES], allowedPaths: ['/funil', '/perfil'],
    };
  }
  return {
    ...base, perfil: p, canEditLeadData: true,
    lockedStatuses: p === 'atendimento' ? [...COMPARECIMENTO_STATUSES] : [],
    onlyStatuses: null, allowedPaths: null,
  };
}

/** A coluna/etapa do Comercial 1 está liberada para este acesso? */
export function canWorkStatus(access: Access, status: string): boolean {
  if (access.onlyStatuses) return access.onlyStatuses.includes(status);
  return !access.lockedStatuses.includes(status);
}

/** A tela está liberada? (/ e páginas internas seguem o prefixo) */
export function canOpenPath(access: Access, pathname: string): boolean {
  if (!access.allowedPaths) {
    return access.canAdmin || !pathname.startsWith('/configuracoes');
  }
  return access.allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

// ---- trava nas ações (mesmo que algum botão fique visível, a ação é recusada) ----

let current: Access = buildAccess(false, null);
/** Chamado pelo AuthContext sempre que o acesso muda. */
export function setCurrentAccess(a: Access) { current = a; }
export function getCurrentAccess() { return current; }

export class AccessDeniedError extends Error {
  constructor(what: string) {
    super(`Seu acesso permite só visualizar ${what}. Peça ao administrador.`);
    this.name = 'AccessDeniedError';
  }
}
export function assertFinance(what = 'o financeiro') {
  if (!current.canFinance) throw new AccessDeniedError(what);
}
export function assertGoals(what = 'as metas') {
  if (!current.canEditGoals) throw new AccessDeniedError(what);
}
