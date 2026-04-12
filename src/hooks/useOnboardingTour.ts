import { useState, useCallback } from 'react';

const TOUR_KEY = 'sudoku-onboarding-done';

export function useOnboardingTour(): {
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
} {
  const [tourOpen, setTourOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TOUR_KEY) !== 'true';
    } catch {
      // Storage unavailable: treat as first visit, show the tour
      return true;
    }
  });

  const openTour = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_KEY);
    } catch { /* storage unavailable */ }
    setTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, 'true');
    } catch { /* storage unavailable */ }
  }, []);

  return { tourOpen, openTour, closeTour };
}
