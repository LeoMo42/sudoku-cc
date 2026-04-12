import { useState, useCallback } from 'react';

const COLORBLIND_KEY = 'sudoku-colorblind-mode';

interface UseColorBlindModeReturn {
  colorBlindMode: boolean;
  toggleColorBlindMode: () => void;
}

/**
 * Persisted toggle for color-blind friendly rendering.
 * Defaults to disabled. Respects localStorage failures (private mode, quota).
 */
export function useColorBlindMode(): UseColorBlindModeReturn {
  const [colorBlindMode, setColorBlindMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLORBLIND_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleColorBlindMode = useCallback((): void => {
    setColorBlindMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLORBLIND_KEY, String(next));
      } catch { /* private browsing or quota exceeded */ }
      return next;
    });
  }, []);

  return { colorBlindMode, toggleColorBlindMode };
}
