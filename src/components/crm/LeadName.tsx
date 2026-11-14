import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useOpenLead } from '@/contexts/LeadDetailContext';

/** Nome do lead clicável: abre sempre a ficha completa (card raiz), por cima da tela atual. */
export function LeadName({ leadId, children, className }: { leadId: string | null | undefined; children: ReactNode; className?: string }) {
  const openLead = useOpenLead();
  if (!leadId) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); openLead(leadId); }}
      onPointerDown={e => e.stopPropagation()}
      className={cn('text-left hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm', className)}
    >
      {children}
    </button>
  );
}
