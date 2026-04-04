import { createContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { createPuzzle } from '../utils/sudokuGenerator';
import { findConflicts, isSolved, copyBoard } from '../utils/sudokuValidator';
import { findHintStep } from '../utils/hintEngine';
import { GAME_STATUS, DIFFICULTY_LEVELS, STORAGE_KEY, EMPTY_CELL } from '../utils/constants';
import type {
  GameState,
  GameContextValue,
  DifficultyLevel,
  SudokuTypeId,
  CellValue,
  OddEvenMarkers,
  KropkiDots,
  GreaterThanSigns,
} from '../types/index';

// eslint-disable-next-line react-refresh/only-export-components
export const GameContext = createContext<GameContextValue | null>(null);

// Action types
const Actions = {
  NEW_GAME: 'NEW_GAME',
  SET_CELL_VALUE: 'SET_CELL_VALUE',
  SELECT_CELL: 'SELECT_CELL',
  CHECK_SOLUTION: 'CHECK_SOLUTION',
  GET_HINT: 'GET_HINT',
  APPLY_HINT: 'APPLY_HINT',
  DISMISS_HINT: 'DISMISS_HINT',
  TOGGLE_NOTES_MODE: 'TOGGLE_NOTES_MODE',
  SET_NOTE: 'SET_NOTE',
  PAUSE_GAME: 'PAUSE_GAME',
  RESUME_GAME: 'RESUME_GAME',
  UPDATE_TIME: 'UPDATE_TIME',
  LOAD_STATE: 'LOAD_STATE',
} as const;

type ActionType = typeof Actions[keyof typeof Actions];

interface GameAction {
  type: ActionType;
  payload?: unknown;
}

// Initial state
const initialState: GameState = {
  board: Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)),
  initialBoard: Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)),
  solution: Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)),
  selectedCell: null,
  difficulty: 'MEDIUM',
  sudokuType: 'CLASSIC',
  gameStatus: GAME_STATUS.IDLE,
  elapsedTime: 0,
  hintsUsed: 0,
  errors: new Set(),
  notesMode: false,
  notes: new Map(),
  activeHint: null,
  oddEvenMarkers: null,
  kropkiDots: null,
  killerCages: null,
  littleKillerClues: null,
  greaterThanSigns: null,
  thermos: null,
  sandwichClues: null,
};

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case Actions.NEW_GAME: {
      const { difficulty, sudokuType } = action.payload as { difficulty: DifficultyLevel; sudokuType: SudokuTypeId };
      const { puzzle, solution, oddEvenMarkers, kropkiDots, killerCages, littleKillerClues, greaterThanSigns, thermos, sandwichClues } = createPuzzle(difficulty, sudokuType);

      return {
        ...initialState,
        board: copyBoard(puzzle),
        initialBoard: copyBoard(puzzle),
        solution,
        difficulty,
        sudokuType,
        gameStatus: GAME_STATUS.PLAYING,
        notes: new Map(),
        activeHint: null,
        oddEvenMarkers: oddEvenMarkers || null,
        kropkiDots: kropkiDots || null,
        killerCages: killerCages || null,
        littleKillerClues: littleKillerClues || null,
        greaterThanSigns: greaterThanSigns || null,
        thermos: thermos || null,
        sandwichClues: sandwichClues || null,
      };
    }

    case Actions.SET_CELL_VALUE: {
      const { row, col, value } = action.payload as { row: number; col: number; value: CellValue };

      // Can't modify initial cells
      if (state.initialBoard[row]![col] !== EMPTY_CELL) {
        return state;
      }

      const newBoard = copyBoard(state.board);
      newBoard[row]![col] = value;

      // Check for errors
      const errors = findConflicts(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);

      // Check if puzzle is solved
      let gameStatus = state.gameStatus;
      if (isSolved(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues)) {
        gameStatus = GAME_STATUS.COMPLETED;
      }

      // Clear notes for this cell when value is set
      const newNotes = new Map(state.notes);
      if (value !== EMPTY_CELL) {
        newNotes.delete(`${row},${col}`);
      }

      return {
        ...state,
        board: newBoard,
        errors,
        gameStatus,
        notes: newNotes,
      };
    }

    case Actions.SELECT_CELL: {
      const { row, col } = action.payload as { row: number; col: number };
      return {
        ...state,
        selectedCell: { row, col },
      };
    }

    case Actions.CHECK_SOLUTION: {
      const errors = findConflicts(state.board, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      const solved = isSolved(state.board, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);

      return {
        ...state,
        errors,
        gameStatus: solved ? GAME_STATUS.COMPLETED : state.gameStatus,
      };
    }

    case Actions.GET_HINT: {
      const maxHints = DIFFICULTY_LEVELS[state.difficulty].maxHints;
      if (state.hintsUsed >= maxHints) return state;

      const hintStep = findHintStep(state.board, state.sudokuType, {
        oddEvenMarkers: state.oddEvenMarkers,
        killerCages: state.killerCages,
        kropkiDots: state.kropkiDots,
        greaterThanSigns: state.greaterThanSigns,
        thermos: state.thermos,
        sandwichClues: state.sandwichClues,
        littleKillerClues: state.littleKillerClues,
      });

      if (!hintStep) return state;

      // Highlight the target cell (first highlight cell with role 'target')
      const targetCell = hintStep.highlightCells.find(c => c.role === 'target');

      return {
        ...state,
        activeHint: hintStep,
        selectedCell: targetCell
          ? { row: targetCell.row, col: targetCell.col }
          : state.selectedCell,
      };
    }

    case Actions.APPLY_HINT: {
      const { activeHint } = state;
      if (!activeHint) return state;

      let newBoard = copyBoard(state.board);
      const newNotes = new Map(state.notes);

      if (activeHint.placement) {
        // Placement hint: fill the cell
        const { row, col, value } = activeHint.placement;
        newBoard[row]![col] = value as CellValue;
        newNotes.delete(`${row},${col}`);
      } else {
        // Elimination hint: remove eliminated candidates from notes
        for (const { row, col, digit } of activeHint.eliminations) {
          const key = `${row},${col}`;
          const cellNotes = new Set(newNotes.get(key) || []);
          cellNotes.delete(digit);
          if (cellNotes.size === 0) {
            newNotes.delete(key);
          } else {
            newNotes.set(key, cellNotes);
          }
        }
      }

      const errors = findConflicts(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      const solved = isSolved(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);

      return {
        ...state,
        board: newBoard,
        notes: newNotes,
        hintsUsed: state.hintsUsed + 1,
        errors,
        gameStatus: solved ? GAME_STATUS.COMPLETED : state.gameStatus,
        activeHint: null,
      };
    }

    case Actions.DISMISS_HINT: {
      return {
        ...state,
        activeHint: null,
      };
    }

    case Actions.TOGGLE_NOTES_MODE: {
      return {
        ...state,
        notesMode: !state.notesMode,
      };
    }

    case Actions.SET_NOTE: {
      const { row, col, number } = action.payload as { row: number; col: number; number: number };

      // Can't set notes on initial cells or filled cells
      if (
        state.initialBoard[row]![col] !== EMPTY_CELL ||
        state.board[row]![col] !== EMPTY_CELL
      ) {
        return state;
      }

      const key = `${row},${col}`;
      const newNotes = new Map(state.notes);
      const cellNotes = new Set(newNotes.get(key) || []);

      if (cellNotes.has(number)) {
        cellNotes.delete(number);
      } else {
        cellNotes.add(number);
      }

      if (cellNotes.size === 0) {
        newNotes.delete(key);
      } else {
        newNotes.set(key, cellNotes);
      }

      return {
        ...state,
        notes: newNotes,
      };
    }

    case Actions.PAUSE_GAME: {
      return {
        ...state,
        gameStatus: GAME_STATUS.PAUSED,
      };
    }

    case Actions.RESUME_GAME: {
      return {
        ...state,
        gameStatus: GAME_STATUS.PLAYING,
      };
    }

    case Actions.UPDATE_TIME: {
      return {
        ...state,
        elapsedTime: state.elapsedTime + 1,
      };
    }

    case Actions.LOAD_STATE: {
      const payload = action.payload as Partial<GameState> & {
        errors?: string[];
        notes?: [string, number[]][];
        oddEvenMarkers?: [string, string][] | null;
        kropkiDots?: [string, string][] | null;
        greaterThanSigns?: [string, string][] | null;
      };
      return {
        ...state,
        ...payload,
        errors: new Set(payload.errors || []),
        notes: new Map((payload.notes || []).map(([k, v]) => [k, new Set(v)])),
        activeHint: null,
        oddEvenMarkers: payload.oddEvenMarkers ? new Map(payload.oddEvenMarkers) as OddEvenMarkers : null,
        kropkiDots: payload.kropkiDots ? new Map(payload.kropkiDots) as KropkiDots : null,
        killerCages: payload.killerCages || null,
        littleKillerClues: payload.littleKillerClues || null,
        greaterThanSigns: payload.greaterThanSigns ? new Map(payload.greaterThanSigns) as GreaterThanSigns : null,
        thermos: payload.thermos || null,
        sandwichClues: payload.sandwichClues || null,
      };
    }

    default:
      return state;
  }
}

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Save state to localStorage
  useEffect(() => {
    if (state.gameStatus !== GAME_STATUS.IDLE) {
      const stateToSave = {
        ...state,
        errors: Array.from(state.errors),
        notes: Array.from(state.notes.entries()).map(([k, v]) => [k, Array.from(v)]),
        activeHint: null,
        oddEvenMarkers: state.oddEvenMarkers ? Array.from(state.oddEvenMarkers.entries()) : null,
        kropkiDots: state.kropkiDots ? Array.from(state.kropkiDots.entries()) : null,
        killerCages: state.killerCages,
        littleKillerClues: state.littleKillerClues,
        greaterThanSigns: state.greaterThanSigns ? Array.from(state.greaterThanSigns.entries()) : null,
        thermos: state.thermos,
        sandwichClues: state.sandwichClues,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [state]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        dispatch({ type: Actions.LOAD_STATE, payload: parsed });
      } catch (error) {
        console.error('Failed to load saved game:', error);
      }
    }
  }, []);

  const newGame = useCallback((difficulty: DifficultyLevel = 'MEDIUM', sudokuType: SudokuTypeId = 'CLASSIC') => {
    dispatch({ type: Actions.NEW_GAME, payload: { difficulty, sudokuType } });
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: CellValue) => {
    dispatch({ type: Actions.SET_CELL_VALUE, payload: { row, col, value } });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    dispatch({ type: Actions.SELECT_CELL, payload: { row, col } });
  }, []);

  const checkSolution = useCallback(() => {
    dispatch({ type: Actions.CHECK_SOLUTION });
  }, []);

  const getHintAction = useCallback(() => {
    dispatch({ type: Actions.GET_HINT });
  }, []);

  const applyHint = useCallback(() => {
    dispatch({ type: Actions.APPLY_HINT });
  }, []);

  const dismissHint = useCallback(() => {
    dispatch({ type: Actions.DISMISS_HINT });
  }, []);

  const toggleNotesMode = useCallback(() => {
    dispatch({ type: Actions.TOGGLE_NOTES_MODE });
  }, []);

  const setNote = useCallback((row: number, col: number, number: number) => {
    dispatch({ type: Actions.SET_NOTE, payload: { row, col, number } });
  }, []);

  const pauseGame = useCallback(() => {
    dispatch({ type: Actions.PAUSE_GAME });
  }, []);

  const resumeGame = useCallback(() => {
    dispatch({ type: Actions.RESUME_GAME });
  }, []);

  const updateTime = useCallback(() => {
    dispatch({ type: Actions.UPDATE_TIME });
  }, []);

  const value: GameContextValue = {
    state,
    actions: {
      newGame,
      setCellValue,
      selectCell,
      checkSolution,
      getHint: getHintAction,
      applyHint,
      dismissHint,
      toggleNotesMode,
      setNote,
      pauseGame,
      resumeGame,
      updateTime,
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
