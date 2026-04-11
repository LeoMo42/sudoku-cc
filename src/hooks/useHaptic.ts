import { useState, useCallback } from 'react';

const HAPTIC_KEY = 'sudoku-haptic-enabled';

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

interface UseHapticReturn {
  hapticEnabled: boolean;
  toggleHaptic: () => void;
  vibrateDigit: () => void;
  vibrateError: () => void;
  vibrateSelect: () => void;
  vibrateComplete: () => void;
}

/**
 * Haptic feedback via the Web Vibration API.
 * Defaults to ON when the API is available (mobile), OFF when it isn't (desktop).
 * All vibrate* calls are no-ops when disabled or when the API is absent.
 */
export function useHaptic(): UseHapticReturn {
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(HAPTIC_KEY);
      if (saved !== null) return saved === 'true';
      return canVibrate(); // on by default only if the API exists
    } catch {
      return false;
    }
  });

  const toggleHaptic = useCallback((): void => {
    setHapticEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HAPTIC_KEY, String(next));
      } catch { /* private browsing or quota */ }
      return next;
    });
  }, []);

  const vibrate = useCallback((pattern: number | number[]): void => {
    if (!hapticEnabled || !canVibrate()) return;
    try {
      navigator.vibrate(pattern);
    } catch { /* vibration denied or not supported */ }
  }, [hapticEnabled]);

  const vibrateDigit   = useCallback(() => vibrate(10),              [vibrate]);
  const vibrateError   = useCallback(() => vibrate([40, 60, 40]),     [vibrate]);
  const vibrateSelect  = useCallback(() => vibrate(5),               [vibrate]);
  const vibrateComplete = useCallback(() => vibrate([50, 100, 50, 100, 100]), [vibrate]);

  return { hapticEnabled, toggleHaptic, vibrateDigit, vibrateError, vibrateSelect, vibrateComplete };
}
