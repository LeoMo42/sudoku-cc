import type { DifficultyLevel } from '../types/index';

const BEST_TIMES_KEY = 'sudoku-best-times';

type BestTimes = Partial<Record<DifficultyLevel, number>>;

function loadBestTimes(): BestTimes {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as BestTimes;
  } catch {
    return {};
  }
}

/** Returns the current best completion time (seconds) for a difficulty, or null if none. */
export function getBestTime(difficulty: DifficultyLevel): number | null {
  const times = loadBestTimes();
  const t = times[difficulty];
  return typeof t === 'number' ? t : null;
}

/**
 * Compares elapsedSeconds to the stored best for difficulty.
 * If it's a new best (or first time), saves it and returns true.
 * Otherwise returns false.
 */
export function updateBestTime(difficulty: DifficultyLevel, elapsedSeconds: number): boolean {
  const times = loadBestTimes();
  const current = times[difficulty];
  if (typeof current === 'number' && current <= elapsedSeconds) return false;
  try {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify({ ...times, [difficulty]: elapsedSeconds }));
    return true;
  } catch {
    // Private browsing or quota: can't record the new best, so don't claim it.
    return false;
  }
}
