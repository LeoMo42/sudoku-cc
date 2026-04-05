import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound } from './useSound';

describe('useSound localStorage safety', () => {
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;

  afterEach(() => {
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });

  it('should default to true when localStorage.getItem throws', () => {
    Storage.prototype.getItem = vi.fn(() => {
      throw new DOMException('blocked');
    });
    const { result } = renderHook(() => useSound());
    expect(result.current.soundEnabled).toBe(true);
  });

  it('should not throw when localStorage.setItem throws', () => {
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('quota exceeded');
    });
    const { result } = renderHook(() => useSound());
    expect(() => {
      act(() => result.current.toggleSound());
    }).not.toThrow();
  });

  it('should read saved preference from localStorage', () => {
    beforeEach(() => localStorage.clear());
    localStorage.setItem('sudoku-sound-enabled', 'false');
    const { result } = renderHook(() => useSound());
    expect(result.current.soundEnabled).toBe(false);
  });

  it('should toggle sound state', () => {
    const { result } = renderHook(() => useSound());
    const initial = result.current.soundEnabled;
    act(() => result.current.toggleSound());
    expect(result.current.soundEnabled).toBe(!initial);
  });
});
