import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShare } from './useShare';
import * as shareUtils from '../utils/share';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('useShare', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('toast stays hidden until handleShare is invoked', () => {
    const { result } = renderHook(() =>
      useShare({ sudokuType: 'CLASSIC', difficulty: 'EASY', elapsedTime: 0 }),
    );
    expect(result.current.shareToastVisible).toBe(false);
  });

  it('shows toast for 2.5s when outcome is "copied", then hides', async () => {
    vi.spyOn(shareUtils, 'shareOrCopy').mockResolvedValue('copied');

    const { result } = renderHook(() =>
      useShare({ sudokuType: 'CLASSIC', difficulty: 'HARD', elapsedTime: 120 }),
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(result.current.shareToastVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.shareToastVisible).toBe(false);
  });

  it('does not show toast when outcome is "shared"', async () => {
    vi.spyOn(shareUtils, 'shareOrCopy').mockResolvedValue('shared');

    const { result } = renderHook(() =>
      useShare({ sudokuType: 'CLASSIC', difficulty: 'EASY', elapsedTime: 60 }),
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(result.current.shareToastVisible).toBe(false);
  });

  it('does not show toast when outcome is "cancelled" or "failed"', async () => {
    const spy = vi.spyOn(shareUtils, 'shareOrCopy').mockResolvedValue('cancelled');

    const { result } = renderHook(() =>
      useShare({ sudokuType: 'CLASSIC', difficulty: 'EASY', elapsedTime: 60 }),
    );

    await act(async () => {
      await result.current.handleShare();
    });
    expect(result.current.shareToastVisible).toBe(false);

    spy.mockResolvedValue('failed');
    await act(async () => {
      await result.current.handleShare();
    });
    expect(result.current.shareToastVisible).toBe(false);
  });

  it('passes the deep-link URL and i18n share text to shareOrCopy', async () => {
    const spy = vi.spyOn(shareUtils, 'shareOrCopy').mockResolvedValue('shared');

    const { result } = renderHook(() =>
      useShare({ sudokuType: 'DIAGONAL', difficulty: 'EXPERT', elapsedTime: 443 }),
    );

    await act(async () => {
      await result.current.handleShare();
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [text, url] = spy.mock.calls[0];
    expect(url).toContain('?type=DIAGONAL&difficulty=EXPERT');
    // 443s → 7:23 via formatElapsed
    expect(text).toContain('7:23');
  });
});
