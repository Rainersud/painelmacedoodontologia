// Níveis do programa de recompensas (5, 10 e 15 indicações) com prêmio em R$.
// Usado na ficha de triagem e na aba Indicação — mesma regra nos dois lugares.
import { useState } from 'react';
import { CheckCircle2, Gift, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/crm/CurrencyInput';
import { useAuth } from '@/contexts/AuthContext';
import { REWARD_TIERS, formatPrize, prizeEarned, useReferralPrizes, useSaveReferralPrize } from '@/lib/referralRewards';

export function RewardTiers({ totalReferrals }: { totalReferrals: number }) {
  const { isAdmin } = useAuth();
  const { data: prizes = {} } = useReferralPrizes();
  const savePrize = useSaveReferralPrize();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(0);
  const earned = prizeEarned(totalReferrals, prizes);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {REWARD_TIERS.map(tier => {
          const unlocked = totalReferrals >= tier.count;
          const prize = prizes[tier.prizeKey] || 0;
          return (
            <div
              key={tier.count}
              className={`rounded-lg border p-2.5 ${unlocked ? `${tier.border} ${tier.bg}` : 'border-border bg-muted/30'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${unlocked ? tier.color : 'text-muted-foreground'}`}>
                  {tier.count} indicações
                </span>
                {unlocked && <CheckCircle2 className={`h-3.5 w-3.5 ${tier.color}`} aria-label="Nível desbloqueado" />}
              </div>
              <ul className="space-y-0.5">
                {tier.perks.map(p => (
                  <li key={p} className="text-[11px] text-muted-foreground leading-tight">{p}</li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t border-border/70">
                {editing === tier.prizeKey ? (
                  <div className="flex items-center gap-1">
                    <CurrencyInput value={draft} onChange={setDraft} className="h-7 text-xs" placeholder="R$ 0,00" />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={savePrize.isPending}
                      onClick={() => savePrize.mutate({ key: tier.prizeKey, value: draft }, { onSuccess: () => setEditing(null) })}
                    >
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px]">
                      Prêmio em R$: <span className="font-semibold">{formatPrize(prize)}</span>
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                        aria-label={`Editar prêmio de ${tier.count} indicações`}
                        onClick={() => { setDraft(prize); setEditing(tier.prizeKey); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {earned > 0 && (
        <p className="flex items-center gap-2 text-xs pt-1">
          <Gift className="h-4 w-4 text-warning-strong" aria-hidden />
          Prêmio conquistado: <strong>{formatPrize(earned)}</strong>
        </p>
      )}
    </div>
  );
}
