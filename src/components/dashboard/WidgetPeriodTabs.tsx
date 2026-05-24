import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardPeriod } from './PeriodFilterContext';

type Variant = 'day-week-month' | 'week-month-year';

interface Props {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
  size?: 'sm' | 'xs';
  variant?: Variant;
}

export function WidgetPeriodTabs({ value, onChange, size = 'xs', variant = 'day-week-month' }: Props) {
  const h = size === 'xs' ? 'h-7' : 'h-8';
  const t = size === 'xs' ? 'h-5 text-[11px] px-2.5' : 'h-6 text-xs px-3';
  const items: { v: DashboardPeriod; label: string }[] =
    variant === 'week-month-year'
      ? [
          { v: 'semana', label: 'Semana' },
          { v: 'mes', label: 'Mês' },
          { v: 'ano', label: 'Ano' },
        ]
      : [
          { v: 'hoje', label: 'Dia' },
          { v: 'semana', label: 'Semana' },
          { v: 'mes', label: 'Mês' },
        ];
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DashboardPeriod)}>
      <TabsList className={h}>
        {items.map((it) => (
          <TabsTrigger key={it.v} value={it.v} className={t}>{it.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
