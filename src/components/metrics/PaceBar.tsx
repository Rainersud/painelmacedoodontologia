// Régua de ritmo: quanto da meta já foi feito e onde deveria estar hoje.
import { cn } from '@/lib/utils';
import { STATUS, type GoalStatusKey } from './status';

interface PaceBarProps {
  /** % da meta do período já atingido (pode passar de 100) */
  percentage: number;
  /** % que já deveria ter sido atingido até agora; sem ele, a régua não aparece */
  expected?: number;
  status: GoalStatusKey;
  className?: string;
}

export function PaceBar({ percentage, expected, status, className }: PaceBarProps) {
  const done = Math.max(0, Math.min(100, percentage));
  const pace = expected === undefined ? undefined : Math.max(0, Math.min(100, expected));
  const label = pace === undefined
    ? `${Math.round(percentage)}% da meta`
    : `${Math.round(percentage)}% da meta; o esperado até hoje é ${pace}%`;

  return (
    <div className={cn('relative pt-1', className)}>
      <div
        className="relative h-2 rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(done)}
        aria-label={label}
        title={label}
      >
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', STATUS[status].fill)}
          style={{ width: `${done}%` }}
        />
      </div>
      {pace !== undefined && (
        <div
          className="absolute top-0 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${pace}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}
