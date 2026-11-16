import { useQuery } from '@tanstack/react-query';
import { usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { fetchMetricsData, metricSeries, type DateRange, type MetricSeries } from '@/lib/metrics';

/** Séries diárias (ou mensais) dos indicadores no período — por padrão, o do filtro de data global. */
export function useMetricSeries(rangeOverride?: DateRange) {
  const { range: g } = usePeriodFilter();
  const range = rangeOverride ?? { start: g.start, end: g.end };
  return useQuery({
    queryKey: ['metric-series', range.start.toISOString(), range.end.toISOString()],
    refetchInterval: 60_000,
    queryFn: async (): Promise<MetricSeries> => metricSeries(await fetchMetricsData(range), range),
  });
}
