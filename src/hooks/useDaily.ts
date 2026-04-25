import { useState, useCallback, useEffect } from 'react';
import {
  getDailyInfo,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStreak,
  DAILY_STORAGE_KEY,
} from '../utils/dailyPuzzle';
import type { DailyInfo } from '../utils/dailyPuzzle';

interface UseDailyReturn {
  dailyInfo: DailyInfo;
  isCompleted: boolean;
  streak: { current: number; best: number };
  markCompleted: (date: string) => void;
}

// Milliseconds until the next local midnight. Computed via setDate(+1) +
// setHours(0,0,0,0) which is DST-safe (JS Date arithmetic on local days
// normalizes wall-clock days correctly).
function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  // Clamp to 0 in the unlikely case the system clock jumps past midnight
  // between the `now` capture and this computation.
  return Math.max(0, next.getTime() - now.getTime());
}

export function useDaily(): UseDailyReturn {
  const [dailyInfo, setDailyInfo] = useState<DailyInfo>(() => getDailyInfo());
  const [isCompleted, setIsCompleted] = useState<boolean>(() => isDailyCompleted());
  const [streak, setStreak] = useState<{ current: number; best: number }>(() => getDailyStreak());

  // Refresh state if the local calendar day has rolled over since the
  // last computation. Cheap to call repeatedly — it's a no-op when the
  // dayNumber hasn't changed, so the visibility-change handler can fire
  // it on every focus without triggering useless renders.
  const refreshIfDayChanged = useCallback(() => {
    setDailyInfo(prev => {
      const fresh = getDailyInfo();
      if (fresh.dayNumber === prev.dayNumber) return prev;
      // Day rolled over — also refresh derived state.
      setIsCompleted(isDailyCompleted());
      setStreak(getDailyStreak());
      return fresh;
    });
  }, []);

  useEffect(() => {
    // Schedule a refresh exactly at the next local midnight, then reschedule
    // recursively. setTimeout is more accurate than a 1Hz interval (no drift,
    // no wasted ticks) for a daily boundary.
    let timeoutId: number;
    const scheduleNext = () => {
      timeoutId = window.setTimeout(() => {
        refreshIfDayChanged();
        scheduleNext();
      }, msUntilNextMidnight());
    };
    scheduleNext();

    // Visibility-change safety net: if the system slept past the scheduled
    // midnight (laptop closed overnight), the setTimeout may not fire on
    // wake. When the tab becomes visible we recompute and refresh if the
    // day actually changed. Cheap no-op otherwise.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfDayChanged();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Cross-tab sync (#135): the `storage` event fires in OTHER tabs (not
    // the writer) when localStorage changes. If another tab completed
    // today's daily, this tab's in-memory `isCompleted` and `streak`
    // would diverge from disk truth until reload — leading to stale
    // banner state and the user re-clicking "Play today" on an
    // already-done puzzle. Re-read both on every storage event for our
    // key. We don't refresh dailyInfo from a storage event — dailyInfo
    // is computed from `new Date()`, not localStorage, so it's already
    // self-consistent across tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DAILY_STORAGE_KEY) return;
      setIsCompleted(isDailyCompleted());
      setStreak(getDailyStreak());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshIfDayChanged]);

  // Accept the puzzle's date string so completion is recorded against the
  // day the puzzle was started, not the wall-clock time at solve. This is
  // load-bearing: GameContainer captures dailyInfo.date in a ref AT GAME
  // START so a midnight rollover mid-game doesn't credit the wrong day.
  const markCompleted = useCallback((date: string) => {
    recordDailyCompletion(new Date(date));
    // Re-query rather than setIsCompleted(true) blindly. If the day rolled
    // over while the puzzle was being solved, the user just completed
    // YESTERDAY's puzzle — today's still needs to be playable, so isCompleted
    // for the current dailyInfo should remain false.
    setIsCompleted(isDailyCompleted());
    setStreak(getDailyStreak());
    // Same-day rollover refresh: if dailyInfo is still on the old day, pick
    // up the new one so the banner reflects today's state correctly.
    setDailyInfo(prev => {
      const fresh = getDailyInfo();
      return fresh.dayNumber === prev.dayNumber ? prev : fresh;
    });
  }, []);

  return { dailyInfo, isCompleted, streak, markCompleted };
}
