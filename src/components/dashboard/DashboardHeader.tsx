import { usePeriodFilter } from './PeriodFilterContext';
import { Sparkles } from 'lucide-react';

export function DashboardHeader() {
  const { range } = usePeriodFilter();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky top-0 z-30 bg-background/80 backdrop-blur-md py-2 -mx-2 px-2">
      <div>
        <h2 className="text-lg font-semibold">{greeting}!</h2>
        <p className="text-sm text-muted-foreground">{range.label} · Visão estratégica em tempo real</p>
      </div>
    </div>
  );
}
