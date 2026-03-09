import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types/crm';

interface ReferralTagsProps {
  isReferred: boolean;
  isReferrer: boolean;
  hasDiscount: boolean;
  attendanceDiscountApplied?: boolean;
  leadStatus: string;
  compact?: boolean;
}

export function ReferralTags({
  isReferred,
  isReferrer,
  hasDiscount,
  attendanceDiscountApplied,
  leadStatus,
  compact = true,
}: ReferralTagsProps) {
  const tags: { label: string; className: string }[] = [];

  if (isReferred) {
    tags.push({ label: '🟢 Indicado', className: 'bg-primary/10 text-primary border-0' });
  }
  if (isReferrer) {
    tags.push({ label: '🎁 Indicador', className: 'bg-warning/10 text-warning border-0' });
  }
  if (hasDiscount) {
    tags.push({ label: '💰 Desconto', className: 'bg-success/10 text-success border-0' });
  }
  if (leadStatus === 'compareceu' && attendanceDiscountApplied) {
    tags.push({ label: '📅 +5%', className: 'bg-success/10 text-success border-0' });
  }
  if (leadStatus === 'faltou') {
    tags.push({ label: '⚠️ Sem benefício', className: 'bg-destructive/10 text-destructive border-0' });
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <Badge key={i} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${tag.className}`}>
          {tag.label}
        </Badge>
      ))}
    </div>
  );
}
