import { Badge } from '@/components/ui/badge';

interface PendingBonus {
  referredName: string;
  rewardValue: number;
  referralId: string;
}

interface ReferralTagsProps {
  isReferred: boolean;
  isReferrer: boolean;
  hasDiscount: boolean;
  discountValue?: number;
  discountType?: string;
  attendanceDiscountApplied?: boolean;
  leadStatus: string;
  referrerName?: string;
  rewardValue?: number;
  rewardType?: string;
  pendingBonuses?: PendingBonus[];
  referralCount?: number;
  convertedCount?: number;
  compact?: boolean;
}

export function ReferralTags({
  isReferred,
  isReferrer,
  hasDiscount,
  discountValue,
  discountType,
  attendanceDiscountApplied,
  leadStatus,
  referrerName,
  rewardValue,
  rewardType,
  pendingBonuses = [],
  referralCount = 0,
  convertedCount = 0,
  compact = true,
}: ReferralTagsProps) {
  if (!isReferred && !isReferrer && pendingBonuses.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* === REFERRED LEAD (indicado) === */}
      {isReferred && (
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-chart-5/10 text-chart-5 border-0">
            🏷️ Indicação
          </Badge>
          {referrerName && (
            <p className="text-[9px] text-muted-foreground truncate">
              👤 Indicado por: <strong>{referrerName}</strong>
            </p>
          )}
          {/* Referral discount */}
          {hasDiscount && discountValue && discountValue > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-0">
              🎁 Desconto por indicação: {discountType === 'fixo' ? `R$${discountValue}` : `${discountValue}%`}
            </Badge>
          )}
          {/* Attendance discount */}
          {leadStatus === 'compareceu' && attendanceDiscountApplied && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-0">
              ✔ Compareceu — 🎁 Desconto de comparecimento: 5%
            </Badge>
          )}
          {leadStatus === 'faltou' && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-0">
              ❌ Faltou — Desconto de comparecimento removido
            </Badge>
          )}
        </div>
      )}

      {/* === REFERRER LEAD (indicador) === */}
      {isReferrer && (
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-warning/10 text-warning border-0">
            🎁 Indicador ({referralCount} indicaç{referralCount === 1 ? 'ão' : 'ões'})
          </Badge>
          {convertedCount > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-0">
              ✅ {convertedCount} fecharam tratamento
            </Badge>
          )}
        </div>
      )}

      {/* Pending bonus alerts for referrers */}
      {pendingBonuses.length > 0 && (
        <div className="space-y-0.5">
          {pendingBonuses.map((bonus, i) => (
            <div key={i} className="rounded bg-warning/10 px-1.5 py-0.5 border border-warning/20">
              <p className="text-[9px] text-warning font-medium">
                💰 Bonificação pendente
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                Indicação convertida: {bonus.referredName}
              </p>
              <p className="text-[9px] text-warning font-semibold">
                💰 Bonificação: R${bonus.rewardValue}
              </p>
              <p className="text-[9px] text-muted-foreground">Status: Pendente</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
