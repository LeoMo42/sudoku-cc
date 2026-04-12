import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDailyInfo,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStreak,
  toDateString,
  loadDailyStore,
} from './dailyPuzzle';

const STORAGE_KEY = 'sudoku-daily';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getDailyInfo', () => {
  it('returns consistent results for the same date', () => {
    const date = new Date(2024, 0, 15); // 2024-01-15
    const a = getDailyInfo(date);
    const b = getDailyInfo(date);
    expect(a).toEqual(b);
  });

  it('returns different seeds for different dates', () => {
    const a = getDailyInfo(new Date(2024, 0, 15));
    const b = getDailyInfo(new Date(2024, 0, 16));
    expect(a.seed).not.toBe(b.seed);
  });

  it('returns different types as dates advance', () => {
    const types = new Set<string>();
    for (let i = 0; i < 13; i++) {
      const d = new Date(2000, 0, 1 + i);
      types.add(getDailyInfo(d).type);
    }
    expect(types.size).toBeGreaterThan(1);
  });

  it('includes a valid date string', () => {
    const date = new Date(2024, 5, 3); // 2024-06-03
    const info = getDailyInfo(date);
    expect(info.date).toBe('2024-06-03');
  });

  it('dayNumber increases by 1 for consecutive days', () => {
    const d1 = getDailyInfo(new Date(2024, 0, 1));
    const d2 = getDailyInfo(new Date(2024, 0, 2));
    expect(d2.dayNumber - d1.dayNumber).toBe(1);
  });
});

describe('isDailyCompleted', () => {
  it('returns false when no completions recorded', () => {
    expect(isDailyCompleted(new Date(2024, 0, 15))).toBe(false);
  });

  it('returns true after recording completion', () => {
    const date = new Date(2024, 0, 15);
    recordDailyCompletion(date);
    expect(isDailyCompleted(date)).toBe(true);
  });

  it('returns false for a different date', () => {
    recordDailyCompletion(new Date(2024, 0, 15));
    expect(isDailyCompleted(new Date(2024, 0, 16))).toBe(false);
  });
});

describe('recordDailyCompletion', () => {
  it('starts streak at 1 for first completion', () => {
    const store = recordDailyCompletion(new Date(2024, 0, 15));
    expect(store.currentStreak).toBe(1);
    expect(store.bestStreak).toBe(1);
  });

  it('increments streak for consecutive days', () => {
    recordDailyCompletion(new Date(2024, 0, 14));
    const store = recordDailyCompletion(new Date(2024, 0, 15));
    expect(store.currentStreak).toBe(2);
    expect(store.bestStreak).toBe(2);
  });

  it('resets streak to 1 for non-consecutive days', () => {
    recordDailyCompletion(new Date(2024, 0, 10));
    const store = recordDailyCompletion(new Date(2024, 0, 15));
    expect(store.currentStreak).toBe(1);
  });

  it('does not increment streak for duplicate completion', () => {
    recordDailyCompletion(new Date(2024, 0, 15));
    const store = recordDailyCompletion(new Date(2024, 0, 15));
    expect(store.currentStreak).toBe(1);
  });

  it('preserves best streak when current drops', () => {
    recordDailyCompletion(new Date(2024, 0, 1));
    recordDailyCompletion(new Date(2024, 0, 2));
    recordDailyCompletion(new Date(2024, 0, 3));
    // Gap — streak resets to 1
    const store = recordDailyCompletion(new Date(2024, 0, 10));
    expect(store.currentStreak).toBe(1);
    expect(store.bestStreak).toBe(3);
  });
});

describe('getDailyStreak', () => {
  it('returns 0 when no completions', () => {
    const streak = getDailyStreak();
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(0);
  });

  it('returns current streak when last completion is today', () => {
    const today = new Date();
    recordDailyCompletion(today);
    const streak = getDailyStreak();
    expect(streak.current).toBe(1);
  });

  it('returns 0 current when streak is stale (2+ days ago)', () => {
    const old = new Date();
    old.setDate(old.getDate() - 3);
    recordDailyCompletion(old);
    const streak = getDailyStreak();
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(1);
  });
});

describe('loadDailyStore', () => {
  it('returns empty store when localStorage is empty', () => {
    const store = loadDailyStore();
    expect(store.currentStreak).toBe(0);
    expect(store.completedDates).toHaveLength(0);
  });

  it('returns empty store when stored version mismatches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, currentStreak: 5 }));
    const store = loadDailyStore();
    expect(store.currentStreak).toBe(0);
  });
});

describe('toDateString', () => {
  it('formats date correctly', () => {
    expect(toDateString(new Date(2024, 5, 3))).toBe('2024-06-03');
    expect(toDateString(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});
