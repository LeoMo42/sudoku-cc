import { useEffect } from 'react';
import { GAME_STATUS, DIFFICULTY_LEVELS, SUDOKU_TYPES } from '../utils/constants';
import { recordGameStart } from '../utils/stats';
import type { GameState, GameActions, DifficultyLevel, SudokuTypeId } from '../types/index';

/**
 * Mount-time effect that:
 *
 *  1. Auto-starts a new game when status is IDLE, honouring deep-link
 *     `?type=` and `?difficulty=` query params (validated against the
 *     constants tables — invalid values fall back to the current state).
 *  2. For a returning user mid-game (PLAYING / PAUSED), records a
 *     game-start event so a completion this session shows up in stats.
 *     Skips COMPLETED / LOST to avoid inflating gamesStarted on every
 *     reload of a finished game.
 *
 * Empty-deps + eslint-disable is intentional: the effect captures the
 * mount-time state and never re-fires. Subsequent state changes are
 * handled by other code paths (handleNewGame, etc.). If we let it
 * re-run on state.gameStatus changes we'd double-record game-starts.
 */
export function useAutoStartIdle(state: GameState, actions: GameActions): void {
  useEffect(() => {
    if (state.gameStatus === GAME_STATUS.IDLE) {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type') as SudokuTypeId | null;
      const diffParam = params.get('difficulty') as DifficultyLevel | null;
      const validType = typeParam && typeParam in SUDOKU_TYPES ? typeParam : state.sudokuType;
      const validDiff = diffParam && diffParam in DIFFICULTY_LEVELS ? diffParam : state.difficulty;
      actions.newGame(validDiff, validType);
      recordGameStart(validType, validDiff);
    } else if (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) {
      recordGameStart(state.sudokuType, state.difficulty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
}
