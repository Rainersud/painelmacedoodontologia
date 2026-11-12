import { Card, CardContent } from '@/components/ui/card';
import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePeriodFilter } from './PeriodFilterContext';
import { WidgetPeriodTabs } from './WidgetPeriodTabs';

/**
 * Calendário mestre da Dashboard. Ao alterar, propaga automaticamente
 * para todos os widgets (que usam useLocalPeriod sincronizado com o
 * PeriodFilterProvider).
 */
export function MasterPeriodFilter() {
  const { period, setPeriod, range, customRange, setCustomRange } = usePeriodFilter();

  const subtitle =
    period === 'ano' && customRange?.from && customRange?.to
      ? `${format(customRange.from, "dd 'de' MMM yyyy", { locale: ptBR })} – ${format(
          customRange.to,
          "dd 'de' MMM yyyy",
          { locale: ptBR },
        )}`
      : `${format(range.start, "dd 'de' MMM", { locale: ptBR })} – ${format(
          range.end,
          "dd 'de' MMM yyyy",
          { locale: ptBR },
        )}`;

  return (
    <Card className="monday-card overflow-hidden border-primary/30">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Período da Dashboard</h3>
            <p className="text-xs text-muted-foreground">
              {range.label} · {subtitle}
            </p>
          </div>
        </div>
        <WidgetPeriodTabs
          value={period}
          onChange={setPeriod}
          size="sm"
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </CardContent>
    </Card>
  );
}
