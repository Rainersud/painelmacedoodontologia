import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePeriodFilter, type CompareYears, type DashboardPeriod } from '@/components/dashboard/PeriodFilterContext';

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'hoje', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

const SHORT: Record<DashboardPeriod, string> = { hoje: 'Dia', semana: 'Semana', mes: 'Mês', ano: 'Ano' };

/**
 * Filtro de data único do sistema, no canto superior direito. O que for escolhido aqui vale
 * para todas as telas (metas, funis, relatórios, CRC, Comercial 2, incentivo…).
 */
export function GlobalDateFilter() {
  const { period, setPeriod, range, anchor, setAnchor, shift, isCurrent, customRange, setCustomRange, compareYears, setCompareYears } = usePeriodFilter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'periodo' | 'personalizado'>(customRange?.from ? 'personalizado' : 'periodo');
  const custom = !!(customRange?.from && customRange?.to);
  const span = `${format(range.start, 'dd/MM/yy')} – ${format(range.end, 'dd/MM/yy')}`;
  const year = range.start.getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex items-center gap-2 rounded-full border bg-card pl-2 pr-2.5 h-9 shadow-sm transition-colors',
            'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !isCurrent && 'border-primary/50 bg-primary/5',
          )}
          aria-label={`Filtro de data do sistema: ${range.label} (${span}). Alterar`}
        >
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-none text-left">
            <span className="text-[10px] text-muted-foreground hidden sm:block">{custom ? 'Personalizado' : SHORT[period]}</span>
            <span className="text-xs sm:text-[13px] font-semibold max-w-[120px] sm:max-w-[190px] truncate">{range.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[320px] p-0">
        <div className="p-3 space-y-3">
          <div>
            <p className="text-sm font-semibold">Data de todo o sistema</p>
            <p className="text-xs text-muted-foreground">Vale para todas as telas ao mesmo tempo.</p>
          </div>

          <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs" role="tablist" aria-label="Tipo de filtro">
            {(['periodo', 'personalizado'] as const).map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m}
                className={cn('rounded-md py-1.5 font-medium transition-colors', mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => { setMode(m); if (m === 'periodo' && custom) setCustomRange(undefined); }}>
                {m === 'periodo' ? 'Período' : 'Personalizado'}
              </button>
            ))}
          </div>

          {mode === 'periodo' ? (
            <>
              <div className="grid grid-cols-4 gap-1" role="group" aria-label="Período">
                {PERIODS.map(p => (
                  <Button key={p.value} size="sm" variant={period === p.value && !custom ? 'default' : 'outline'} className="h-8 text-xs"
                    aria-pressed={period === p.value && !custom} onClick={() => setPeriod(p.value)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Período anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold">{range.label}</p>
                  <p className="text-[11px] text-muted-foreground">{span}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Próximo período" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Calendar
                mode="single"
                selected={anchor}
                onSelect={d => d && setAnchor(d)}
                locale={ptBR}
                className="rounded-md border p-2 pointer-events-auto mx-auto"
              />
            </>
          ) : (
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={{ from: customRange?.from, to: customRange?.to }}
              onSelect={r => setCustomRange(r?.from ? { from: r.from, to: r.to } : undefined)}
              locale={ptBR}
              className="rounded-md border p-2 pointer-events-auto mx-auto"
            />
          )}

          <Select value={String(compareYears)} onValueChange={v => setCompareYears(Number(v) as CompareYears)}>
            <SelectTrigger className="h-8 text-xs" aria-label="Comparar com">
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
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled={isCurrent && !custom && period === 'mes'}
            onClick={() => { setCustomRange(undefined); setMode('periodo'); setPeriod('mes'); setAnchor(new Date()); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Voltar para este mês
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>Pronto</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
