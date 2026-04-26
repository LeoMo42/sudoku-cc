import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from '../../hooks/useGameState';
import { useTimer } from '../../hooks/useTimer';
import { useSound } from '../../hooks/useSound';
import { useHighlightSetting } from '../../hooks/useHighlightSetting';
import { useColorBlindMode } from '../../hooks/useColorBlindMode';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import { OnboardingTour } from '../UI/OnboardingTour';
import { useMistakeLimit } from '../../hooks/useMistakeLimit';
import { useCelebrationSetting } from '../../hooks/useCelebrationSetting';
import { useConfetti } from '../../hooks/useConfetti';
import { useHaptic } from '../../hooks/useHaptic';
import { useTheme } from '../../hooks/useTheme';
import { useHowToPlay } from '../../hooks/useHowToPlay';
import { useStats } from '../../hooks/useStats';
import { useDaily } from '../../hooks/useDaily';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAutoStartIdle } from '../../hooks/useAutoStartIdle';
import { HowToPlayModal } from '../Controls/HowToPlayModal';
import { StatsModal } from '../UI/StatsModal';
import { StreakBanner } from '../UI/StreakBanner';
import { recordGameStart, recordGameComplete } from '../../utils/stats';
import { updateBestTime } from '../../utils/bestTime';
import { shareOrCopy, buildShareUrl, formatElapsed } from '../../utils/share';
import { ShareToast } from '../UI/ShareToast';
import { SettingsDrawer } from '../UI/SettingsDrawer';
import { Board } from '../Board/Board';
import { Timer } from '../Controls/Timer';
import { NumberPad } from '../Controls/NumberPad';
import { DifficultySelector } from '../Controls/DifficultySelector';
import { SudokuTypeSelector } from '../Controls/SudokuTypeSelector';
import { GameControls } from '../Controls/GameControls';
import { HintModal } from '../Controls/HintModal';
import { GameOverModal } from '../Controls/GameOverModal';
import { LanguageSwitcher } from '../UI/LanguageSwitcher';
import { OddEvenLegend } from '../UI/OddEvenLegend';
import { GAME_STATUS, DIFFICULTY_LEVELS, EMPTY_CELL } from '../../utils/constants';
import type { HighlightRole } from '../../types/index';

/**
 * Main game container component
 */
export function GameContainer() {
  const { t, i18n } = useTranslation();
  const { state, actions } = useGameState();
  const { soundEnabled, toggleSound, playDigitSound, playErrorSound, playVictorySound } = useSound();
  const { highlightsEnabled, toggleHighlights } = useHighlightSetting();
  const { colorBlindMode, toggleColorBlindMode } = useColorBlindMode();
  const { tourOpen, openTour, closeTour } = useOnboardingTour();
  const { mistakeLimitEnabled, toggleMistakeLimit } = useMistakeLimit();
  const { celebrationEnabled, toggleCelebration } = useCelebrationSetting();
  const { hapticEnabled, toggleHaptic, vibrateDigit, vibrateError, vibrateSelect, vibrateComplete } = useHaptic();
  const { isDark, toggleTheme } = useTheme();
  const { open: howToPlayOpen, openModal: openHowToPlay, closeModal: closeHowToPlay, triggerAutoShow, dontShowAgain, toggleDontShowAgain } = useHowToPlay(state.sudokuType);
  const { store: statsStore, reload: reloadStats, reset: resetStats } = useStats();
  const { dailyInfo, isCompleted: isDailyCompleted, streak: dailyStreak, markCompleted: markDailyCompleted } = useDaily();
  const [statsOpen, setStatsOpen] = useState(false);
  const [isPlayingDaily, setIsPlayingDaily] = useState(false);
  const isPlayingDailyRef = useRef(false);
  // Captured at game start. Used at completion instead of dailyInfo.date so
  // a midnight rollover mid-game records against the day the puzzle was
  // started, not the day it was solved on.
  const playingDailyDateRef = useRef<string | null>(null);

  const [shareToastVisible, setShareToastVisible] = useState(false);

  // Resolved limit passed to the reducer on every placement. null when
  // the preference is off, so the reducer will not transition to LOST.
  const currentMistakeLimit = mistakeLimitEnabled
    ? DIFFICULTY_LEVELS[state.difficulty].mistakeLimit
    : null;

  // Tracks whether the current completion is a new personal best.
  // Written by the sound effect (declared below), read by useConfetti.
  // React runs effects in declaration order, so useConfetti's effect sees
  // the updated value.
  const isNewBestTimeRef = useRef(false);

  // Live mirror of state.elapsedTime so the completion effect can read the
  // current value WITHOUT depending on state.elapsedTime — which would
  // otherwise re-run the effect every second of play (60 wasted runs per
  // minute, all of them no-ops outside the gameStatus transition we care
  // about). Updated inline on every render so it's always fresh when the
  // effect actually fires (on gameStatus change).
  // Intentional inline ref-mirror: the completion effect needs the LATEST
  // elapsedTime when it fires (on gameStatus change), but listing
  // state.elapsedTime as a dep would re-run it every second of play
  // (#143). Until React's useEffectEvent stabilizes, mirroring into a
  // ref during render is the documented workaround.
  const elapsedTimeRef = useRef(state.elapsedTime);
  // eslint-disable-next-line react-hooks/refs
  elapsedTimeRef.current = state.elapsedTime;

  // Timer hook
  useTimer(state.gameStatus, actions.updateTime);

  // Sound effects: track previous errors and gameStatus to detect changes
  const prevErrorsSizeRef = useRef<number>(state.errors.size);
  const prevGameStatusRef = useRef(state.gameStatus);
  // Set to true in input handlers so the effect knows a digit was just entered
  const pendingDigitSoundRef = useRef<boolean>(false);
  const pendingHapticRef = useRef<boolean>(false);

  useEffect(() => {
    const prevStatus = prevGameStatusRef.current;
    const prevErrorsSize = prevErrorsSizeRef.current;

    if (state.gameStatus === GAME_STATUS.COMPLETED && prevStatus !== GAME_STATUS.COMPLETED) {
      // Use the ref instead of state.elapsedTime so this effect doesn't
      // depend on the timer tick (see #143).
      isNewBestTimeRef.current = updateBestTime(state.difficulty, elapsedTimeRef.current);
      recordGameComplete(state.sudokuType, state.difficulty, elapsedTimeRef.current, state.mistakeCount);
      if (isPlayingDailyRef.current && playingDailyDateRef.current) {
        markDailyCompleted(playingDailyDateRef.current);
        isPlayingDailyRef.current = false;
        playingDailyDateRef.current = null;
        setIsPlayingDaily(false);
      }
      playVictorySound();
      vibrateComplete();
    } else if (pendingDigitSoundRef.current || pendingHapticRef.current) {
      const isError = state.errors.size > prevErrorsSize;
      // Play either error OR digit sound, not both
      if (pendingDigitSoundRef.current) {
        if (isError) { playErrorSound(); } else { playDigitSound(); }
        pendingDigitSoundRef.current = false;
      }
      if (pendingHapticRef.current) {
        if (isError) { vibrateError(); } else { vibrateDigit(); }
        pendingHapticRef.current = false;
      }
    }

    prevGameStatusRef.current = state.gameStatus;
    prevErrorsSizeRef.current = state.errors.size;
    // state.elapsedTime intentionally NOT in deps — read via elapsedTimeRef
    // so the effect doesn't fire on every timer tick (#143).
    // dailyInfo.date intentionally NOT in deps — completion uses the captured
    // playingDailyDateRef so midnight refresh of dailyInfo doesn't change which
    // day gets credited.
  }, [state.errors, state.gameStatus, state.difficulty, state.sudokuType, state.mistakeCount, markDailyCompleted, playVictorySound, playErrorSound, playDigitSound, vibrateComplete, vibrateError, vibrateDigit]);

  // Confetti on completion — declared AFTER the sound effect so React runs it
  // second, giving the sound effect a chance to update isNewBestTimeRef first.
  useConfetti(
    state.gameStatus === GAME_STATUS.COMPLETED,
    celebrationEnabled,
    isNewBestTimeRef,
  );

  // Mount-time auto-start + returning-user game-start recording (#116).
  // See useAutoStartIdle for why empty deps are intentional.
  useAutoStartIdle(state, actions);

  // Keyboard shortcuts: undo/redo + cell input (digits, clear, arrows, n).
  // Extracted to a hook so GameContainer stays focused on layout + flow
  // orchestration, not raw keydown plumbing (#116 — first slice).
  useKeyboardShortcuts({
    state,
    actions,
    currentMistakeLimit,
    tourOpen,
    pendingDigitSoundRef,
    pendingHapticRef,
  });

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (state.gameStatus === GAME_STATUS.PLAYING) {
        vibrateSelect();
        actions.selectCell(row, col);
      }
    },
    [state.gameStatus, actions, vibrateSelect]
  );

  const handleNumberClick = useCallback(
    (num: number) => {
      if (state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING) {
        const { row, col } = state.selectedCell;

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
    },
    [state.selectedCell, state.gameStatus, state.notesMode, state.initialBoard, actions, currentMistakeLimit]
  );

  const handleClear = useCallback(() => {
    if (state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING) {
      const { row, col } = state.selectedCell;
      actions.setCellValue(row, col, EMPTY_CELL, currentMistakeLimit);
    }
  }, [state.selectedCell, state.gameStatus, actions, currentMistakeLimit]);

  const handleNewGame = useCallback(() => {
    if (
      (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) &&
      state.historyIndex > 0 &&
      !window.confirm(t(isPlayingDailyRef.current ? 'game.confirmExitDaily' : 'game.confirmNewGame'))
    ) return;
    isPlayingDailyRef.current = false;
    playingDailyDateRef.current = null;
    setIsPlayingDaily(false);
    actions.newGame(state.difficulty, state.sudokuType);
    recordGameStart(state.sudokuType, state.difficulty);
  }, [state.difficulty, state.sudokuType, state.gameStatus, state.historyIndex, actions, t]);

  const handleStartDaily = useCallback(() => {
    if (
      (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) &&
      state.historyIndex > 0 &&
      !window.confirm(t('game.confirmNewGame'))
    ) return;
    isPlayingDailyRef.current = true;
    // Snapshot the puzzle's date NOW so a midnight rollover during play
    // doesn't change which day completion credits.
    playingDailyDateRef.current = dailyInfo.date;
    setIsPlayingDaily(true);
    actions.newGame(dailyInfo.difficulty, dailyInfo.type, dailyInfo.seed);
    recordGameStart(dailyInfo.type, dailyInfo.difficulty);
  }, [dailyInfo, actions, state.gameStatus, state.historyIndex, t]);

  const handleShare = useCallback(async () => {
    const typeName = t(`sudokuTypes.${state.sudokuType}.name`);
    const diffName = t(`difficulty.${state.difficulty}`);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = buildShareUrl(state.sudokuType, state.difficulty, baseUrl);
    const text = t('game.shareText', { type: typeName, difficulty: diffName, time: formatElapsed(state.elapsedTime) });
    const outcome = await shareOrCopy(text, url);
    if (outcome === 'copied') {
      setShareToastVisible(true);
      setTimeout(() => setShareToastVisible(false), 2500);
    }
  }, [t, state.sudokuType, state.difficulty, state.elapsedTime]);

  const handleDifficultyChange = useCallback(
    (difficulty: Parameters<typeof actions.newGame>[0]) => {
      if (
        (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) &&
        state.historyIndex > 0 &&
        !window.confirm(t(isPlayingDailyRef.current ? 'game.confirmExitDaily' : 'game.confirmNewGame'))
      ) return;
      isPlayingDailyRef.current = false;
      playingDailyDateRef.current = null;
      setIsPlayingDaily(false);
      actions.newGame(difficulty, state.sudokuType);
      if (difficulty) recordGameStart(state.sudokuType, difficulty);
    },
    [state.sudokuType, state.gameStatus, state.historyIndex, actions, t]
  );

  const handleTypeChange = useCallback(
    (sudokuType: Parameters<typeof actions.newGame>[1]) => {
      if (
        (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) &&
        state.historyIndex > 0 &&
        !window.confirm(t(isPlayingDailyRef.current ? 'game.confirmExitDaily' : 'game.confirmNewGame'))
      ) return;
      isPlayingDailyRef.current = false;
      playingDailyDateRef.current = null;
      setIsPlayingDaily(false);
      actions.newGame(state.difficulty, sudokuType);
      if (sudokuType) {
        recordGameStart(sudokuType, state.difficulty);
        triggerAutoShow(sudokuType);
      }
    },
    [state.difficulty, state.gameStatus, state.historyIndex, actions, t, triggerAutoShow]
  );

  const maxHints = DIFFICULTY_LEVELS[state.difficulty].maxHints;

  // Build hint highlight map from activeHint
  const hintHighlights = useMemo((): Map<string, HighlightRole> | null => {
    if (!state.activeHint) return null;
    const map = new Map<string, HighlightRole>();
    for (const { row, col, role } of state.activeHint.highlightCells) {
      map.set(`${row},${col}`, role);
    }
    return map;
  }, [state.activeHint]);

  // Responsive board scaling: measure container width and scale board to fit
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);

  // Native board width varies by variant
  const nativeBoardWidth = state.sudokuType === 'LITTLE_KILLER' ? 536
    : state.sudokuType === 'SANDWICH' ? 506
    : 466; // 450 grid + 16 padding (p-2 = 8px * 2)

  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availableWidth = entry.contentRect.width;
        const scale = Math.min(1, availableWidth / nativeBoardWidth);
        setBoardScale(scale);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [nativeBoardWidth]);

  const boardElement = (
    <Board
      board={state.board}
      initialBoard={state.initialBoard}
      selectedCell={state.selectedCell}
      errors={state.errors}
      notes={state.notes}
      sudokuType={state.sudokuType}
      oddEvenMarkers={state.oddEvenMarkers}
      kropkiDots={state.kropkiDots}
      killerCages={state.killerCages}
      littleKillerClues={state.littleKillerClues as never}
      greaterThanSigns={state.greaterThanSigns}
      thermos={state.thermos}
      sandwichClues={state.sandwichClues}
      hintHighlights={hintHighlights}
      highlightsEnabled={highlightsEnabled}
      colorBlindMode={colorBlindMode}
      onCellClick={handleCellClick}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with title and language switcher */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 print:hidden">
          {/*
            Wordmark with a small 3x3 grid mark (#130). The mark gives the
            "Sudoku" text some brand specificity — without it the wordmark
            is just a bold word in any sans typeface. With Manrope (#125)
            + this glyph the masthead reads as intentional design rather
            than default chrome. Indigo color ties it into the rest of
            the now-disciplined palette (#127).
          */}
          <div className="flex items-center gap-2 sm:gap-3">
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 sm:w-9 sm:h-9 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <line x1="2" y1="9" x2="22" y2="9" />
              <line x1="2" y1="16" x2="22" y2="16" />
              <line x1="9" y1="2" x2="9" y2="22" />
              <line x1="16" y1="2" x2="16" y2="22" />
            </svg>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
              {t('game.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { reloadStats(); setStatsOpen(true); }}
              title={t('stats.title')}
              aria-label={t('stats.title')}
              data-testid="stats-button"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xl leading-none text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg"
            >
              <span aria-hidden="true">📊</span>
            </button>
            <LanguageSwitcher />
            {/*
              Settings drawer moved here from the Time/Mistakes card (#128).
              It used to sit inline next to the timer where it visually
              implied "settings for the time"; in the header it joins the
              other top-right utility buttons (stats, language) which is
              the conventional location.
            */}
            <SettingsDrawer
              highlightsEnabled={highlightsEnabled}
              toggleHighlights={toggleHighlights}
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
              celebrationEnabled={celebrationEnabled}
              toggleCelebration={toggleCelebration}
              hapticEnabled={hapticEnabled}
              toggleHaptic={toggleHaptic}
              isDark={isDark}
              toggleTheme={toggleTheme}
              colorBlindMode={colorBlindMode}
              toggleColorBlindMode={toggleColorBlindMode}
              onTour={openTour}
              onPrint={() => window.print()}
            />
          </div>
        </div>

        {/* Daily streak — full-width hero above the board */}
        <StreakBanner
          dailyInfo={dailyInfo}
          isCompleted={isDailyCompleted}
          isPlayingDaily={isPlayingDaily}
          streak={dailyStreak}
          onPlay={handleStartDaily}
        />

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start justify-center">
          {/* Left side - Board, then Type and Difficulty below */}
          <div className="flex flex-col gap-3 md:gap-4 w-full md:w-auto">
            {/* Print-only header: variant, difficulty, date */}
            <div className="hidden print:block mb-4">
              <h1 className="text-xl font-bold text-black">
                {t('game.title')} — {t(`sudokuTypes.${state.sudokuType}.name`)}, {t(`difficulty.${state.difficulty}`)}
              </h1>
              <p className="text-sm text-gray-600">{new Date().toLocaleDateString(i18n.language)}</p>
            </div>

            {/* Board - responsive scaling */}
            <div ref={boardContainerRef} data-tour="board" className="flex flex-col items-center w-full">
              <div
                data-print-board
                className={state.notesMode ? 'rounded ring-2 ring-amber-400 dark:ring-amber-500' : undefined}
                style={{
                  transform: `scale(${boardScale})`,
                  transformOrigin: 'top center',
                  height: boardScale < 1 ? `${nativeBoardWidth * boardScale}px` : 'auto',
                }}
              >
                {boardElement}
              </div>

              {/* Notes mode indicator badge */}
              {state.notesMode && (
                <div
                  aria-live="polite"
                  className="mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 print:hidden"
                >
                  {t('game.notesModeActive')}
                </div>
              )}

              {/* Odd-Even Legend */}
              {state.sudokuType === 'ODD_EVEN' && <OddEvenLegend />}
            </div>

            {/* Type + Difficulty row — below the board (pre-game settings) */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 print:hidden">
              {/* Sudoku Type Selector */}
              <div data-tour="type-selector" className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 flex-1">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('game.type')}
                  </h2>
                  <button
                    onClick={openHowToPlay}
                    title={t('howToPlay.title')}
                    aria-label={t('howToPlay.title')}
                    data-testid="how-to-play-button"
                    className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    ?
                  </button>
                </div>
                <SudokuTypeSelector
                  currentType={state.sudokuType}
                  onTypeChange={handleTypeChange}
                  disabled={false}
                />
              </div>

              {/* Difficulty Selector */}
              <div data-tour="difficulty-selector" className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 flex-1">
                <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 md:mb-3">
                  {t('game.difficulty')}
                </h2>
                <DifficultySelector
                  currentDifficulty={state.difficulty}
                  onDifficultyChange={handleDifficultyChange}
                  disabled={false}
                />
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex flex-col gap-4 md:gap-6 w-full md:w-auto md:min-w-[280px] print:hidden">
            {/* Number Pad — topmost so it's adjacent to the board */}
            <div data-tour="numberpad" className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
                {t('game.numberInput')}
              </h2>
              <div className="min-h-[1.25rem] mb-2" aria-live="polite">
                {!state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 text-center">
                    {t('game.selectCellHint')}
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <NumberPad
                  onNumberClick={handleNumberClick}
                  onClear={handleClear}
                  disabled={
                    !state.selectedCell || state.gameStatus !== GAME_STATUS.PLAYING
                  }
                />
              </div>
            </div>

            {/* Timer + mistake counter card. Padding tightened (#128)
                from p-4/sm:p-6 to p-3/sm:p-4 — the previous card was
                ~50% empty space because the two slim rows of content
                didn't justify the inset. SettingsDrawer was here too,
                moved to the top header next to language/stats. */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('game.time')}</span>
                <Timer elapsedTime={state.elapsedTime} />
              </div>

              {/* Mistake counter row: shows X N (or X N/M when limit on),
                  with a toggle for the limit setting on the right. */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('game.mistakes')}</span>
                <div className="flex items-center gap-3">
                  <span
                    className="text-base font-mono font-semibold tabular-nums text-gray-800 dark:text-gray-200"
                    data-testid="mistake-counter"
                    aria-live="polite"
                    aria-label={
                      mistakeLimitEnabled
                        ? t('game.mistakesCounterLimited', {
                            count: state.mistakeCount,
                            limit: DIFFICULTY_LEVELS[state.difficulty].mistakeLimit,
                          })
                        : t('game.mistakesCounter', { count: state.mistakeCount })
                    }
                  >
                    {mistakeLimitEnabled
                      ? `${state.mistakeCount} / ${DIFFICULTY_LEVELS[state.difficulty].mistakeLimit}`
                      : state.mistakeCount}
                  </span>
                  <button
                    onClick={toggleMistakeLimit}
                    title={mistakeLimitEnabled ? t('game.mistakeLimitOn') : t('game.mistakeLimitOff')}
                    aria-label={mistakeLimitEnabled ? t('game.mistakeLimitOn') : t('game.mistakeLimitOff')}
                    aria-pressed={mistakeLimitEnabled}
                    data-testid="toggle-mistake-limit"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xl leading-none text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg"
                  >
                    <span aria-hidden="true">{mistakeLimitEnabled ? '⚠️' : '♾️'}</span>
                  </button>
                </div>
              </div>

              {state.gameStatus === GAME_STATUS.PAUSED && (
                <div className="bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-600 dark:border-yellow-500 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {t('game.paused')}
                  </p>
                </div>
              )}
            </div>

            {/* Game Controls */}
            <div data-tour="game-controls" className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
              <GameControls
                onNewGame={handleNewGame}
                onCheck={actions.checkSolution}
                onHint={actions.getHint}
                onUndo={actions.undo}
                onRedo={actions.redo}
                onPause={actions.pauseGame}
                onResume={actions.resumeGame}
                onToggleNotes={actions.toggleNotesMode}
                onShare={handleShare}
                hintsUsed={state.hintsUsed}
                maxHints={maxHints}
                gameStatus={state.gameStatus}
                notesMode={state.notesMode}
                canUndo={state.historyIndex > 0}
                canRedo={state.historyIndex < state.history.length - 1}
              />
            </div>

            {/* Stats modal */}
            <StatsModal
              open={statsOpen}
              store={statsStore}
              onClose={() => setStatsOpen(false)}
              onReset={resetStats}
            />

            {/* How to Play modal */}
            <HowToPlayModal
              open={howToPlayOpen}
              sudokuType={state.sudokuType}
              dontShowAgain={dontShowAgain}
              onToggleDontShowAgain={toggleDontShowAgain}
              onClose={closeHowToPlay}
            />

            {/* Hint Modal (rendered as overlay) */}
            <HintModal
              activeHint={state.activeHint}
              onApply={actions.applyHint}
              onDismiss={actions.dismissHint}
            />

            {/* Game Over modal: appears when mistake limit is reached.
                Limit shown is the one that was active when the loss
                triggered, which is the current difficulty's value. */}
            <GameOverModal
              open={state.gameStatus === GAME_STATUS.LOST}
              limit={DIFFICULTY_LEVELS[state.difficulty].mistakeLimit}
              onNewGame={handleNewGame}
            />

            {/* Copy-to-clipboard confirmation — only shown when Web Share API
                is unavailable and the fallback clipboard write succeeds. */}
            <ShareToast visible={shareToastVisible} />

            {/* Onboarding tour */}
            {tourOpen && <OnboardingTour onClose={closeTour} />}

          </div>
        </div>
      </div>
    </div>
  );
}
