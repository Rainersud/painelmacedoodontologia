import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';

/**
 * Tela que pode abrir sozinha (com menu e cabeçalho) ou dentro de outra tela,
 * como as abas do CRC (Follow Up, Remarketing, Retorno, Indicações, Crédito Liberado).
 */
export function PageShell({ embedded, title, children }: { embedded?: boolean; title: string; children: ReactNode }) {
  if (embedded) return <>{children}</>;
  return <AppLayout title={title}>{children}</AppLayout>;
}
