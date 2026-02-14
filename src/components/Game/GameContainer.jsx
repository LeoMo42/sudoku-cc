import { useEffect, useCallback } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useTimer } from '../../hooks/useTimer';
import { Board } from '../Board/Board';
import { Timer } from '../Controls/Timer';
import { NumberPad } from '../Controls/NumberPad';
import { DifficultySelector } from '../Controls/DifficultySelector';
import { GameControls } from '../Controls/GameControls';
import { GAME_STATUS, DIFFICULTY_LEVELS, EMPTY_CELL } from '../../utils/constants';

/**
 * Main game container component
 */
export function GameContainer() {
  const { state, actions } = useGameState();

  // Timer hook
  useTimer(state.gameStatus, actions.updateTime);

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
    actions.newGame(state.difficulty);
  }, [state.difficulty, actions]);

  const handleDifficultyChange = useCallback(
    (difficulty) => {
      actions.newGame(difficulty);
    },
    [actions]
  );

  const maxHints = DIFFICULTY_LEVELS[state.difficulty].maxHints;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Sudoku
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Left side - Board */}
          <div className="flex flex-col items-center gap-4">
            <Board
              board={state.board}
              initialBoard={state.initialBoard}
              selectedCell={state.selectedCell}
              errors={state.errors}
              notes={state.notes}
              onCellClick={handleCellClick}
            />
          </div>

          {/* Right side - Controls */}
          <div className="flex flex-col gap-6 w-full lg:w-auto">
            {/* Timer and Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">Время:</span>
                <Timer elapsedTime={state.elapsedTime} />
              </div>

              {state.gameStatus === GAME_STATUS.PAUSED && (
                <div className="bg-yellow-100 border-2 border-yellow-600 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-yellow-800">
                    Игра на паузе
                  </p>
                </div>
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                Сложность:
              </h3>
              <DifficultySelector
                currentDifficulty={state.difficulty}
                onDifficultyChange={handleDifficultyChange}
                disabled={state.gameStatus === GAME_STATUS.PLAYING}
              />
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
              <h3 className="text-sm font-medium text-gray-600 mb-3">
                Ввод чисел:
              </h3>
              <NumberPad
                onNumberClick={handleNumberClick}
                onClear={handleClear}
                disabled={
                  !state.selectedCell || state.gameStatus !== GAME_STATUS.PLAYING
                }
              />
              <p className="text-xs text-gray-500 mt-3">
                Используйте клавиши 1-9, стрелки для навигации, Backspace для очистки, N для заметок
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
