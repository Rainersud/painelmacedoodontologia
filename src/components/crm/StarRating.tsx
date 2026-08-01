import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** 1 = vermelho, 2 = amarelo escuro, 3 = verde escuro */
const RATING_COLORS: Record<number, string> = {
  1: 'text-red-600 fill-red-600',
  2: 'text-yellow-600 fill-yellow-600',
  3: 'text-green-700 fill-green-700',
};

export function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const sizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const current = Math.min(Math.max(Number(rating) || 0, 0), 3);
  const activeColor = RATING_COLORS[current] ?? '';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onChange && !readonly) {
              onChange(star === current ? 0 : star);
            }
          }}
          className={cn(
            'transition-transform',
            !readonly && 'hover:scale-125 cursor-pointer',
            readonly && 'cursor-default',
          )}
        >
          <Star
            className={cn(
              sizes[size],
              star <= current
                ? activeColor
                : 'fill-muted text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}
