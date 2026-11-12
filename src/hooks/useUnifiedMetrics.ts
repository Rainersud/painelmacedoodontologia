// Hook único de indicadores: todas as telas devem ler daqui (Fase 2 religa os módulos).
import { useQuery } from '@tanstack/react-query';
import {
  fetchMetricsData, percentChange, summarize,
  type MetricsData, type MetricsPeriod, type MetricsSummary,
} from '@/lib/metrics';

export interface UnifiedMetrics {
  period: MetricsPeriod;
  current: MetricsSummary;
  previous: MetricsSummary;
  /** variação % de cada indicador contra o período anterior */
  change: Record<keyof MetricsSummary, number>;
  data: MetricsData;
}

export function useUnifiedMetrics(period: MetricsPeriod) {
  return useQuery({
    queryKey: ['unified-metrics', period.start.toISOString(), period.end.toISOString()],
    queryFn: async (): Promise<UnifiedMetrics> => {
      const data = await fetchMetricsData({ start: period.previous.start, end: period.end });
      const current = summarize(data, period);
      const previous = summarize(data, period.previous);
      const change = Object.fromEntries(
        (Object.keys(current) as (keyof MetricsSummary)[]).map(k => [k, percentChange(current[k], previous[k])]),
      ) as Record<keyof MetricsSummary, number>;
      return { period, current, previous, change, data };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
