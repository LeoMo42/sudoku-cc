import { useState, useCallback } from 'react';

const HIGHLIGHT_ENABLED_KEY = 'sudoku-highlights-enabled';

interface UseHighlightSettingReturn {
  highlightsEnabled: boolean;
  toggleHighlights: () => void;
}

/**
 * Persisted toggle for related-cell + matching-value highlighting on the board.
 * Defaults to enabled. Respects localStorage failures (private mode, quota).
 *
 * The setItem call is folded into the toggle callback rather than a
 * useEffect: there's no first-mount churn to guard against, and the
 * write only ever happens on user-initiated changes.
 */
export function useHighlightSetting(): UseHighlightSettingReturn {
  const [highlightsEnabled, setHighlightsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(HIGHLIGHT_ENABLED_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleHighlights = useCallback((): void => {
    setHighlightsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIGHLIGHT_ENABLED_KEY, String(next));
      } catch { /* private browsing or quota exceeded */ }
      return next;
    });
  }, []);

  return { highlightsEnabled, toggleHighlights };
}
