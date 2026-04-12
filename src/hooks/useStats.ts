import { useState, useCallback } from 'react';
import { loadStats, resetStats } from '../utils/stats';
import type { StatsStore } from '../utils/stats';

interface UseStatsReturn {
  store: StatsStore;
  reload: () => void;
  reset: () => void;
}

export function useStats(): UseStatsReturn {
  const [store, setStore] = useState<StatsStore>(loadStats);

  const reload = useCallback(() => {
    setStore(loadStats());
  }, []);

  const reset = useCallback(() => {
    resetStats();
    setStore(loadStats());
  }, []);

  return { store, reload, reset };
}
