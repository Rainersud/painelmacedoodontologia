// Depois de salvar um lead, consulta ou pagamento, todas as telas abertas
// precisam recalcular — Dashboard, metas, call center, BI, relatórios.
// Recarrega só as consultas que estão na tela (as demais ficam marcadas como velhas).
import type { QueryClient } from '@tanstack/react-query';

/** Consultas que não dependem dos dados do funil (perfil, permissões, configurações). */
const STABLE = new Set(['managed-users', 'user-role', 'permissions', 'user-permissions', 'profile', 'profiles', 'business-calendar', 'clinic-holidays', 'working-days-mask']);

export function refreshBusinessData(queryClient: QueryClient) {
  clearMetricsCacheHook?.();
  return queryClient.invalidateQueries({
    predicate: (q) => !STABLE.has(String(q.queryKey[0])),
  });
}

/** Versão com espera, para eventos em tempo real que chegam em rajadas. */
let timer: ReturnType<typeof setTimeout> | undefined;
export function refreshBusinessDataSoon(queryClient: QueryClient, delayMs = 800) {
  clearTimeout(timer);
  timer = setTimeout(() => { void refreshBusinessData(queryClient); }, delayMs);
}

/**
 * Depois de mudar metas, bônus, prêmios ou o calendário de dias úteis:
 * recalcula TUDO, inclusive o calendário (que fica fora da atualização comum).
 */
export function refreshAfterSettingsChange(queryClient: QueryClient) {
  clearMetricsCacheHook?.();
  return queryClient.invalidateQueries({
    predicate: (q) => !['user-role', 'permissions', 'user-permissions', 'profile', 'managed-users'].includes(String(q.queryKey[0])),
  });
}

/** A camada de indicadores registra aqui como limpar seu cache (evita import circular). */
let clearMetricsCacheHook: (() => void) | undefined;
export function registerMetricsCacheClear(fn: () => void) { clearMetricsCacheHook = fn; }
