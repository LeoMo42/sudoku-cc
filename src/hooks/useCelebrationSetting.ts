import { useState, useCallback } from 'react';

const CELEBRATION_KEY = 'sudoku-celebration-enabled';

interface UseCelebrationSettingReturn {
  celebrationEnabled: boolean;
  toggleCelebration: () => void;
}

/**
 * Persisted toggle for confetti / celebration animation on puzzle completion.
 * Defaults to enabled. Respects localStorage failures (private mode, quota).
 * Even when enabled, animations are suppressed if the OS reports
 * prefers-reduced-motion — that check lives in useConfetti.
 */
export function useCelebrationSetting(): UseCelebrationSettingReturn {
  const [celebrationEnabled, setCelebrationEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(CELEBRATION_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleCelebration = useCallback((): void => {
    setCelebrationEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CELEBRATION_KEY, String(next));
      } catch { /* private browsing or quota exceeded */ }
      return next;
    });
  }, []);

  return { celebrationEnabled, toggleCelebration };
}
