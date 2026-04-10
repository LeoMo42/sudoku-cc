import { useState, useCallback } from 'react';

const MISTAKE_LIMIT_KEY = 'sudoku-mistake-limit-enabled';

interface UseMistakeLimitReturn {
  mistakeLimitEnabled: boolean;
  toggleMistakeLimit: () => void;
}

/**
 * Persisted toggle for the "limit mistakes" setting. When ON, the game
 * transitions to a terminal `lost` state once the per-difficulty mistake
 * limit is reached. When OFF, mistakes are still counted but the player
 * can keep going indefinitely.
 *
 * Defaults to OFF (issue #61): newcomers shouldn't be punished for
 * exploration. The setItem call is folded into the toggle callback to
 * avoid first-mount churn — same pattern as useHighlightSetting.
 */
export function useMistakeLimit(): UseMistakeLimitReturn {
  const [mistakeLimitEnabled, setMistakeLimitEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(MISTAKE_LIMIT_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleMistakeLimit = useCallback((): void => {
    setMistakeLimitEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MISTAKE_LIMIT_KEY, String(next));
      } catch { /* private browsing or quota exceeded */ }
      return next;
    });
  }, []);

  return { mistakeLimitEnabled, toggleMistakeLimit };
}
