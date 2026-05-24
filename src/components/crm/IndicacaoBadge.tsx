import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicacaoBadgeProps {
  source?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Tag fixa "Indicação" exibida ao lado do nome do paciente em todo o sistema.
 * Aparece sempre que o lead foi cadastrado via campo de indicação (source === 'indicacao').
 * Não é removida ao mudar de etapa, status ou conversão.
 */
export function IndicacaoBadge({ source, size = 'sm', className }: IndicacaoBadgeProps) {
  if (source !== 'indicacao') return null;

  const sizes = {
    xs: 'text-[9px] h-4 px-1.5 gap-0.5',
    sm: 'text-[10px] h-5 px-2 gap-1',
    md: 'text-xs h-6 px-2.5 gap-1',
  };

  return (
    <Badge
      className={cn(
        'shrink-0 border-0 font-semibold rounded-full',
        'bg-gradient-to-r from-chart-5 to-primary text-white shadow-sm',
        sizes[size],
        className
      )}
      title="Paciente vindo de campanha de indicação"
    >
      <Sparkles className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      Indicação
    </Badge>
  );
}
