import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardPeriod } from './PeriodFilterContext';

interface Props {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
  size?: 'sm' | 'xs';
}

export function WidgetPeriodTabs({ value, onChange, size = 'xs' }: Props) {
  const h = size === 'xs' ? 'h-7' : 'h-8';
  const t = size === 'xs' ? 'h-5 text-[11px] px-2.5' : 'h-6 text-xs px-3';
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DashboardPeriod)}>
      <TabsList className={h}>
        <TabsTrigger value="hoje" className={t}>Dia</TabsTrigger>
        <TabsTrigger value="semana" className={t}>Semana</TabsTrigger>
        <TabsTrigger value="mes" className={t}>Mês</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
