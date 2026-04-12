import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboardingTour } from './useOnboardingTour';

const TOUR_KEY = 'sudoku-onboarding-done';

describe('useOnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the tour on first visit (no localStorage key)', () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.tourOpen).toBe(true);
  });

  it('does not open tour when already completed', () => {
    localStorage.setItem(TOUR_KEY, 'true');
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.tourOpen).toBe(false);
  });

  it('closeTour sets tourOpen to false and persists to localStorage', () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.tourOpen).toBe(true);
    act(() => result.current.closeTour());
    expect(result.current.tourOpen).toBe(false);
    expect(localStorage.getItem(TOUR_KEY)).toBe('true');
  });

  it('openTour re-opens the tour and clears localStorage', () => {
    localStorage.setItem(TOUR_KEY, 'true');
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.tourOpen).toBe(false);
    act(() => result.current.openTour());
    expect(result.current.tourOpen).toBe(true);
    expect(localStorage.getItem(TOUR_KEY)).toBeNull();
  });

  it('shows tour when localStorage.getItem throws (treat as first visit)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.tourOpen).toBe(true);
  });

  it('still closes tour in-memory when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useOnboardingTour());
    act(() => result.current.closeTour());
    expect(result.current.tourOpen).toBe(false);
  });
});
