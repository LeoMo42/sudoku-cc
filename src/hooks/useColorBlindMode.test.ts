import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorBlindMode } from './useColorBlindMode';

const COLORBLIND_KEY = 'sudoku-colorblind-mode';

describe('useColorBlindMode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to false when no stored value', () => {
    const { result } = renderHook(() => useColorBlindMode());
    expect(result.current.colorBlindMode).toBe(false);
  });

  it('reads true from localStorage', () => {
    localStorage.setItem(COLORBLIND_KEY, 'true');
    const { result } = renderHook(() => useColorBlindMode());
    expect(result.current.colorBlindMode).toBe(true);
  });

  it('toggles from false to true and persists', () => {
    const { result } = renderHook(() => useColorBlindMode());
    act(() => result.current.toggleColorBlindMode());
    expect(result.current.colorBlindMode).toBe(true);
    expect(localStorage.getItem(COLORBLIND_KEY)).toBe('true');
  });

  it('toggles from true back to false', () => {
    localStorage.setItem(COLORBLIND_KEY, 'true');
    const { result } = renderHook(() => useColorBlindMode());
    act(() => result.current.toggleColorBlindMode());
    expect(result.current.colorBlindMode).toBe(false);
    expect(localStorage.getItem(COLORBLIND_KEY)).toBe('false');
  });

  it('falls back to false when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useColorBlindMode());
    expect(result.current.colorBlindMode).toBe(false);
  });

  it('still updates state when localStorage.setItem throws during toggle', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useColorBlindMode());
    act(() => result.current.toggleColorBlindMode());
    // In-memory state should still reflect the toggle even if persistence failed.
    expect(result.current.colorBlindMode).toBe(true);
  });
});
