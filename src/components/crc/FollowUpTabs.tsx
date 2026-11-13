import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Troca entre o funil de Follow Up (D1…D14) e o CRC, na mesma página. */
export function FollowUpTabs({ active }: { active: 'funil' | 'crc' }) {
  const tab = (key: 'funil' | 'crc', to: string, label: string) => (
    <Link
      to={to}
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav className="inline-flex rounded-lg bg-muted p-1 gap-1" aria-label="Follow Up">
      {tab('funil', '/follow-up', 'Follow Up')}
      {tab('crc', '/follow-up?aba=crc', 'CRC')}
    </nav>
  );
}
