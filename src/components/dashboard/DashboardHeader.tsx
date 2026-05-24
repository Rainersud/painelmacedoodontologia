import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeriodFilter, DashboardPeriod } from './PeriodFilterContext';
import { Sparkles } from 'lucide-react';

export function DashboardHeader() {
  const { period, setPeriod, range } = usePeriodFilter();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-30 bg-background/80 backdrop-blur-md py-2 -mx-2 px-2">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {greeting}!
        </h1>
        <p className="text-sm text-muted-foreground">{range.label} · {range.businessDays} dia{range.businessDays !== 1 ? 's' : ''} útil{range.businessDays !== 1 ? 'eis' : ''} · Visão estratégica em tempo real</p>
      </div>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
        <TabsList className="bg-card border shadow-sm">
          <TabsTrigger value="hoje" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hoje</TabsTrigger>
          <TabsTrigger value="semana" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Semana</TabsTrigger>
          <TabsTrigger value="mes" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mês</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
