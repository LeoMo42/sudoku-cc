import { useEffect, type MutableRefObject } from 'react';
import { GAME_STATUS, EMPTY_CELL } from '../utils/constants';
import type { GameState, GameActions } from '../types/index';

interface UseKeyboardShortcutsParams {
  state: GameState;
  actions: GameActions;
  currentMistakeLimit: number | null;
  tourOpen: boolean;
  // Set inside the cell-input handler so the parent's completion effect
  // can pick up "a digit was just placed" and route to sound/haptic.
  // Refs (not state) so a write here doesn't trigger re-render and the
  // ref-update lands synchronously before the effect's render closure.
  pendingDigitSoundRef: MutableRefObject<boolean>;
  pendingHapticRef: MutableRefObject<boolean>;
}

/**
 * Centralizes the global keyboard shortcuts the GameContainer used to
 * inline. Two listeners:
 *
 *   - Undo/redo (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) — fires regardless of cell
 *     selection, only requires PLAYING status. Why a separate listener:
 *     these need to work even when no cell is selected (e.g. user just
 *     loaded the page mid-game and wants to undo).
 *
 *   - Cell input (1-9, Backspace/Delete/0, arrows, n) — gated on a
 *     selected cell + PLAYING status. Routes through actions.setCellValue
 *     for digits / clear, actions.selectCell for arrow navigation, and
 *     actions.toggleNotesMode for the 'n' key.
 *
 * Both gated on `tourOpen` so the onboarding tour can capture keys without
 * the game grabbing them.
 */
export function useKeyboardShortcuts({
  state,
  actions,
  currentMistakeLimit,
  tourOpen,
  pendingDigitSoundRef,
  pendingHapticRef,
}: UseKeyboardShortcutsParams): void {
  // Undo/redo keyboard shortcuts (work without cell selection)
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      if (tourOpen) return;
      if (state.gameStatus !== GAME_STATUS.PLAYING) return;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      } else if (ctrlOrMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        actions.redo();
      } else if (ctrlOrMeta && e.key === 'y') {
        e.preventDefault();
        actions.redo();
      }
    };
    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [state.gameStatus, actions, tourOpen]);

  // Cell input handler (digits, clear, arrows, notes toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tourOpen) return;
      if (!state.selectedCell || state.gameStatus !== GAME_STATUS.PLAYING) {
        return;
      }

      const { row, col } = state.selectedCell;

      // Number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key);

        if (state.notesMode) {
          actions.setNote(row, col, num);
        } else {
          const isInitialCell = state.initialBoard[row][col] !== EMPTY_CELL;
          if (!isInitialCell) {
            pendingDigitSoundRef.current = true;
            pendingHapticRef.current = true;
          }
          actions.setCellValue(row, col, num as 1|2|3|4|5|6|7|8|9, currentMistakeLimit);
        }
      }

      // Backspace or Delete to clear cell
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        actions.setCellValue(row, col, EMPTY_CELL, currentMistakeLimit);
      }

      // Arrow keys for navigation
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        let newRow = row;
        let newCol = col;

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min(8, row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min(8, col + 1);
            break;
        }

        actions.selectCell(newRow, newCol);
      }

      // 'n' key to toggle notes mode
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        actions.toggleNotesMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedCell, state.gameStatus, state.notesMode, state.initialBoard, actions, currentMistakeLimit, tourOpen, pendingDigitSoundRef, pendingHapticRef]);
}
