interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

interface CacheStatisticsProps {
  cacheStats: CacheStats | null;
}

export const CacheStatistics = React.memo(({ cacheStats }: CacheStatisticsProps) => {
  if (!cacheStats) {
    return (
      <div className="text-xs text-gray-600">
        Loading cache stats...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Hits:</span>
        <span className="font-medium text-green-600">{cacheStats.hits}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Misses:</span>
        <span className="font-medium text-red-600">{cacheStats.misses}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">Hit Rate:</span>
        <span className="font-medium text-blue-600">{cacheStats.hitRate.toFixed(1)}%</span>
      </div>
    </div>
  );
});

CacheStatistics.displayName = 'CacheStatistics';
