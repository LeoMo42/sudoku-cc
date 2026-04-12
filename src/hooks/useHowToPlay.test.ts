import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHowToPlay } from './useHowToPlay';

const ACKNOWLEDGED_KEY = 'sudoku-htpa';

describe('useHowToPlay', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts closed on mount', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    expect(result.current.open).toBe(false);
  });

  it('openModal opens the modal', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.openModal(); });
    expect(result.current.open).toBe(true);
  });

  it('closeModal closes the modal', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.openModal(); });
    act(() => { result.current.closeModal(); });
    expect(result.current.open).toBe(false);
  });

  it('triggerAutoShow opens modal for unacknowledged type', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.triggerAutoShow('KILLER'); });
    expect(result.current.open).toBe(true);
  });

  it('triggerAutoShow does not open modal for acknowledged type', () => {
    localStorage.setItem(ACKNOWLEDGED_KEY, JSON.stringify(['KILLER']));
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.triggerAutoShow('KILLER'); });
    expect(result.current.open).toBe(false);
  });

  it('saves to acknowledged when closing with dontShowAgain checked', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.openModal(); });
    act(() => { result.current.toggleDontShowAgain(); });
    act(() => { result.current.closeModal(); });
    const acknowledged = JSON.parse(localStorage.getItem(ACKNOWLEDGED_KEY) ?? '[]') as string[];
    expect(acknowledged).toContain('CLASSIC');
  });

  it('does not save to acknowledged when closing without dontShowAgain', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.openModal(); });
    act(() => { result.current.closeModal(); });
    const acknowledged = JSON.parse(localStorage.getItem(ACKNOWLEDGED_KEY) ?? '[]') as string[];
    expect(acknowledged).not.toContain('CLASSIC');
  });

  it('toggleDontShowAgain toggles the flag', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    expect(result.current.dontShowAgain).toBe(false);
    act(() => { result.current.toggleDontShowAgain(); });
    expect(result.current.dontShowAgain).toBe(true);
    act(() => { result.current.toggleDontShowAgain(); });
    expect(result.current.dontShowAgain).toBe(false);
  });

  it('openModal resets dontShowAgain to false', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.openModal(); });
    act(() => { result.current.toggleDontShowAgain(); });
    act(() => { result.current.openModal(); });
    expect(result.current.dontShowAgain).toBe(false);
  });

  it('triggerAutoShow for same type opens again if not acknowledged', () => {
    const { result } = renderHook(() => useHowToPlay('CLASSIC'));
    act(() => { result.current.triggerAutoShow('DIAGONAL'); });
    expect(result.current.open).toBe(true);
    act(() => { result.current.closeModal(); }); // close without dontShowAgain
    act(() => { result.current.triggerAutoShow('DIAGONAL'); });
    expect(result.current.open).toBe(true); // opens again
  });

  it('localStorage failure does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => renderHook(() => useHowToPlay('CLASSIC'))).not.toThrow();
    vi.restoreAllMocks();
  });
});
