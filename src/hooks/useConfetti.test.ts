import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useConfetti } from './useConfetti';

vi.mock('canvas-confetti', () => {
  const fn = vi.fn();
  (fn as unknown as { reset: ReturnType<typeof vi.fn> }).reset = vi.fn();
  return { default: fn };
});

import confetti from 'canvas-confetti';
const mockConfetti = confetti as unknown as ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };

function makeRef(val: boolean) {
  return { current: val };
}

describe('useConfetti', () => {
  beforeEach(() => {
    mockConfetti.mockClear();
    mockConfetti.reset.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fire when trigger is false', () => {
    renderHook(() => useConfetti(false, true, makeRef(false)));
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('fires confetti when trigger transitions to true', () => {
    const ref = makeRef(false);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: boolean }) => useConfetti(trigger, true, ref),
      { initialProps: { trigger: false } }
    );
    rerender({ trigger: true });
    expect(mockConfetti).toHaveBeenCalledTimes(1);
  });

  it('does not fire again if trigger stays true on re-render', () => {
    const ref = makeRef(false);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: boolean }) => useConfetti(trigger, true, ref),
      { initialProps: { trigger: false } }
    );
    rerender({ trigger: true });
    rerender({ trigger: true });
    expect(mockConfetti).toHaveBeenCalledTimes(1);
  });

  it('does not fire when celebrations are disabled', () => {
    const ref = makeRef(false);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: boolean }) => useConfetti(trigger, false, ref),
      { initialProps: { trigger: false } }
    );
    rerender({ trigger: true });
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('does not fire when prefers-reduced-motion is set', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const ref = makeRef(false);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: boolean }) => useConfetti(trigger, true, ref),
      { initialProps: { trigger: false } }
    );
    rerender({ trigger: true });
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('fires immediately for a new best time (setTimeout burst is async)', () => {
    vi.useFakeTimers();
    const ref = makeRef(true); // isNewBestTime = true
    const { rerender } = renderHook(
      ({ trigger }: { trigger: boolean }) => useConfetti(trigger, true, ref),
      { initialProps: { trigger: false } }
    );
    rerender({ trigger: true });
    // First burst fires immediately
    expect(mockConfetti).toHaveBeenCalledTimes(1);
    // Two more fire after the timeout
    vi.runAllTimers();
    expect(mockConfetti).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('calls confetti.reset on unmount', () => {
    const { unmount } = renderHook(() => {
      const ref = useRef(false);
      return useConfetti(false, true, ref);
    });
    unmount();
    expect(mockConfetti.reset).toHaveBeenCalled();
  });
});
