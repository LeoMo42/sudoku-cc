import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameState } from '../../hooks/useGameState';
import { useTimer } from '../../hooks/useTimer';
import { Board } from '../Board/Board';
import { Timer } from '../Controls/Timer';
import { NumberPad } from '../Controls/NumberPad';
import { DifficultySelector } from '../Controls/DifficultySelector';
import { SudokuTypeSelector } from '../Controls/SudokuTypeSelector';
import { GameControls } from '../Controls/GameControls';
import { LanguageSwitcher } from '../UI/LanguageSwitcher';
import { OddEvenLegend } from '../UI/OddEvenLegend';
import { GAME_STATUS, DIFFICULTY_LEVELS, EMPTY_CELL } from '../../utils/constants';

/**
 * Main game container component
 */
export function GameContainer() {
  const { t } = useTranslation();
  const { state, actions } = useGameState();

  // Timer hook
  useTimer(state.gameStatus, actions.updateTime);

  // Auto-start game if status is IDLE
  useEffect(() => {
    if (state.gameStatus === GAME_STATUS.IDLE) {
      actions.newGame(state.difficulty, state.sudokuType);
    }
  }, []); // Only run on mount

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
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
          actions.setCellValue(row, col, num);
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
  }, [state.selectedCell, state.gameStatus, state.notesMode, actions]);

  const handleCellClick = useCallback(
    (row, col) => {
      if (state.gameStatus === GAME_STATUS.PLAYING) {
        actions.selectCell(row, col);
      }
    },
    [state.gameStatus, actions]
  );

  const handleNumberClick = useCallback(
    (num) => {
      if (state.selectedCell && state.gameStatus === GAME_STATUS.PLAYING) {
        const { row, col } = state.selectedCell;

        if (state.notesMode) {
          actions.setNote(row, col, num);
        } else {
          actions.setCellValue(row, col, num);
        }
      }
    },
    [state.selectedCell, state.gameStatus, state.notesMode, actions]
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
    (difficulty) => {
      actions.newGame(difficulty, state.sudokuType);
    },
    [state.sudokuType, actions]
  );

  const handleTypeChange = useCallback(
    (sudokuType) => {
      actions.newGame(state.difficulty, sudokuType);
    },
    [state.difficulty, actions]
  );

  const maxHints = DIFFICULTY_LEVELS[state.difficulty].maxHints;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with title and language switcher */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {t('game.title')}
          </h1>
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Left side - Board with Type and Difficulty */}
          <div className="flex flex-col gap-4">
            {/* Sudoku Type Selector */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                {t('game.type', 'Тип:')}
              </h3>
              <SudokuTypeSelector
                currentType={state.sudokuType}
                onTypeChange={handleTypeChange}
                disabled={false}
              />
            </div>

            {/* Difficulty Selector */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                {t('game.difficulty')}
              </h3>
              <DifficultySelector
                currentDifficulty={state.difficulty}
                onDifficultyChange={handleDifficultyChange}
                disabled={false}
              />
            </div>

            {/* Board */}
            <div className="flex flex-col items-center">
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
                littleKillerClues={state.littleKillerClues}
                greaterThanSigns={state.greaterThanSigns}
                thermos={state.thermos}
                sandwichClues={state.sandwichClues}
                onCellClick={handleCellClick}
              />

              {/* Odd-Even Legend */}
              {state.sudokuType === 'ODD_EVEN' && <OddEvenLegend />}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex flex-col gap-6 w-full lg:w-auto">
            {/* Timer and Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">{t('game.time')}</span>
                <Timer elapsedTime={state.elapsedTime} />
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <GameControls
                onNewGame={handleNewGame}
                onCheck={actions.checkSolution}
                onHint={actions.getHint}
                onPause={actions.pauseGame}
                onResume={actions.resumeGame}
                onToggleNotes={actions.toggleNotesMode}
                hintsUsed={state.hintsUsed}
                maxHints={maxHints}
                gameStatus={state.gameStatus}
                notesMode={state.notesMode}
              />
            </div>

            {/* Number Pad */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3 text-center">
                {t('game.numberInput')}
              </h3>
              <div className="flex justify-center">
                <div className="max-w-[180px]">
                  <NumberPad
                    onNumberClick={handleNumberClick}
                    onClear={handleClear}
                    disabled={
                      !state.selectedCell || state.gameStatus !== GAME_STATUS.PLAYING
                    }
                  />
                </div>
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
