import { useState, useCallback } from 'react';
import type { SudokuTypeId } from '../types/index';

const ACKNOWLEDGED_KEY = 'sudoku-htpa';

function loadAcknowledged(): Set<string> {
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* private browsing */ }
  return new Set();
}

function saveAcknowledged(set: Set<string>): void {
  try {
    localStorage.setItem(ACKNOWLEDGED_KEY, JSON.stringify([...set]));
  } catch { /* private browsing */ }
}

interface UseHowToPlayReturn {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  triggerAutoShow: (type: SudokuTypeId) => void;
  dontShowAgain: boolean;
  toggleDontShowAgain: () => void;
}

/**
 * Manages the "How to Play" modal state.
 *
 * Call triggerAutoShow(type) from the type-change handler to open the modal
 * automatically when the user picks a variant they haven't seen yet.
 * Call openModal() to open it manually (e.g. via the ? button).
 */
export function useHowToPlay(currentType: SudokuTypeId): UseHowToPlayReturn {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const triggerAutoShow = useCallback((type: SudokuTypeId) => {
    const acknowledged = loadAcknowledged();
    if (!acknowledged.has(type)) {
      setDontShowAgain(false);
      setOpen(true);
    }
  }, []);

  const openModal = useCallback(() => {
    setDontShowAgain(false);
    setOpen(true);
  }, []);

  // currentType is captured in the closure: when closeModal is invoked,
  // it always uses the type that was active when the modal opened, which
  // is correct because currentType is the same as what was passed to
  // triggerAutoShow or is the current selection when openModal was called.
  const closeModal = useCallback(() => {
    if (dontShowAgain) {
      const acknowledged = loadAcknowledged();
      acknowledged.add(currentType);
      saveAcknowledged(acknowledged);
    }
    setOpen(false);
  }, [dontShowAgain, currentType]);

  const toggleDontShowAgain = useCallback(() => {
    setDontShowAgain(prev => !prev);
  }, []);

  return { open, openModal, closeModal, triggerAutoShow, dontShowAgain, toggleDontShowAgain };
}
