import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHaptic } from './useHaptic';

function mockVibrate(impl?: () => void) {
  Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    configurable: true,
    value: impl ?? vi.fn(),
  });
}

function removeVibrate() {
  // Simulate desktop where navigator.vibrate doesn't exist
  const nav = navigator as unknown as Record<string, unknown>;
  delete nav['vibrate'];
}

describe('useHaptic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default state', () => {
    it('defaults to enabled when navigator.vibrate is available', () => {
      mockVibrate();
      const { result } = renderHook(() => useHaptic());
      expect(result.current.hapticEnabled).toBe(true);
    });

    it('defaults to disabled when navigator.vibrate is absent', () => {
      removeVibrate();
      const { result } = renderHook(() => useHaptic());
      expect(result.current.hapticEnabled).toBe(false);
    });

    it('reads saved preference from localStorage (overrides API detection)', () => {
      mockVibrate();
      localStorage.setItem('sudoku-haptic-enabled', 'false');
      const { result } = renderHook(() => useHaptic());
      expect(result.current.hapticEnabled).toBe(false);
    });
  });

  describe('toggle', () => {
    it('toggles and persists to localStorage', () => {
      mockVibrate();
      const { result } = renderHook(() => useHaptic());
      act(() => result.current.toggleHaptic());
      expect(result.current.hapticEnabled).toBe(false);
      expect(localStorage.getItem('sudoku-haptic-enabled')).toBe('false');
      act(() => result.current.toggleHaptic());
      expect(result.current.hapticEnabled).toBe(true);
    });

    it('does not throw when localStorage.setItem throws', () => {
      mockVibrate();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota exceeded');
      });
      const { result } = renderHook(() => useHaptic());
      expect(() => act(() => result.current.toggleHaptic())).not.toThrow();
    });
  });

  describe('vibration calls', () => {
    it('calls navigator.vibrate with correct pattern for each method', () => {
      const vibrateFn = vi.fn();
      mockVibrate(vibrateFn);
      const { result } = renderHook(() => useHaptic());

      act(() => result.current.vibrateDigit());
      expect(vibrateFn).toHaveBeenLastCalledWith(10);

      act(() => result.current.vibrateSelect());
      expect(vibrateFn).toHaveBeenLastCalledWith(5);

      act(() => result.current.vibrateError());
      expect(vibrateFn).toHaveBeenLastCalledWith([40, 60, 40]);

      act(() => result.current.vibrateComplete());
      expect(vibrateFn).toHaveBeenLastCalledWith([50, 100, 50, 100, 100]);
    });

    it('does not call navigator.vibrate when disabled', () => {
      const vibrateFn = vi.fn();
      mockVibrate(vibrateFn);
      localStorage.setItem('sudoku-haptic-enabled', 'false');
      const { result } = renderHook(() => useHaptic());

      act(() => result.current.vibrateDigit());
      act(() => result.current.vibrateError());
      expect(vibrateFn).not.toHaveBeenCalled();
    });

    it('does not call navigator.vibrate when API is absent', () => {
      removeVibrate();
      const { result } = renderHook(() => useHaptic());
      // Should not throw even though API is absent
      expect(() => {
        act(() => result.current.vibrateDigit());
        act(() => result.current.vibrateError());
      }).not.toThrow();
    });

    it('does not throw when navigator.vibrate throws', () => {
      mockVibrate(() => { throw new Error('vibration denied'); });
      const { result } = renderHook(() => useHaptic());
      expect(() => act(() => result.current.vibrateDigit())).not.toThrow();
    });
  });
});
