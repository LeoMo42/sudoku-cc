import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlightSetting } from './useHighlightSetting';

describe('useHighlightSetting', () => {
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
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
    Storage.prototype.getItem = vi.fn(() => {
      throw new DOMException('blocked');
    });
    const { result } = renderHook(() => useHighlightSetting());
    expect(result.current.highlightsEnabled).toBe(true);
  });

  it('does not throw when localStorage.setItem throws', () => {
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('quota exceeded');
    });
    const { result } = renderHook(() => useHighlightSetting());
    expect(() => {
      act(() => result.current.toggleHighlights());
    }).not.toThrow();
  });
});
