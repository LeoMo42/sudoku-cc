import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from '../../hooks/useGameState';
import { useTimer } from '../../hooks/useTimer';
import { useSound } from '../../hooks/useSound';
import { Board } from '../Board/Board';
import { Timer } from '../Controls/Timer';
import { NumberPad } from '../Controls/NumberPad';
import { DifficultySelector } from '../Controls/DifficultySelector';
import { SudokuTypeSelector } from '../Controls/SudokuTypeSelector';
import { GameControls } from '../Controls/GameControls';
import { HintModal } from '../Controls/HintModal';
import { LanguageSwitcher } from '../UI/LanguageSwitcher';
import { OddEvenLegend } from '../UI/OddEvenLegend';
import { GAME_STATUS, DIFFICULTY_LEVELS, EMPTY_CELL } from '../../utils/constants';
import type { HighlightRole } from '../../types/index';

/**
 * Main game container component
 */
export function GameContainer() {
  const { t } = useTranslation();
  const { state, actions } = useGameState();
  const { soundEnabled, toggleSound, playDigitSound, playErrorSound, playVictorySound } = useSound();

  // Timer hook
  useTimer(state.gameStatus, actions.updateTime);

  // Sound effects: track previous errors and gameStatus to detect changes
  const prevErrorsSizeRef = useRef<number>(state.errors.size);
  const prevGameStatusRef = useRef(state.gameStatus);
  // Set to true in input handlers so the effect knows a digit was just entered
  const pendingDigitSoundRef = useRef<boolean>(false);

  useEffect(() => {
    const prevStatus = prevGameStatusRef.current;
    const prevErrorsSize = prevErrorsSizeRef.current;

    if (state.gameStatus === GAME_STATUS.COMPLETED && prevStatus !== GAME_STATUS.COMPLETED) {
      playVictorySound();
    } else if (pendingDigitSoundRef.current) {
      // Play either error OR digit sound, not both
      if (state.errors.size > prevErrorsSize) {
        playErrorSound();
      } else {
        playDigitSound();
      }
      pendingDigitSoundRef.current = false;
    }

    prevGameStatusRef.current = state.gameStatus;
    prevErrorsSizeRef.current = state.errors.size;
  }, [state.errors, state.gameStatus, playVictorySound, playErrorSound, playDigitSound]);

  // Auto-start game if status is IDLE
  useEffect(() => {
    if (state.gameStatus === GAME_STATUS.IDLE) {
      actions.newGame(state.difficulty, state.sudokuType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Undo/redo keyboard shortcuts (work without cell selection)
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
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
  }, [state.gameStatus, actions]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          if (!isInitialCell) pendingDigitSoundRef.current = true;
          actions.setCellValue(row, col, num as 1|2|3|4|5|6|7|8|9);
        }
      }

      // Backspace or Delete to clear cell
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        actions.setCellValue(row, col, EMPTY_CELL);
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
  }, [state.selectedCell, state.gameStatus, state.notesMode, state.initialBoard, actions]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (state.gameStatus === GAME_STATUS.PLAYING) {
        actions.selectCell(row, col);
      }
    },
    [state.gameStatus, actions]
  );

  const handleNumberClick = useCallback(
    (num: number) => {
      if (state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING) {
        const { row, col } = state.selectedCell;

        if (state.notesMode) {
          actions.setNote(row, col, num);
        } else {
          const isInitialCell = state.initialBoard[row][col] !== EMPTY_CELL;
          if (!isInitialCell) pendingDigitSoundRef.current = true;
          actions.setCellValue(row, col, num as 1|2|3|4|5|6|7|8|9);
        }
      }
    },
    [state.selectedCell, state.gameStatus, state.notesMode, state.initialBoard, actions]
  );

  const handleClear = useCallback(() => {
    if (state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING) {
      const { row, col } = state.selectedCell;
      actions.setCellValue(row, col, EMPTY_CELL);
    }
  }, [state.selectedCell, state.gameStatus, actions]);

  const handleNewGame = useCallback(() => {
    actions.newGame(state.difficulty, state.sudokuType);
  }, [state.difficulty, state.sudokuType, actions]);

  const handleDifficultyChange = useCallback(
    (difficulty: Parameters<typeof actions.newGame>[0]) => {
      actions.newGame(difficulty, state.sudokuType);
    },
    [state.sudokuType, actions]
  );

  const handleTypeChange = useCallback(
    (sudokuType: Parameters<typeof actions.newGame>[1]) => {
      actions.newGame(state.difficulty, sudokuType);
    },
    [state.difficulty, actions]
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
      onCellClick={handleCellClick}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with title and language switcher */}
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
            {t('game.title')}
          </h1>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start justify-center">
          {/* Left side - Board with Type and Difficulty */}
          <div className="flex flex-col gap-3 lg:gap-4 w-full lg:w-auto">
            {/* Type + Difficulty row */}
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              {/* Sudoku Type Selector */}
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {t('game.type')}
                </h3>
                <SudokuTypeSelector
                  currentType={state.sudokuType}
                  onTypeChange={handleTypeChange}
                  disabled={false}
                />
              </div>

              {/* Difficulty Selector */}
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {t('game.difficulty')}
                </h3>
                <DifficultySelector
                  currentDifficulty={state.difficulty}
                  onDifficultyChange={handleDifficultyChange}
                  disabled={false}
                />
              </div>
            </div>

            {/* Board - responsive scaling */}
            <div ref={boardContainerRef} className="flex flex-col items-center w-full">
              <div
                style={{
                  transform: `scale(${boardScale})`,
                  transformOrigin: 'top center',
                  height: boardScale < 1 ? `${nativeBoardWidth * boardScale}px` : 'auto',
                }}
              >
                {boardElement}
              </div>

              {/* Odd-Even Legend */}
              {state.sudokuType === 'ODD_EVEN' && <OddEvenLegend />}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex flex-col gap-4 lg:gap-6 w-full lg:w-auto">
            {/* Timer and Game Controls - combined on mobile */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">{t('game.time')}</span>
                <div className="flex items-center gap-3">
                  <Timer elapsedTime={state.elapsedTime} />
                  <button
                    onClick={toggleSound}
                    title={soundEnabled ? t('game.soundOn') : t('game.soundOff')}
                    className="text-xl leading-none text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    {soundEnabled ? '🔊' : '🔇'}
                  </button>
                </div>
              </div>

              {state.gameStatus === GAME_STATUS.PAUSED && (
                <div className="bg-yellow-100 border-2 border-yellow-600 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-yellow-800">
                    {t('game.paused')}
                  </p>
                </div>
              )}
            </div>

            {/* Game Controls */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <GameControls
                onNewGame={handleNewGame}
                onCheck={actions.checkSolution}
                onHint={actions.getHint}
                onUndo={actions.undo}
                onRedo={actions.redo}
                onPause={actions.pauseGame}
                onResume={actions.resumeGame}
                onToggleNotes={actions.toggleNotesMode}
                hintsUsed={state.hintsUsed}
                maxHints={maxHints}
                gameStatus={state.gameStatus}
                notesMode={state.notesMode}
                canUndo={state.historyIndex > 0}
                canRedo={state.historyIndex < state.history.length - 1}
              />
            </div>

            {/* Hint Modal (rendered as overlay) */}
            <HintModal
              activeHint={state.activeHint}
              onApply={actions.applyHint}
              onDismiss={actions.dismissHint}
            />

            {/* Number Pad */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3 text-center">
                {t('game.numberInput')}
              </h3>
              <div className="flex justify-center">
                <NumberPad
                  onNumberClick={handleNumberClick}
                  onClear={handleClear}
                  disabled={
                    !state.selectedCell || state.gameStatus !== GAME_STATUS.PLAYING
                  }
                />
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                {t('controls.keyboard')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
