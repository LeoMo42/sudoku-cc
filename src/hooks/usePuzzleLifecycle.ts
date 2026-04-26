import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GAME_STATUS } from '../utils/constants';
import { recordGameStart } from '../utils/stats';
import type { GameState, GameActions, DifficultyLevel, SudokuTypeId } from '../types/index';
import type { DailyInfo } from '../utils/dailyPuzzle';

interface UsePuzzleLifecycleParams {
  state: GameState;
  actions: GameActions;
  dailyInfo: DailyInfo;
  markDailyCompleted: (date: string) => void;
  triggerAutoShow: (sudokuType: SudokuTypeId) => void;
}

interface UsePuzzleLifecycleReturn {
  isPlayingDaily: boolean;
  handleNewGame: () => void;
  handleStartDaily: () => void;
  handleDifficultyChange: (difficulty?: DifficultyLevel) => void;
  handleTypeChange: (sudokuType?: SudokuTypeId) => void;
}

/**
 * Owns the "what puzzle are we currently playing" lifecycle. Four user
 * intents start a new game (New Game button, Daily CTA, difficulty switch,
 * type switch); each one needs the same in-progress confirmation guard,
 * the same daily-flag reset, and a stats event. This hook centralizes all
 * of that.
 *
 * Daily-completion routing is also owned here: when gameStatus transitions
 * to COMPLETED while a daily is in flight, mark the captured day done and
 * clear the flag. The captured date (`playingDailyDateRef`) is snapshotted
 * at game-start so a midnight rollover during play credits the day the
 * puzzle was started, not the day it was solved on (#147).
 *
 * Refs vs state:
 *   - `isPlayingDailyRef` mirrors `isPlayingDaily` for the completion
 *     effect, which can't depend on the live state without re-running on
 *     every keystroke / status flip.
 *   - `playingDailyDateRef` is ref-only: nothing renders from it; the
 *     completion effect just needs the captured date.
 */
export function usePuzzleLifecycle({
  state,
  actions,
  dailyInfo,
  markDailyCompleted,
  triggerAutoShow,
}: UsePuzzleLifecycleParams): UsePuzzleLifecycleReturn {
  const { t } = useTranslation();

  const [isPlayingDaily, setIsPlayingDaily] = useState(false);
  const isPlayingDailyRef = useRef(false);
  const playingDailyDateRef = useRef<string | null>(null);

  // Tracks the previous gameStatus so the daily-completion effect only
  // fires on the IDLE/PLAYING/PAUSED → COMPLETED transition, not on every
  // re-render where status is already COMPLETED.
  const prevGameStatusRef = useRef(state.gameStatus);

  useEffect(() => {
    const prevStatus = prevGameStatusRef.current;
    prevGameStatusRef.current = state.gameStatus;

    if (
      state.gameStatus === GAME_STATUS.COMPLETED &&
      prevStatus !== GAME_STATUS.COMPLETED &&
      isPlayingDailyRef.current &&
      playingDailyDateRef.current
    ) {
      markDailyCompleted(playingDailyDateRef.current);
      isPlayingDailyRef.current = false;
      playingDailyDateRef.current = null;
      // The reducer drives the IDLE→PLAYING→COMPLETED transition; this is
      // the React-side bookkeeping that mirrors a ref into state so the
      // StreakBanner can re-render. No cascade — the effect's deps don't
      // include isPlayingDaily.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlayingDaily(false);
    }
  }, [state.gameStatus, markDailyCompleted]);

  // Confirm-dismiss guard shared by New Game, Daily, and the two selectors.
  // The daily CTA uses a fixed message ('confirmNewGame') because the user
  // is opting INTO a daily, not exiting one — exiting only happens when
  // the in-progress game IS a daily, which the other three cover.
  const guardInProgress = useCallback((useDailyCopy: boolean) => {
    if (
      (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) &&
      state.historyIndex > 0
    ) {
      const key = useDailyCopy && isPlayingDailyRef.current
        ? 'game.confirmExitDaily'
        : 'game.confirmNewGame';
      return window.confirm(t(key));
    }
    return true;
  }, [state.gameStatus, state.historyIndex, t]);

  const clearDaily = useCallback(() => {
    isPlayingDailyRef.current = false;
    playingDailyDateRef.current = null;
    setIsPlayingDaily(false);
  }, []);

  const handleNewGame = useCallback(() => {
    if (!guardInProgress(true)) return;
    clearDaily();
    actions.newGame(state.difficulty, state.sudokuType);
    recordGameStart(state.sudokuType, state.difficulty);
  }, [guardInProgress, clearDaily, actions, state.difficulty, state.sudokuType]);

  const handleStartDaily = useCallback(() => {
    if (!guardInProgress(false)) return;
    isPlayingDailyRef.current = true;
    // Snapshot the puzzle's date NOW so a midnight rollover during play
    // doesn't change which day completion credits.
    playingDailyDateRef.current = dailyInfo.date;
    setIsPlayingDaily(true);
    actions.newGame(dailyInfo.difficulty, dailyInfo.type, dailyInfo.seed);
    recordGameStart(dailyInfo.type, dailyInfo.difficulty);
  }, [guardInProgress, dailyInfo, actions]);

  const handleDifficultyChange = useCallback(
    (difficulty?: DifficultyLevel) => {
      if (!guardInProgress(true)) return;
      clearDaily();
      actions.newGame(difficulty, state.sudokuType);
      if (difficulty) recordGameStart(state.sudokuType, difficulty);
    },
    [guardInProgress, clearDaily, actions, state.sudokuType],
  );

  const handleTypeChange = useCallback(
    (sudokuType?: SudokuTypeId) => {
      if (!guardInProgress(true)) return;
      clearDaily();
      actions.newGame(state.difficulty, sudokuType);
      if (sudokuType) {
        recordGameStart(sudokuType, state.difficulty);
        triggerAutoShow(sudokuType);
      }
    },
    [guardInProgress, clearDaily, actions, state.difficulty, triggerAutoShow],
  );

  return {
    isPlayingDaily,
    handleNewGame,
    handleStartDaily,
    handleDifficultyChange,
    handleTypeChange,
  };
}
