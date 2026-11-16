import { useEffect, useState } from 'react';
import { endOfWeek, format, isSameMonth, isSameYear, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePeriodFilter, type CompareYears, type DashboardPeriod } from '@/components/dashboard/PeriodFilterContext';

const PERIODS: { value: DashboardPeriod; label: string; pick: string }[] = [
  { value: 'hoje', label: 'Dia', pick: 'Escolha o dia' },
  { value: 'semana', label: 'Semana', pick: 'Escolha a semana (clique em qualquer dia dela)' },
  { value: 'mes', label: 'Mês', pick: 'Escolha o mês' },
  { value: 'ano', label: 'Ano', pick: 'Escolha o ano' },
];

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const wk = (d: Date) => ({ from: startOfWeek(d, { weekStartsOn: 1 }), to: endOfWeek(d, { weekStartsOn: 1 }) });

/** Nome concreto do período: sempre diz qual dia, semana, mês ou ano está valendo. */
function concreteLabel(period: DashboardPeriod, start: Date, end: Date): string {
  if (period === 'hoje') return cap(format(start, "EEE, dd/MM/yyyy", { locale: ptBR }));
  if (period === 'semana') return `${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}`;
  if (period === 'mes') return cap(format(start, 'MMMM yyyy', { locale: ptBR }));
  return format(start, 'yyyy');
}

/**
 * Filtro de data único do sistema, no canto superior direito. O que for escolhido aqui vale
 * para todas as telas. Ao trocar Dia / Semana / Mês / Ano, é obrigatório escolher qual
 * dia, semana, mês ou ano: nada muda até a escolha ser feita.
 */
export function GlobalDateFilter() {
  const { period, setPeriod, range, anchor, setAnchor, shift, customRange, setCustomRange, compareYears, setCompareYears } = usePeriodFilter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'periodo' | 'personalizado'>(customRange?.from ? 'personalizado' : 'periodo');
  const custom = !!(customRange?.from && customRange?.to);
  // tipo escolhido no popover; enquanto o dia/semana/mês/ano não for escolhido, o filtro não muda
  const [draft, setDraft] = useState<DashboardPeriod>(period);
  const [pending, setPending] = useState(false);
  const [yearNav, setYearNav] = useState(anchor.getFullYear());

  useEffect(() => {
    if (open) { setDraft(period); setPending(false); setYearNav(anchor.getFullYear()); setMode(custom ? 'personalizado' : 'periodo'); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (d: Date) => {
    setCustomRange(undefined);
    if (draft !== period) setPeriod(draft);
    setAnchor(d);
    setPending(false);
  };

  const label = custom ? `${format(range.start, 'dd/MM/yy')} a ${format(range.end, 'dd/MM/yy')}` : concreteLabel(period, range.start, range.end);
  const tipo = custom ? 'Personalizado' : PERIODS.find(p => p.value === period)!.label;
  const year = range.start.getFullYear();
  const showSelection = !pending && !custom && draft === period;
  const anos = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 4 + i);

  return (
    <Popover open={open} onOpenChange={o => { if (!o && pending) setPending(false); setOpen(o); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex items-center gap-2 rounded-full border bg-card pl-2 pr-2.5 h-9 shadow-sm transition-colors',
            'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={`Filtro de data do sistema: ${tipo}, ${label}. Alterar`}
        >
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="flex flex-col items-start leading-none text-left">
            <span className="text-[10px] text-muted-foreground hidden sm:block">{tipo}</span>
            <span className="text-xs sm:text-[13px] font-semibold max-w-[140px] sm:max-w-[200px] truncate">{label}</span>
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
                onClick={() => { setMode(m); setPending(false); }}>
                {m === 'periodo' ? 'Período' : 'Personalizado'}
              </button>
            ))}
          </div>

          {mode === 'periodo' ? (
            <>
              <div className="grid grid-cols-4 gap-1" role="group" aria-label="Tipo de período">
                {PERIODS.map(p => {
                  const active = draft === p.value && (pending || !custom);
                  return (
                    <Button key={p.value} size="sm" variant={active ? 'default' : 'outline'} className="h-8 text-xs"
                      aria-pressed={active}
                      onClick={() => { setDraft(p.value); setPending(true); setYearNav(anchor.getFullYear()); }}>
                      {p.label}
                    </Button>
                  );
                })}
              </div>

              {pending ? (
                <p className="rounded-lg bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-foreground" role="status">
                  {PERIODS.find(p => p.value === draft)!.pick} para aplicar.
                </p>
              ) : !custom && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="flex-1 text-center">
                    <p className="text-[11px] text-muted-foreground">Valendo agora</p>
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Próximo" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}

              {draft === 'hoje' && (
                <Calendar
                  mode="single"
                  selected={showSelection ? anchor : undefined}
                  defaultMonth={anchor}
                  onSelect={d => d && apply(d)}
                  locale={ptBR}
                  className="rounded-md border p-2 pointer-events-auto mx-auto"
                />
              )}
              {draft === 'semana' && (
                <Calendar
                  mode="range"
                  selected={showSelection ? wk(anchor) : undefined}
                  defaultMonth={anchor}
                  onSelect={() => { /* a semana é escolhida no clique do dia */ }}
                  onDayClick={d => apply(d)}
                  weekStartsOn={1}
                  locale={ptBR}
                  className="rounded-md border p-2 pointer-events-auto mx-auto"
                />
              )}
              {draft === 'mes' && (
                <div className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ano anterior" onClick={() => setYearNav(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-semibold">{yearNav}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Próximo ano" onClick={() => setYearNav(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {MESES.map((m, i) => {
                      const d = new Date(yearNav, i, 15);
                      const sel = showSelection && isSameMonth(d, anchor);
                      return (
                        <Button key={m} size="sm" variant={sel ? 'default' : 'ghost'} className="h-9 text-xs" aria-pressed={sel}
                          onClick={() => apply(d)}>
                          {m}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {draft === 'ano' && (
                <div className="grid grid-cols-3 gap-1 rounded-md border p-2">
                  {anos.map(y => {
                    const d = new Date(y, 6, 1);
                    const sel = showSelection && isSameYear(d, anchor);
                    return (
                      <Button key={y} size="sm" variant={sel ? 'default' : 'ghost'} className="h-9 text-xs" aria-pressed={sel} onClick={() => apply(d)}>
                        {y}
                      </Button>
                    );
                  })}
                </div>
              )}
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
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs"
            onClick={() => { setCustomRange(undefined); setMode('periodo'); setPeriod('mes'); setDraft('mes'); setPending(false); setAnchor(new Date()); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Voltar para este mês
          </Button>
          <Button size="sm" className="h-8 text-xs" disabled={pending} onClick={() => setOpen(false)}>
            {pending ? 'Escolha primeiro' : 'Pronto'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
