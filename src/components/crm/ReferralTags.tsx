import { Badge } from '@/components/ui/badge';

interface ReferralTagsProps {
  isReferred: boolean;
  isReferrer: boolean;
  hasDiscount: boolean;
  discountValue?: number;
  attendanceDiscountApplied?: boolean;
  leadStatus: string;
  referrerName?: string;
  rewardValue?: number;
  rewardType?: string;
  compact?: boolean;
}

export function ReferralTags({
  isReferred,
  isReferrer,
  hasDiscount,
  discountValue,
  attendanceDiscountApplied,
  leadStatus,
  referrerName,
  rewardValue,
  rewardType,
  compact = true,
}: ReferralTagsProps) {
  const tags: { label: string; className: string }[] = [];

  if (isReferred) {
    tags.push({ label: '🏷️ Indicação', className: 'bg-chart-5/10 text-chart-5 border-0' });
  }
  if (isReferrer) {
    tags.push({ label: '🎁 Indicador', className: 'bg-warning/10 text-warning border-0' });
  }
  if (hasDiscount && discountValue) {
    tags.push({ label: `💰 Desconto: ${discountValue}%`, className: 'bg-success/10 text-success border-0' });
  }
  if (isReferrer && rewardValue && rewardValue > 0) {
    const label = rewardType === 'credito' ? `🎁 Crédito: R$${rewardValue}` : `🎁 Bônus: R$${rewardValue}`;
    tags.push({ label, className: 'bg-chart-4/10 text-chart-4 border-0' });
  }
  if (leadStatus === 'compareceu' && attendanceDiscountApplied) {
    tags.push({ label: '📅 +5%', className: 'bg-success/10 text-success border-0' });
  }
  if (leadStatus === 'faltou') {
    tags.push({ label: '⚠️ Sem benefício', className: 'bg-destructive/10 text-destructive border-0' });
  }

  if (tags.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <Badge key={i} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${tag.className}`}>
            {tag.label}
          </Badge>
        ))}
      </div>
      {isReferred && referrerName && (
        <p className="text-[9px] text-muted-foreground truncate">
          👤 Indicado por: <strong>{referrerName}</strong>
        </p>
      )}
    </div>
  );
}
