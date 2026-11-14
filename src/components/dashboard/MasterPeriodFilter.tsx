import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeriodFilter, type CompareYears } from './PeriodFilterContext';
import { WidgetPeriodTabs } from './WidgetPeriodTabs';

/**
 * Filtro único da tela (Dia / Semana / Mês / Ano) e a comparação: período anterior ou
 * o mesmo período de anos anteriores. Todos os blocos da tela seguem este filtro.
 */
export function MasterPeriodFilter() {
  const { period, setPeriod, range, customRange, setCustomRange, compareYears, setCompareYears } = usePeriodFilter();
  const year = range.start.getFullYear();

  const subtitle =
    `${format(range.start, "dd 'de' MMM", { locale: ptBR })} – ${format(range.end, "dd 'de' MMM yyyy", { locale: ptBR })}`;
  const prevSubtitle =
    `${format(range.prevStart, "dd/MM/yy", { locale: ptBR })} – ${format(range.prevEnd, "dd/MM/yy", { locale: ptBR })}`;

  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <CalendarRange className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{range.label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {subtitle} · comparando com {range.prevLabel} ({prevSubtitle})
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <WidgetPeriodTabs
          master
          value={period}
          onChange={setPeriod}
          size="sm"
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
        <Select value={String(compareYears)} onValueChange={v => setCompareYears(Number(v) as CompareYears)}>
          <SelectTrigger className="h-8 w-[210px] text-xs" aria-label="Comparar com">
            <span className="text-muted-foreground mr-1">Comparar com:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Período anterior</SelectItem>
            <SelectItem value="1">Mesmo período de {year - 1}</SelectItem>
            <SelectItem value="2">Mesmo período de {year - 2}</SelectItem>
            <SelectItem value="3">Mesmo período de {year - 3}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
