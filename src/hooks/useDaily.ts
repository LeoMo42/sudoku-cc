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
  markCompleted: () => void;
}

export function useDaily(): UseDailyReturn {
  const [dailyInfo] = useState<DailyInfo>(() => getDailyInfo());
  const [isCompleted, setIsCompleted] = useState<boolean>(() => isDailyCompleted());
  const [streak, setStreak] = useState<{ current: number; best: number }>(() => getDailyStreak());

  const markCompleted = useCallback(() => {
    recordDailyCompletion();
    setIsCompleted(true);
    setStreak(getDailyStreak());
  }, []);

  return { dailyInfo, isCompleted, streak, markCompleted };
}
