import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardPeriod, CustomYearRange } from './PeriodFilterContext';
import { cn } from '@/lib/utils';

interface Props {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
  size?: 'sm' | 'xs';
  /** retro-compat: variant agora é ignorado, todos mostram Dia/Semana/Mês/Ano */
  variant?: 'day-week-month' | 'week-month-year';
  customRange?: CustomYearRange;
  onCustomRangeChange?: (r: CustomYearRange | undefined) => void;
}

export function WidgetPeriodTabs({
  value,
  onChange,
  size = 'xs',
  customRange,
  onCustomRangeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const h = size === 'xs' ? 'h-7' : 'h-8';
  const t = size === 'xs' ? 'h-5 text-[11px] px-2.5' : 'h-6 text-xs px-3';

  const items: { v: DashboardPeriod; label: string }[] = [
    { v: 'hoje', label: 'Dia' },
    { v: 'semana', label: 'Semana' },
    { v: 'mes', label: 'Mês' },
    { v: 'ano', label: 'Ano' },
  ];

  const rangeLabel =
    customRange?.from && customRange?.to
      ? `${format(customRange.from, 'dd/MM/yy', { locale: ptBR })} – ${format(
          customRange.to,
          'dd/MM/yy',
          { locale: ptBR },
        )}`
      : 'Selecionar período';

  return (
    <div className="flex items-center gap-1.5">
      <Tabs value={value} onValueChange={(v) => onChange(v as DashboardPeriod)}>
        <TabsList className={h}>
          {items.map((it) => (
            <TabsTrigger key={it.v} value={it.v} className={t}>
              {it.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {value === 'ano' && onCustomRangeChange && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('gap-1.5 px-2', size === 'xs' ? 'h-7 text-[11px]' : 'h-8 text-xs')}
            >
              <CalendarIcon className="h-3 w-3" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              numberOfMonths={2}
              locale={ptBR}
              defaultMonth={customRange?.from}
              selected={{ from: customRange?.from, to: customRange?.to }}
              onSelect={(r: any) => {
                onCustomRangeChange(r ? { from: r.from, to: r.to } : undefined);
                if (r?.from && r?.to) setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
