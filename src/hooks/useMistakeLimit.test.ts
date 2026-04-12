import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMistakeLimit } from './useMistakeLimit';

describe('useMistakeLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to disabled on first run', () => {
    const { result } = renderHook(() => useMistakeLimit());
    expect(result.current.mistakeLimitEnabled).toBe(false);
  });

  it('reads saved preference from localStorage', () => {
    localStorage.setItem('sudoku-mistake-limit-enabled', 'true');
    const { result } = renderHook(() => useMistakeLimit());
    expect(result.current.mistakeLimitEnabled).toBe(true);
  });

  it('toggles state and persists to localStorage', () => {
    const { result } = renderHook(() => useMistakeLimit());
    act(() => result.current.toggleMistakeLimit());
    expect(result.current.mistakeLimitEnabled).toBe(true);
    expect(localStorage.getItem('sudoku-mistake-limit-enabled')).toBe('true');
    act(() => result.current.toggleMistakeLimit());
    expect(result.current.mistakeLimitEnabled).toBe(false);
    expect(localStorage.getItem('sudoku-mistake-limit-enabled')).toBe('false');
  });

  it('defaults to disabled when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    const { result } = renderHook(() => useMistakeLimit());
    expect(result.current.mistakeLimitEnabled).toBe(false);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    const { result } = renderHook(() => useMistakeLimit());
    expect(() => {
      act(() => result.current.toggleMistakeLimit());
    }).not.toThrow();
  });
});
