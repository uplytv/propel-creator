import { useQuery } from '@tanstack/react-query';
import { fetchChartTracks, type ChartFilters } from '../lib/musicQueries';

export function useChartTracks(filters: ChartFilters = {}, limit = 20) {
  return useQuery({
    queryKey: [
      'music',
      'chart',
      filters.genres?.join(',') ?? 'all',
      filters.windowDays ?? 'all',
      limit,
    ],
    queryFn: () => fetchChartTracks(filters, limit),
    staleTime: 10 * 60 * 1000,
  });
}
