import { createContext, useReducer, useCallback, useEffect } from 'react';
import { createPuzzle, getHint } from '../utils/sudokuGenerator';
import { findConflicts, isSolved, copyBoard } from '../utils/sudokuValidator';
import { GAME_STATUS, DIFFICULTY_LEVELS, STORAGE_KEY, EMPTY_CELL } from '../utils/constants';

export const GameContext = createContext();

// Action types
const Actions = {
  NEW_GAME: 'NEW_GAME',
  SET_CELL_VALUE: 'SET_CELL_VALUE',
  SELECT_CELL: 'SELECT_CELL',
  CHECK_SOLUTION: 'CHECK_SOLUTION',
  GET_HINT: 'GET_HINT',
  TOGGLE_NOTES_MODE: 'TOGGLE_NOTES_MODE',
  SET_NOTE: 'SET_NOTE',
  PAUSE_GAME: 'PAUSE_GAME',
  RESUME_GAME: 'RESUME_GAME',
  UPDATE_TIME: 'UPDATE_TIME',
  LOAD_STATE: 'LOAD_STATE',
};

// Initial state
const initialState = {
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
  oddEvenMarkers: null,
  kropkiDots: null,
  killerCages: null,
  littleKillerClues: null,
  greaterThanSigns: null,
  thermos: null,
  sandwichClues: null,
};

// Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case Actions.NEW_GAME: {
      const { difficulty, sudokuType } = action.payload;
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
      const { row, col, value } = action.payload;

      // Can't modify initial cells
      if (state.initialBoard[row][col] !== EMPTY_CELL) {
        return state;
      }

      const newBoard = copyBoard(state.board);
      newBoard[row][col] = value;

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
      const { row, col } = action.payload;
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

      if (state.hintsUsed >= maxHints) {
        return state;
      }

      const hint = getHint(state.board, state.solution, state.initialBoard);

      if (!hint) {
        return state;
      }

      const newBoard = copyBoard(state.board);
      newBoard[hint.row][hint.col] = hint.value;

      const errors = findConflicts(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      const solved = isSolved(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);

      // Clear notes for the hinted cell
      const newNotes = new Map(state.notes);
      newNotes.delete(`${hint.row},${hint.col}`);

      return {
        ...state,
        board: newBoard,
        hintsUsed: state.hintsUsed + 1,
        errors,
        gameStatus: solved ? GAME_STATUS.COMPLETED : state.gameStatus,
        selectedCell: { row: hint.row, col: hint.col },
        notes: newNotes,
      };
    }

    case Actions.TOGGLE_NOTES_MODE: {
      return {
        ...state,
        notesMode: !state.notesMode,
      };
    }

    case Actions.SET_NOTE: {
      const { row, col, number } = action.payload;

      // Can't set notes on initial cells or filled cells
      if (
        state.initialBoard[row][col] !== EMPTY_CELL ||
        state.board[row][col] !== EMPTY_CELL
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
      return {
        ...state,
        ...action.payload,
        errors: new Set(action.payload.errors || []),
        notes: new Map(action.payload.notes || []),
        oddEvenMarkers: action.payload.oddEvenMarkers ? new Map(action.payload.oddEvenMarkers) : null,
        kropkiDots: action.payload.kropkiDots ? new Map(action.payload.kropkiDots) : null,
        killerCages: action.payload.killerCages || null,
        littleKillerClues: action.payload.littleKillerClues || null,
        greaterThanSigns: action.payload.greaterThanSigns ? new Map(action.payload.greaterThanSigns) : null,
        thermos: action.payload.thermos || null,
        sandwichClues: action.payload.sandwichClues || null,
      };
    }

    default:
      return state;
  }
}

// Provider component
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Save state to localStorage
  useEffect(() => {
    if (state.gameStatus !== GAME_STATUS.IDLE) {
      const stateToSave = {
        ...state,
        errors: Array.from(state.errors),
        notes: Array.from(state.notes.entries()),
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

  const newGame = useCallback((difficulty = 'MEDIUM', sudokuType = 'CLASSIC') => {
    dispatch({ type: Actions.NEW_GAME, payload: { difficulty, sudokuType } });
  }, []);

  const setCellValue = useCallback((row, col, value) => {
    dispatch({ type: Actions.SET_CELL_VALUE, payload: { row, col, value } });
  }, []);

  const selectCell = useCallback((row, col) => {
    dispatch({ type: Actions.SELECT_CELL, payload: { row, col } });
  }, []);

  const checkSolution = useCallback(() => {
    dispatch({ type: Actions.CHECK_SOLUTION });
  }, []);

  const getHintAction = useCallback(() => {
    dispatch({ type: Actions.GET_HINT });
  }, []);

  const toggleNotesMode = useCallback(() => {
    dispatch({ type: Actions.TOGGLE_NOTES_MODE });
  }, []);

  const setNote = useCallback((row, col, number) => {
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

  const value = {
    state,
    actions: {
      newGame,
      setCellValue,
      selectCell,
      checkSolution,
      getHint: getHintAction,
      toggleNotesMode,
      setNote,
      pauseGame,
      resumeGame,
      updateTime,
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
