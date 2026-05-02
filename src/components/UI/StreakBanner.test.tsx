import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { SudokuTypeId, DifficultyLevel } from '../../types/index';
import { StreakBanner } from './StreakBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
    // Minimal i18n shim — components that need locale-aware formatting
    // (Intl.NumberFormat) read i18n.language. Default to 'en' so tests
    // are deterministic across machine locales.
    i18n: { language: 'en' },
  }),
}));

const dailyInfo = { dayNumber: 42, date: '2026-04-13', seed: 12345, type: 'classic' as SudokuTypeId, difficulty: 'easy' as DifficultyLevel };
const streak = { current: 3, best: 7 };
const onPlay = vi.fn();

beforeEach(() => {
  onPlay.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreakBanner — not completed', () => {
  it('renders play button with playCta label when not playing', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={false}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    const btn = screen.getByTestId<HTMLButtonElement>('streak-banner-play');
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
    expect(screen.getByText('daily.playCta')).toBeTruthy();
  });

  it('renders playing label and disabled button when isPlayingDaily', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={false}
        isPlayingDaily={true}
        streak={streak}
        onPlay={onPlay}
      />
    );
    const btn = screen.getByTestId<HTMLButtonElement>('streak-banner-play');
    expect(btn.disabled).toBe(true);
    expect(screen.getByText('daily.playing')).toBeTruthy();
  });

  it('calls onPlay when button clicked', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={false}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    fireEvent.click(screen.getByTestId('streak-banner-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('shows streak count when streak.current > 0', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={false}
        isPlayingDaily={false}
        streak={{ current: 5, best: 10 }}
        onPlay={onPlay}
      />
    );
    // streakLabel contains "🔥 " prefix + i18n key
    expect(screen.getByText(/daily\.streak/)).toBeTruthy();
  });

  it('shows startStreak when streak.current === 0', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={false}
        isPlayingDaily={false}
        streak={{ current: 0, best: 0 }}
        onPlay={onPlay}
      />
    );
    expect(screen.getByText('daily.startStreak')).toBeTruthy();
  });
});

describe('StreakBanner — completed', () => {
  it('renders completed banner without play button', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={true}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    expect(screen.queryByTestId('streak-banner-play')).toBeNull();
    expect(screen.getByText('daily.completed')).toBeTruthy();
  });

  it('shows countdown timer when completed', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={true}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    // nextIn key should be rendered
    expect(screen.getByText(/daily\.nextIn/)).toBeTruthy();
  });

  it('does not call onPlay when completed (no button)', () => {
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={true}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    expect(onPlay).not.toHaveBeenCalled();
  });
});

describe('StreakBanner — countdown visibility gating (#139)', () => {
  // Helper: set document.visibilityState and dispatch the visibilitychange
  // event the way browsers do. configurable=true is REQUIRED so successive
  // tests can re-define it.
  const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  // Reset to visible after each test so other tests aren't poisoned.
  afterEach(() => {
    setVisibility('visible');
  });

  it('does not advance the countdown while the tab is hidden', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 23, 30, 0));
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={true}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    const before = screen.getByText(/daily\.nextIn/).textContent;

    act(() => {
      setVisibility('hidden');
      vi.advanceTimersByTime(5_000);
    });

    // Same text — interval was paused, no setCountdown was fired.
    expect(screen.getByText(/daily\.nextIn/).textContent).toBe(before);
  });

  it('resumes the countdown when the tab becomes visible again', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 23, 30, 0));
    render(
      <StreakBanner
        dailyInfo={dailyInfo}
        isCompleted={true}
        isPlayingDaily={false}
        streak={streak}
        onPlay={onPlay}
      />
    );
    const initial = screen.getByText(/daily\.nextIn/).textContent;

    // Hide → wait → show. The countdown should reflect elapsed time
    // immediately on focus (synchronous tick in start()), without
    // having ticked while hidden.
    act(() => {
      setVisibility('hidden');
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(/daily\.nextIn/).textContent).toBe(initial);

    act(() => {
      setVisibility('visible');
    });
    expect(screen.getByText(/daily\.nextIn/).textContent).not.toBe(initial);
  });
});
