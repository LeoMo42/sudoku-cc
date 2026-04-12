import { useState, useCallback } from 'react';
import {
  getDailyInfo,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStreak,
} from '../utils/dailyPuzzle';
import type { DailyInfo } from '../utils/dailyPuzzle';

export interface UseDailyReturn {
  dailyInfo: DailyInfo;
  isCompleted: boolean;
  streak: { current: number; best: number };
  markCompleted: (date: string) => void;
}

export function useDaily(): UseDailyReturn {
  const [dailyInfo] = useState<DailyInfo>(() => getDailyInfo());
  const [isCompleted, setIsCompleted] = useState<boolean>(() => isDailyCompleted());
  const [streak, setStreak] = useState<{ current: number; best: number }>(() => getDailyStreak());

  // Accept the puzzle's date string so completion is recorded against the day
  // the puzzle was started, not the wall-clock time at solve (midnight-spanning fix).
  const markCompleted = useCallback((date: string) => {
    recordDailyCompletion(new Date(date));
    setIsCompleted(true);
    setStreak(getDailyStreak());
  }, []);

  return { dailyInfo, isCompleted, streak, markCompleted };
}
