import { useState, useEffect, useCallback } from 'react';

const HIGHLIGHT_ENABLED_KEY = 'sudoku-highlights-enabled';

interface UseHighlightSettingReturn {
  highlightsEnabled: boolean;
  toggleHighlights: () => void;
}

/**
 * Persisted toggle for related-cell + matching-value highlighting on the board.
 * Defaults to enabled. Respects localStorage failures (private mode, quota).
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

  useEffect(() => {
    try {
      localStorage.setItem(HIGHLIGHT_ENABLED_KEY, String(highlightsEnabled));
    } catch { /* private browsing or quota exceeded */ }
  }, [highlightsEnabled]);

  const toggleHighlights = useCallback((): void => {
    setHighlightsEnabled((prev) => !prev);
  }, []);

  return { highlightsEnabled, toggleHighlights };
}
