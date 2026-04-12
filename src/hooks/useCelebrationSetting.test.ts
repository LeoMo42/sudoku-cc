import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCelebrationSetting } from './useCelebrationSetting';

describe('useCelebrationSetting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to enabled on first run', () => {
    const { result } = renderHook(() => useCelebrationSetting());
    expect(result.current.celebrationEnabled).toBe(true);
  });

  it('reads saved preference from localStorage', () => {
    localStorage.setItem('sudoku-celebration-enabled', 'false');
    const { result } = renderHook(() => useCelebrationSetting());
    expect(result.current.celebrationEnabled).toBe(false);
  });

  it('toggles state and persists to localStorage', () => {
    const { result } = renderHook(() => useCelebrationSetting());
    act(() => result.current.toggleCelebration());
    expect(result.current.celebrationEnabled).toBe(false);
    expect(localStorage.getItem('sudoku-celebration-enabled')).toBe('false');
    act(() => result.current.toggleCelebration());
    expect(result.current.celebrationEnabled).toBe(true);
    expect(localStorage.getItem('sudoku-celebration-enabled')).toBe('true');
  });

  it('defaults to enabled when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    const { result } = renderHook(() => useCelebrationSetting());
    expect(result.current.celebrationEnabled).toBe(true);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    const { result } = renderHook(() => useCelebrationSetting());
    expect(() => {
      act(() => result.current.toggleCelebration());
    }).not.toThrow();
  });
});
