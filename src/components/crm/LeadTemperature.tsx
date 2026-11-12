// Temperatura do lead: Frio, Morno ou Quente.
// Guardada no campo interest_rating do lead (1 = Frio, 2 = Morno, 3 = Quente, 0 = sem avaliação).
// Só pode ser escolhida depois que o paciente passou pela consulta (etapa "Compareceu" em diante).
import { Snowflake, ThermometerSun, Flame, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TEMPERATURES: { value: 1 | 2 | 3; label: string; icon: LucideIcon; on: string }[] = [
  { value: 1, label: 'Frio', icon: Snowflake, on: 'bg-chart-2/15 text-chart-2 ring-chart-2/40' },
  { value: 2, label: 'Morno', icon: ThermometerSun, on: 'bg-warning/20 text-warning-strong ring-warning/50' },
  { value: 3, label: 'Quente', icon: Flame, on: 'bg-chart-3/15 text-chart-3 ring-chart-3/40' },
];

/** Etapas em que o paciente já compareceu à consulta. */
const AFTER_ATTENDANCE = new Set([
  'compareceu', 'quase_cliente', 'potencial', 'nao_cliente', 'fechado',
  'pos_venda', 'tratamento_andamento', 'concluido',
]);

export const canRateTemperature = (status?: string | null) => !!status && AFTER_ATTENDANCE.has(status);

export const temperatureOf = (rating?: number | null) =>
  TEMPERATURES.find(t => t.value === Math.round(Number(rating) || 0));

interface LeadTemperatureProps {
  rating: number;
  status?: string | null;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
}

/** Três botões clicáveis. Clicar de novo na temperatura escolhida limpa a escolha. */
export function LeadTemperature({ rating, status, onChange, size = 'sm' }: LeadTemperatureProps) {
  const enabled = canRateTemperature(status) && !!onChange;
  const current = Math.round(Number(rating) || 0);
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      role="radiogroup"
      aria-label="Temperatura do lead"
      className="inline-flex items-center gap-1"
      title={enabled ? 'Temperatura do lead' : 'A temperatura pode ser escolhida depois que o paciente comparecer à consulta'}
    >
      {TEMPERATURES.map(t => {
        const active = current === t.value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!enabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (enabled) onChange?.(active ? 0 : t.value);
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? t.on : 'ring-border text-muted-foreground',
              enabled ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon className={icon} aria-hidden />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ícone pequeno, só leitura, para o cartão do lead no funil. */
export function LeadTemperatureBadge({ rating }: { rating?: number | null }) {
  const t = temperatureOf(rating);
  if (!t) return null;
  const Icon = t.icon;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1', t.on)} title={`Temperatura: ${t.label}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {t.label}
    </span>
  );
}
