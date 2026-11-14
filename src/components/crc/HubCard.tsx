import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HubCardProps {
  icon: LucideIcon;
  label: string;
  /** Explica quem entra nesse card (aparece no ícone de informação). */
  rule: string;
  count: number | null;
  caption: string;
  onClick: () => void;
}

/** Card da tela única do CRC: mesmo visual para quadros e telas de acompanhamento. */
export function HubCard({ icon: Icon, label, rule, count, caption, onClick }: HubCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="monday-card group relative flex flex-col justify-start text-left p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="img"
              aria-label={`Quem entra em ${label}`}
              onClick={e => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <Info className="h-4 w-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{rule}</TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-3 font-semibold leading-snug">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">{count ?? '–'}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
    </button>
  );
}
