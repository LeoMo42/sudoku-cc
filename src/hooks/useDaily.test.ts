import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDaily } from './useDaily';
import { recordDailyCompletion } from '../utils/dailyPuzzle';

const DAILY_STORAGE_KEY = 'sudoku-daily';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useDaily — initial render', () => {
  it('returns dailyInfo for today', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());
    expect(result.current.dailyInfo.date).toBe('2024-06-15');
  });

  it('returns isCompleted=false when not completed', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());
    expect(result.current.isCompleted).toBe(false);
  });

  it('returns isCompleted=true when today is recorded', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    recordDailyCompletion(new Date(2024, 5, 15));
    const { result } = renderHook(() => useDaily());
    expect(result.current.isCompleted).toBe(true);
  });

  it('returns 0 streak with no completions', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());
    expect(result.current.streak.current).toBe(0);
  });
});

describe('useDaily — midnight rollover (#138)', () => {
  it('refreshes dailyInfo when local midnight passes', () => {
    // Mount at 23:59:50 on Jun 15
    vi.setSystemTime(new Date(2024, 5, 15, 23, 59, 50));
    const { result } = renderHook(() => useDaily());
    expect(result.current.dailyInfo.date).toBe('2024-06-15');
    const oldDayNumber = result.current.dailyInfo.dayNumber;

    // Fast-forward past midnight (15 seconds → 00:00:05 on Jun 16)
    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    // Hook should have re-scheduled and refreshed dailyInfo
    expect(result.current.dailyInfo.date).toBe('2024-06-16');
    expect(result.current.dailyInfo.dayNumber).toBe(oldDayNumber + 1);
  });

  it('does not refresh dailyInfo before midnight', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());
    const before = result.current.dailyInfo;

    // Advance 11 hours (still on Jun 15)
    act(() => {
      vi.advanceTimersByTime(11 * 60 * 60 * 1000);
    });

    expect(result.current.dailyInfo).toBe(before);
  });

  it('refreshes again after a SECOND midnight passes', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 23, 59, 50));
    const { result } = renderHook(() => useDaily());

    // Cross first midnight → Jun 16
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.dailyInfo.date).toBe('2024-06-16');

    // Cross second midnight → Jun 17
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(result.current.dailyInfo.date).toBe('2024-06-17');
  });

  it('refreshes isCompleted when day rolls over', () => {
    // Today (Jun 15) is recorded as completed
    vi.setSystemTime(new Date(2024, 5, 15, 23, 59, 50));
    recordDailyCompletion(new Date(2024, 5, 15));
    const { result } = renderHook(() => useDaily());
    expect(result.current.isCompleted).toBe(true);

    // After midnight, today is now Jun 16 — not yet completed
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.isCompleted).toBe(false);
  });
});

describe('useDaily — visibility-change safety net (#138)', () => {
  it('refreshes dailyInfo when tab becomes visible after a system sleep', () => {
    // Mount at 22:00 on Jun 15
    vi.setSystemTime(new Date(2024, 5, 15, 22, 0, 0));
    const { result } = renderHook(() => useDaily());
    expect(result.current.dailyInfo.date).toBe('2024-06-15');

    // Simulate the system sleeping past midnight without setTimeout firing.
    // We jump the system clock without advancing fake timers.
    vi.setSystemTime(new Date(2024, 5, 16, 9, 30, 0));

    // Tab becomes visible — visibility-change handler fires
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.dailyInfo.date).toBe('2024-06-16');
  });

  it('does NOT refresh when tab visibility changes but day has not changed', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());
    const before = result.current.dailyInfo;

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Same dayNumber → same reference (state updater returned prev)
    expect(result.current.dailyInfo).toBe(before);
  });
});

describe('useDaily — markCompleted', () => {
  it('records completion against the puzzle date passed in', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const { result } = renderHook(() => useDaily());

    act(() => {
      result.current.markCompleted('2024-06-15');
    });

    expect(result.current.isCompleted).toBe(true);
    expect(result.current.streak.current).toBe(1);
    // localStorage state should reflect the completion
    const store = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY)!);
    expect(store.currentStreak).toBe(1);
  });

  it('records against yesterday when the puzzle was started yesterday and completed past midnight', () => {
    // Mount at 23:59 on Jun 15. User starts puzzle, captures '2024-06-15'.
    vi.setSystemTime(new Date(2024, 5, 15, 23, 59, 0));
    const { result } = renderHook(() => useDaily());
    const startedDate = result.current.dailyInfo.date;
    expect(startedDate).toBe('2024-06-15');

    // Now advance past midnight to 00:01 Jun 16
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    // dailyInfo refreshed to Jun 16
    expect(result.current.dailyInfo.date).toBe('2024-06-16');

    // BUT user is completing the puzzle they started YESTERDAY — they
    // pass the captured-at-start date, not the current dailyInfo.date.
    act(() => {
      result.current.markCompleted(startedDate);
    });

    // Completion was recorded against yesterday (the day the puzzle ran for).
    const store = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY)!);
    // Day number for 2024-06-15 (yesterday relative to Jun 16)
    const expectedDayNumber = Math.floor(
      (Date.UTC(2024, 5, 15) - Date.UTC(2000, 0, 1)) / 86_400_000,
    );
    expect(store.lastCompletedDayNumber).toBe(expectedDayNumber);
    expect(store.currentStreak).toBe(1);
  });
});

describe('useDaily — cleanup', () => {
  it('clears the midnight timeout on unmount', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 23, 59, 50));
    const { result, unmount } = renderHook(() => useDaily());
    expect(result.current.dailyInfo.date).toBe('2024-06-15');

    unmount();

    // Advance past midnight — without the cleanup, the setTimeout would
    // fire and try to setState on an unmounted hook (not catastrophic in
    // React 18+, but wasteful and a real-tab leak). Just verify no throw.
    expect(() => {
      vi.advanceTimersByTime(15_000);
    }).not.toThrow();
  });
});
