import { useEffect, useRef, type MutableRefObject } from 'react';
import confetti from 'canvas-confetti';

/**
 * Fires a confetti burst whenever `trigger` transitions false → true.
 * Respects prefers-reduced-motion at the OS level regardless of `enabled`.
 *
 * `isNewBestTimeRef` is a ref (not a value) so that the effect reads the
 * latest value written by sibling effects that run earlier in the same
 * commit — specifically the sound effect in GameContainer that calls
 * updateBestTime() and writes the result to the ref before this effect runs.
 * React guarantees effects fire in registration order within one component.
 *
 * canvas-confetti self-manages animation cleanup; reset() is called on unmount.
 */
export function useConfetti(
  trigger: boolean,
  enabled: boolean,
  isNewBestTimeRef: MutableRefObject<boolean>,
): void {
  const prevTriggerRef = useRef(false);

  useEffect(() => {
    const fired = trigger && !prevTriggerRef.current;
    prevTriggerRef.current = trigger;

    if (!fired || !enabled) return;
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (isNewBestTimeRef.current) {
      // Two-wave celebration for a new personal best
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 } });
      const id = setTimeout(() => {
        confetti({ particleCount: 80, spread: 120, angle: 60, origin: { x: 0, y: 0.7 } });
        confetti({ particleCount: 80, spread: 120, angle: 120, origin: { x: 1, y: 0.7 } });
      }, 350);
      return () => clearTimeout(id);
    } else {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  // isNewBestTimeRef is a stable ref object — intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, enabled]);

  useEffect(() => {
    return () => { confetti.reset(); };
  }, []);
}
