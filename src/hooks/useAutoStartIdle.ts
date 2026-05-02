import { useEffect } from 'react';
import { GAME_STATUS, DIFFICULTY_LEVELS, SUDOKU_TYPES } from '../utils/constants';
import { recordGameStart } from '../utils/stats';
import type { GameState, GameActions, DifficultyLevel, SudokuTypeId } from '../types/index';

interface UseAutoStartIdleOptions {
  /**
   * If set, overrides the variant on auto-start (and forces a fresh
   * game even if the user's persisted state had a different variant
   * mid-game). Used by the SEO landing page routes (`/{lang}/{slug}`):
   * landing on `/en/killer-sudoku` should always boot the user into a
   * Killer puzzle, not whatever they last played.
   */
  forcedVariant?: SudokuTypeId | null;
}

/**
 * Mount-time effect that:
 *
 *  1. Auto-starts a new game when status is IDLE, honouring (in order):
 *     `forcedVariant` (from the route) → `?type=` query param (legacy
 *     deep-link, kept for backwards compat with shared URLs) → current
 *     `state.sudokuType`. `?difficulty=` works the same way as a query
 *     fallback. Invalid values fall back to the current state.
 *  2. When `forcedVariant` is set and the user is mid-game in a
 *     DIFFERENT variant, force-restart in the requested variant. (A
 *     user landing on `/en/killer-sudoku` expects Killer, even if
 *     localStorage held a half-finished Classic.)
 *  3. For a returning user mid-game in the SAME variant (PLAYING /
 *     PAUSED), record a game-start event so a completion this session
 *     shows up in stats. Skips COMPLETED / LOST to avoid inflating
 *     gamesStarted on every reload of a finished game.
 *
 * Empty-deps + eslint-disable is intentional: the effect captures the
 * mount-time state and never re-fires. Subsequent state changes are
 * handled by other code paths (handleNewGame, etc.). If we let it
 * re-run on state.gameStatus changes we'd double-record game-starts.
 */
export function useAutoStartIdle(
  state: GameState,
  actions: GameActions,
  options: UseAutoStartIdleOptions = {},
): void {
  const { forcedVariant } = options;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type') as SudokuTypeId | null;
    const diffParam = params.get('difficulty') as DifficultyLevel | null;
    const queryType = typeParam && typeParam in SUDOKU_TYPES ? typeParam : null;
    const queryDiff = diffParam && diffParam in DIFFICULTY_LEVELS ? diffParam : null;

    // Route-driven variant takes priority over query params, query over state.
    const desiredType: SudokuTypeId = forcedVariant ?? queryType ?? state.sudokuType;
    const desiredDiff: DifficultyLevel = queryDiff ?? state.difficulty;

    const midGame = state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED;
    const variantMismatch = midGame && forcedVariant && state.sudokuType !== forcedVariant;

    if (state.gameStatus === GAME_STATUS.IDLE || variantMismatch) {
      actions.newGame(desiredDiff, desiredType);
      recordGameStart(desiredType, desiredDiff);
    } else if (midGame) {
      recordGameStart(state.sudokuType, state.difficulty);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
}
