import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'sudoku-theme';

interface UseThemeReturn {
  isDark: boolean;
  toggleTheme: () => void;
}

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved !== null) return saved === 'dark';
  } catch { /* private browsing */ }
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function useTheme(): UseThemeReturn {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  // Keep the <html> class in sync whenever isDark changes.
  // On mount this is a no-op (inline script already applied the class),
  // but it ensures the class stays correct after toggles.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* private browsing */ }
      return next;
    });
  }, []);

  return { isDark, toggleTheme };
}
