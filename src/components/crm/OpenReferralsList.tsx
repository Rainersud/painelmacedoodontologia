import { Gift, Loader2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOpenReferrals } from '@/hooks/useMenuCounts';
import { FUNNEL_STAGES } from '@/types/crm';

const STAGE_LABEL = new Map(FUNNEL_STAGES.map(s => [s.key as string, s.label]));
const LABEL_FIX: Record<string, string> = { potencial: 'Potencial', compareceu: 'Compareceu', faltou: 'Não compareceu', agendou: 'Agendou' };

/** Indicações em aberto: as mesmas pessoas contadas no card e no balãozinho. */
export function OpenReferralsList({ onOpenLead }: { onOpenLead: (leadId: string) => void }) {
  const { data = [], isLoading } = useOpenReferrals();

  return (
    <section className="monday-card p-4" aria-labelledby="open-referrals">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-primary" />
        <h3 id="open-referrals" className="font-semibold">Indicações em aberto</h3>
        <Badge variant="secondary" className="ml-1">{data.length}</Badge>
        <p className="ml-auto text-xs text-muted-foreground">Indicados que ainda não fecharam nem foram perdidos</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma indicação em aberto.</p>
      ) : (
        <ul className="divide-y">
          {data.map(r => {
            const status = r.status ? STAGE_LABEL.get(r.status) ?? LABEL_FIX[r.status] ?? r.status : null;
            return (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  type="button"
                  disabled={!r.leadId}
                  onClick={() => r.leadId && onOpenLead(r.leadId)}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/50 rounded-md px-2 -mx-2 disabled:cursor-default"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.referrerName ? `Indicado por ${r.referrerName}` : 'Chegou por indicação'}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </p>
                  </div>
                  {r.kind === 'triagem' ? (
                    <Badge variant="outline" className="shrink-0 gap-1"><UserPlus className="h-3 w-3" /> Ainda não é lead</Badge>
                  ) : status && (
                    <Badge variant="secondary" className="shrink-0">{status}</Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
