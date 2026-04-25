import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDailyInfo,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStreak,
  toDateString,
  toDayNumber,
  loadDailyStore,
} from './dailyPuzzle';

const STORAGE_KEY = 'sudoku-daily';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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

describe('toDayNumber / toDateString consistency (#144 false-positive guard)', () => {
  // Issue #144 claimed toDateString (local) and toDayNumber (allegedly UTC)
  // describe different days near midnight. They don't — both are rooted in
  // the user's LOCAL calendar day. These tests pin the invariant so future
  // refactors don't accidentally introduce the drift codex hypothesized.

  it('agree at noon (no edge case)', () => {
    const d = new Date(2024, 5, 15, 12, 0, 0);
    expect(toDateString(d)).toBe('2024-06-15');
    // The same call run a second time should give the same dayNumber.
    expect(toDayNumber(d)).toBe(toDayNumber(new Date(2024, 5, 15, 12, 0, 0)));
  });

  it('agree at 23:30 local (the case codex claimed would mismatch)', () => {
    const d = new Date(2024, 5, 15, 23, 30, 0);
    expect(toDateString(d)).toBe('2024-06-15');
    // Same dayNumber as noon on the same local day.
    expect(toDayNumber(d)).toBe(toDayNumber(new Date(2024, 5, 15, 12, 0, 0)));
  });

  it('agree at 00:30 local (start of day)', () => {
    const d = new Date(2024, 5, 15, 0, 30, 0);
    expect(toDateString(d)).toBe('2024-06-15');
    expect(toDayNumber(d)).toBe(toDayNumber(new Date(2024, 5, 15, 12, 0, 0)));
  });

  it('roll over together at midnight', () => {
    const beforeMidnight = new Date(2024, 5, 15, 23, 59, 59);
    const afterMidnight = new Date(2024, 5, 16, 0, 0, 1);
    expect(toDateString(beforeMidnight)).toBe('2024-06-15');
    expect(toDateString(afterMidnight)).toBe('2024-06-16');
    expect(toDayNumber(afterMidnight) - toDayNumber(beforeMidnight)).toBe(1);
  });
});

describe('DST safety (#136 false-positive guard)', () => {
  // Issue #136 worried that setDate(getDate()-1) would break across DST
  // transitions. JS Date arithmetic on local days is DST-safe (the spec
  // normalizes wall-clock days, not 24h chunks). These tests pin the
  // behavior so a future refactor can't regress it.

  it('records consecutive completions across spring-forward (US 2024-03-10)', () => {
    // 2024-03-09 (Sat) and 2024-03-10 (Sun, spring-forward in US)
    recordDailyCompletion(new Date(2024, 2, 9, 12, 0));
    const store = recordDailyCompletion(new Date(2024, 2, 10, 12, 0));
    expect(store.currentStreak).toBe(2);
  });

  it('records consecutive completions across fall-back (US 2024-11-03)', () => {
    // 2024-11-02 (Sat) and 2024-11-03 (Sun, fall-back in US)
    recordDailyCompletion(new Date(2024, 10, 2, 12, 0));
    const store = recordDailyCompletion(new Date(2024, 10, 3, 12, 0));
    expect(store.currentStreak).toBe(2);
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

describe('clock-back exploit guard (#142)', () => {
  it('does NOT inflate streak when clock rolls back', () => {
    // Step 1: user "travels" to tomorrow and completes.
    recordDailyCompletion(new Date(2024, 0, 16));
    expect(loadDailyStore().currentStreak).toBe(1);
    expect(loadDailyStore().lastCompletedDayNumber).toBeGreaterThan(0);

    // Step 2: user rolls clock back to today and tries to complete again.
    // The future-date guard should detect this and reset to a fresh
    // single-day streak instead of letting the user farm increments.
    const store = recordDailyCompletion(new Date(2024, 0, 15));
    expect(store.currentStreak).toBe(1); // not 2
    // The stored date is now today (post-rollback), not tomorrow.
    expect(store.lastCompletedDayNumber).toBe(
      Math.floor(
        (Date.UTC(2024, 0, 15) - Date.UTC(2000, 0, 1)) / 86_400_000,
      ),
    );
  });

  it('preserves bestStreak through a clock-back reset', () => {
    // Build up a real streak first.
    recordDailyCompletion(new Date(2024, 0, 10));
    recordDailyCompletion(new Date(2024, 0, 11));
    recordDailyCompletion(new Date(2024, 0, 12));
    expect(loadDailyStore().bestStreak).toBe(3);

    // Future date.
    recordDailyCompletion(new Date(2024, 0, 14));
    // Clock-back attempt.
    const store = recordDailyCompletion(new Date(2024, 0, 13));
    expect(store.bestStreak).toBe(3); // not lost
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
    expect(store.lastCompletedDayNumber).toBeNull();
  });

  it('returns empty store when stored version mismatches (forward-incompat)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, currentStreak: 5 }));
    const store = loadDailyStore();
    expect(store.currentStreak).toBe(0);
  });
});

describe('v1 → v2 migration (#137)', () => {
  // v1 stored `lastCompletedDate: string` (YYYY-MM-DD) and
  // `completedDates: string[]`. v2 stores `lastCompletedDayNumber: number`.
  // Migration must preserve currentStreak, bestStreak, and the
  // last-completed information so users don't lose their streak on upgrade.

  it('preserves currentStreak and bestStreak from a v1 store', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentStreak: 7,
        bestStreak: 12,
        lastCompletedDate: '2024-06-15',
        completedDates: ['2024-06-13', '2024-06-14', '2024-06-15'],
      }),
    );
    const store = loadDailyStore();
    expect(store.version).toBe(2);
    expect(store.currentStreak).toBe(7);
    expect(store.bestStreak).toBe(12);
  });

  it('converts lastCompletedDate string to a dayNumber that round-trips', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentStreak: 1,
        bestStreak: 1,
        lastCompletedDate: '2024-06-15',
        completedDates: ['2024-06-15'],
      }),
    );
    const store = loadDailyStore();
    // The migrated dayNumber should match toDayNumber for the same date.
    expect(store.lastCompletedDayNumber).toBe(toDayNumber(new Date(2024, 5, 15)));
  });

  it('lets a user continue their streak immediately after migration', () => {
    // User had a streak of 5 ending yesterday; today they complete again.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentStreak: 5,
        bestStreak: 5,
        lastCompletedDate: toDateString(yesterday),
        completedDates: [toDateString(yesterday)],
      }),
    );
    const store = recordDailyCompletion(new Date());
    expect(store.currentStreak).toBe(6);
  });

  it('persists the migrated form so subsequent loads do not re-migrate', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentStreak: 3,
        bestStreak: 3,
        lastCompletedDate: '2024-06-15',
        completedDates: ['2024-06-15'],
      }),
    );
    loadDailyStore(); // triggers migration + save
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Record<string, unknown>;
    expect(parsed.version).toBe(2);
    expect(parsed.completedDates).toBeUndefined();
    expect(typeof parsed.lastCompletedDayNumber).toBe('number');
  });

  it('handles a v1 store with missing lastCompletedDate gracefully', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        currentStreak: 0,
        bestStreak: 0,
        completedDates: [],
      }),
    );
    const store = loadDailyStore();
    expect(store.lastCompletedDayNumber).toBeNull();
  });
});

describe('toDateString', () => {
  it('formats date correctly', () => {
    expect(toDateString(new Date(2024, 5, 3))).toBe('2024-06-03');
    expect(toDateString(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});
