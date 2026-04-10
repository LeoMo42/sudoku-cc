import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlightSetting } from './useHighlightSetting';

describe('useHighlightSetting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // vi.spyOn lets vi.restoreAllMocks fully unwind any patched prototype
  // method even if a previous test threw before its manual cleanup ran.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to enabled on first run', () => {
    const { result } = renderHook(() => useHighlightSetting());
    expect(result.current.highlightsEnabled).toBe(true);
  });

  it('reads saved preference from localStorage', () => {
    localStorage.setItem('sudoku-highlights-enabled', 'false');
    const { result } = renderHook(() => useHighlightSetting());
    expect(result.current.highlightsEnabled).toBe(false);
  });

  it('toggles state and persists to localStorage', () => {
    const { result } = renderHook(() => useHighlightSetting());
    act(() => result.current.toggleHighlights());
    expect(result.current.highlightsEnabled).toBe(false);
    expect(localStorage.getItem('sudoku-highlights-enabled')).toBe('false');
    act(() => result.current.toggleHighlights());
    expect(result.current.highlightsEnabled).toBe(true);
    expect(localStorage.getItem('sudoku-highlights-enabled')).toBe('true');
  });

  it('defaults to enabled when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    const { result } = renderHook(() => useHighlightSetting());
    expect(result.current.highlightsEnabled).toBe(true);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    const { result } = renderHook(() => useHighlightSetting());
    expect(() => {
      act(() => result.current.toggleHighlights());
    }).not.toThrow();
  });
});
