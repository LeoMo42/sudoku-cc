/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { createPuzzle } from '../utils/sudokuGenerator';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';
import { findConflicts, isSolved, copyBoard } from '../utils/sudokuValidator';
import { findHintStep } from '../utils/hintEngine';
import { GAME_STATUS, DIFFICULTY_LEVELS, SUDOKU_TYPES, STORAGE_KEY, SAVE_VERSION, EMPTY_CELL } from '../utils/constants';
import type {
  GameState,
  GameStatus,
  GameContextValue,
  DifficultyLevel,
  SudokuTypeId,
  CellValue,
  OddEvenMarkers,
  KropkiDots,
  GreaterThanSigns,
} from '../types/index';

export const GameContext = createContext<GameContextValue | null>(null);

export const Actions = {
  NEW_GAME: 'NEW_GAME',
  SET_CELL_VALUE: 'SET_CELL_VALUE',
  SELECT_CELL: 'SELECT_CELL',
  CHECK_SOLUTION: 'CHECK_SOLUTION',
  GET_HINT: 'GET_HINT',
  APPLY_HINT: 'APPLY_HINT',
  DISMISS_HINT: 'DISMISS_HINT',
  TOGGLE_NOTES_MODE: 'TOGGLE_NOTES_MODE',
  SET_NOTE: 'SET_NOTE',
  UNDO: 'UNDO',
  REDO: 'REDO',
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
  mistakeCount: 0,
  wrongAttempts: new Map(),
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
  history: [],
  historyIndex: -1,
};

const VALID_DIFFICULTIES: ReadonlySet<string> = new Set(Object.keys(DIFFICULTY_LEVELS));
const VALID_SUDOKU_TYPES: ReadonlySet<string> = new Set(Object.keys(SUDOKU_TYPES));
const VALID_GAME_STATUSES: ReadonlySet<string> = new Set(Object.values(GAME_STATUS));

/**
 * Variants whose puzzle is unsolvable without its clue data. Loading, say, a
 * KILLER save with no cages gives the player a blank grid and no rules —
 * unwinnable, and indistinguishable from a bug in the app.
 */
const REQUIRED_VARIANT_DATA: Readonly<Record<string, string>> = {
  ODD_EVEN: 'oddEvenMarkers',
  KROPKI: 'kropkiDots',
  KILLER: 'killerCages',
  LITTLE_KILLER: 'littleKillerClues',
  GREATER_THAN: 'greaterThanSigns',
  THERMO: 'thermos',
  SANDWICH: 'sandwichClues',
};

/**
 * A 9x9 grid of integers. `min` is 0 for playable boards, where 0 means empty,
 * and 1 for `solution`, which by definition has no empty cells — a zero there
 * is the #273 partial-generation corruption, and loading it makes every entry
 * in that cell a mistake against nothing.
 */
function isDigitGrid(value: unknown, min: 0 | 1 = 0): boolean {
  if (!Array.isArray(value) || value.length !== 9) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 9) return false;
    for (const cell of row) {
      if (!Number.isInteger(cell) || cell < min || cell > 9) return false;
    }
  }
  return true;
}

/** Optional numeric counter: absent is fine, present must be a finite count. */
function isOptionalCount(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

/** Serialised Map<string, Set<number>> — an array of [key, digits] pairs. */
function isOptionalNoteMap(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value)) return false;
  return value.every(
    entry =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'string' &&
      Array.isArray(entry[1]) &&
      entry[1].every(d => Number.isInteger(d) && d >= 1 && d <= 9),
  );
}

/**
 * Validate a saved game before it is spread into state.
 *
 * This checks MEANING, not just shape (#272). The previous version accepted any
 * string for difficulty/sudokuType/gameStatus, never looked at cell values, and
 * did not require `solution` or `initialBoard` to exist at all. LOAD_STATE
 * spreads the payload straight over state, so a save written by an older build
 * — or hand-edited in devtools — could load a game that is unwinnable, or throw
 * later at `DIFFICULTY_LEVELS[state.difficulty]` with an undefined key. Either
 * way the player is stuck with no route back except clearing site data.
 *
 * Rejection is atomic: the caller discards the save and starts clean rather
 * than half-loading it.
 */
export function isValidSavedState(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;

  // All three grids must be present and consistent with each other. `solution`
  // is what mistakes are counted against, so a save without it turns every
  // entry into a mistake against undefined.
  if (!isDigitGrid(obj.board)) return false;
  if (!isDigitGrid(obj.initialBoard)) return false;
  if (!isDigitGrid(obj.solution, 1)) return false;

  // Enum membership, not merely `typeof === 'string'`. An unknown difficulty
  // indexes DIFFICULTY_LEVELS to undefined and throws on first read.
  if (typeof obj.difficulty !== 'string' || !VALID_DIFFICULTIES.has(obj.difficulty)) return false;
  if (typeof obj.sudokuType !== 'string' || !VALID_SUDOKU_TYPES.has(obj.sudokuType)) return false;
  if (typeof obj.gameStatus !== 'string' || !VALID_GAME_STATUSES.has(obj.gameStatus)) return false;

  if (!isOptionalCount(obj.elapsedTime)) return false;
  if (!isOptionalCount(obj.hintsUsed)) return false;
  if (!isOptionalCount(obj.mistakeCount)) return false;

  if (!isOptionalNoteMap(obj.notes)) return false;
  if (!isOptionalNoteMap(obj.wrongAttempts)) return false;

  if (obj.errors !== undefined && obj.errors !== null) {
    if (!Array.isArray(obj.errors) || !obj.errors.every(e => typeof e === 'string')) return false;
  }

  const requiredField = REQUIRED_VARIANT_DATA[obj.sudokuType];
  if (requiredField !== undefined && (obj[requiredField] === undefined || obj[requiredField] === null)) {
    return false;
  }

  return true;
}

export function migrateSavedState(data: Record<string, unknown>): Record<string, unknown> {
  const version = typeof data.version === 'number' ? data.version : 0;

  // Version 0 → 1: add version field (no structural changes needed)
  if (version < 1) {
    return { ...data, version: 1 };
  }

  return data;
}

function cloneNotes(notes: Map<string, Set<number>>): Map<string, Set<number>> {
  const copy = new Map<string, Set<number>>();
  for (const [k, v] of notes) copy.set(k, new Set(v));
  return copy;
}

function pushHistory(state: GameState, newBoard: number[][], newNotes: Map<string, Set<number>>): Pick<GameState, 'history' | 'historyIndex'> {
  // Truncate any future entries after current index, then push new state
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push({ board: copyBoard(newBoard), notes: cloneNotes(newNotes) });
  return { history, historyIndex: history.length - 1 };
}

// Reducer (exported for testing)
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case Actions.NEW_GAME: {
      const { difficulty, sudokuType, seed } = action.payload as { difficulty: DifficultyLevel; sudokuType: SudokuTypeId; seed?: number };
      const { puzzle, solution, oddEvenMarkers, kropkiDots, killerCages, littleKillerClues, greaterThanSigns, thermos, sandwichClues } = createPuzzle(difficulty, sudokuType, seed);

      const startBoard = copyBoard(puzzle);
      return {
        ...initialState,
        board: startBoard,
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
        history: [{ board: copyBoard(startBoard), notes: new Map() }],
        historyIndex: 0,
      };
    }

    case Actions.SET_CELL_VALUE: {
      const { row, col, value, mistakeLimit } = action.payload as {
        row: number;
        col: number;
        value: CellValue;
        // null when the "limit mistakes" setting is off; otherwise the
        // current per-difficulty limit. Reducer is told what the limit
        // is rather than reading the preference itself, so it stays pure.
        mistakeLimit?: number | null;
      };

      // Can't modify initial cells. Writes are also blocked when the
      // game isn't actively being PLAYED — initial state (IDLE), paused
      // state, and terminal LOST / COMPLETED states. Without the PAUSED
      // guard a stuck-key or stale-shortcut handler can mutate the board
      // while the user thinks the game is suspended (#216).
      if (state.initialBoard[row]![col] !== EMPTY_CELL) {
        return state;
      }
      if (state.gameStatus !== GAME_STATUS.PLAYING) {
        return state;
      }

      const oldValue = state.board[row]![col];
      // No-op on same-value placement (#221). Tapping the same digit
      // twice in a cell, or pressing Clear on an already-empty cell,
      // would otherwise push redundant history snapshots — Undo then
      // requires multiple presses to revert what felt like one move,
      // and history grows unbounded under repeated input.
      if (value === oldValue) {
        return state;
      }
      const newBoard = copyBoard(state.board);
      newBoard[row]![col] = value;

      // Check for errors
      const errors = findConflicts(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);

      // Mistake counter (D2 from research-round interview).
      //
      // A placement is a mistake when it's a non-empty value that
      // disagrees with the unique solution AND the player has not
      // already tried that exact wrong digit at this cell. The previous
      // implementation used `value !== oldValue` as the "new" check,
      // which double-counted typo→clear→same-typo and let mistake-limit
      // bombs trigger from one wrong button tapped three times in a row.
      //
      // Tracking wrongAttempts as Map<cellKey, Set<digit>> means each
      // unique wrong guess for a cell counts exactly once. Clearing the
      // cell does NOT clear wrongAttempts — the player still already
      // learned that digit was wrong.
      //
      // Memory ceiling: 81 cells × 9 distinct wrong digits each = 729
      // entries, well under 6 KB worst case.
      const solutionValue = state.solution[row]![col];
      const cellKey = `${row},${col}`;
      const isWrongPlacement =
        value !== EMPTY_CELL && value !== solutionValue;
      const alreadyTried = state.wrongAttempts.get(cellKey)?.has(value) ?? false;
      const isNewWrongPlacement = isWrongPlacement && !alreadyTried;
      const mistakeCount = isNewWrongPlacement ? state.mistakeCount + 1 : state.mistakeCount;

      // Append this wrong digit to the per-cell history so the next
      // re-tap of the same digit doesn't re-count. Correct placements
      // and clears don't update wrongAttempts.
      let newWrongAttempts = state.wrongAttempts;
      if (isNewWrongPlacement) {
        newWrongAttempts = new Map(state.wrongAttempts);
        const cellSet = new Set(newWrongAttempts.get(cellKey) ?? []);
        cellSet.add(value);
        newWrongAttempts.set(cellKey, cellSet);
      }

      // Check if puzzle is solved. Annotate the type explicitly so the
      // narrowing from the early-return guard above (which excludes LOST
      // and COMPLETED) doesn't prevent us from re-widening to those.
      let gameStatus: GameStatus = state.gameStatus;
      if (isSolved(newBoard, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues)) {
        gameStatus = GAME_STATUS.COMPLETED;
      } else if (mistakeLimit != null && mistakeCount >= mistakeLimit) {
        // Limit reached: terminal LOST state. Modal in UI handles restart.
        gameStatus = GAME_STATUS.LOST;
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
        mistakeCount,
        wrongAttempts: newWrongAttempts,
        gameStatus,
        notes: newNotes,
        // Any board mutation invalidates a previously-computed hint:
        // its target cell or candidate set may no longer match. Without
        // this clear, APPLY_HINT could overwrite the user's fresh input
        // with a stale placement (#217).
        activeHint: null,
        ...pushHistory(state, newBoard, newNotes),
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
        // Charge the hint at GET, not at APPLY (#219). Showing the
        // target cell + technique IS the costly action — players who
        // request a hint, read the suggestion, then dismiss without
        // tapping Apply could otherwise see unlimited free hints by
        // manually re-creating the move themselves.
        hintsUsed: state.hintsUsed + 1,
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
        // hintsUsed is NOT incremented here — it was already charged
        // at GET_HINT time (#219). Applying is free once the hint has
        // been revealed.
        errors,
        gameStatus: solved ? GAME_STATUS.COMPLETED : state.gameStatus,
        activeHint: null,
        ...pushHistory(state, newBoard, newNotes),
      };
    }

    case Actions.DISMISS_HINT: {
      return {
        ...state,
        activeHint: null,
      };
    }

    case Actions.UNDO: {
      if (state.historyIndex <= 0) return state;
      const prevIndex = state.historyIndex - 1;
      const snapshot = state.history[prevIndex]!;
      const board = copyBoard(snapshot.board);
      const errors = findConflicts(board, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      return {
        ...state,
        board,
        notes: cloneNotes(snapshot.notes),
        errors,
        historyIndex: prevIndex,
        gameStatus: state.gameStatus === GAME_STATUS.COMPLETED ? GAME_STATUS.PLAYING : state.gameStatus,
        // Stale-hint guard (#217). After undo, the activeHint's target
        // cell may already be filled at the prior snapshot, or the
        // candidate set the elimination was computed against differs.
        activeHint: null,
      };
    }

    case Actions.REDO: {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex]!;
      const board = copyBoard(snapshot.board);
      const errors = findConflicts(board, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      const solved = isSolved(board, state.sudokuType, state.oddEvenMarkers, state.kropkiDots, state.killerCages, state.littleKillerClues, state.greaterThanSigns, state.thermos, state.sandwichClues);
      return {
        ...state,
        board,
        notes: cloneNotes(snapshot.notes),
        errors,
        historyIndex: nextIndex,
        gameStatus: solved ? GAME_STATUS.COMPLETED : state.gameStatus,
        // Stale-hint guard (#217), same rationale as UNDO.
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
        // Stale-hint guard (#217). Toggling a note mutates the candidate
        // grid the active hint may have been computed against.
        activeHint: null,
        ...pushHistory(state, state.board, newNotes),
      };
    }

    case Actions.PAUSE_GAME: {
      // Only PLAYING → PAUSED is a valid transition. Pausing IDLE,
      // COMPLETED, or LOST is meaningless and — combined with the
      // RESUME guard below — would resurrect terminal games (#215).
      if (state.gameStatus !== GAME_STATUS.PLAYING) {
        return state;
      }
      return {
        ...state,
        gameStatus: GAME_STATUS.PAUSED,
      };
    }

    case Actions.RESUME_GAME: {
      // Only PAUSED → PLAYING. Without this guard, a stale shortcut /
      // menu handler dispatched against a COMPLETED or LOST game flips
      // it back to PLAYING and the user can keep mutating the board
      // past the mistake limit (#215).
      if (state.gameStatus !== GAME_STATUS.PAUSED) {
        return state;
      }
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
        wrongAttempts?: [string, number[]][];
        oddEvenMarkers?: [string, string][] | null;
        kropkiDots?: [string, string][] | null;
        greaterThanSigns?: [string, string][] | null;
      };
      const loadedNotes = new Map((payload.notes || []).map(([k, v]) => [k, new Set(v)]));
      // Old saves predate wrongAttempts; default to empty Map so a
      // player loading an in-flight game from before D2 shipped doesn't
      // get NaN/undefined when the reducer reads it on next placement.
      const loadedWrongAttempts = new Map(
        (payload.wrongAttempts || []).map(([k, v]) => [k, new Set(v)] as [string, Set<number>]),
      );
      const loadedBoard = payload.board ?? state.board;
      return {
        ...state,
        ...payload,
        // Old saves predate mistakeCount; default to 0 so a player loading
        // an in-flight game from before the feature shipped just sees a
        // fresh counter rather than NaN/undefined.
        mistakeCount: typeof payload.mistakeCount === 'number' ? payload.mistakeCount : 0,
        errors: new Set(payload.errors || []),
        notes: loadedNotes,
        wrongAttempts: loadedWrongAttempts,
        activeHint: null,
        history: [{ board: copyBoard(loadedBoard as number[][]), notes: cloneNotes(loadedNotes) }],
        historyIndex: 0,
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

/**
 * Synchronous lazy initializer for useReducer. Reads (and migrates)
 * any persisted in-flight game from localStorage during the first
 * render — BEFORE GameContainer's mount-time effects fire. This is
 * load-bearing: the SEO landing routes (`/{lang}/{slug}`) need
 * useAutoStartIdle to see the actual persisted state on its first
 * run so its variantMismatch branch can decide whether to override.
 *
 * Previously the load happened in a mount effect that fired AFTER
 * useAutoStartIdle, which clobbered any forcedVariant boot.
 */
function loadInitialState(): GameState {
  if (typeof window === 'undefined') return initialState;

  // safeGetItem, not a bare read: getItem throws SecurityError in restricted
  // environments and an unguarded read crashes the provider mount, taking the
  // whole app with it (#218). Rationale lives in utils/safeStorage (#271).
  const savedState = safeGetItem(STORAGE_KEY);
  if (!savedState) return initialState;

  try {
    const parsed = JSON.parse(savedState);
    if (!isValidSavedState(parsed)) {
      console.warn('Saved game data is corrupted, starting fresh');
      safeRemoveItem(STORAGE_KEY);
      return initialState;
    }
    const migrated = migrateSavedState(parsed);
    // Reuse the LOAD_STATE reducer body so transformations stay in
    // exactly one place.
    return gameReducer(initialState, { type: Actions.LOAD_STATE, payload: migrated });
  } catch (error) {
    console.warn('Failed to load saved game, starting fresh:', error);
    safeRemoveItem(STORAGE_KEY);
    return initialState;
  }
}

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadInitialState);

  // Save state to localStorage
  useEffect(() => {
    if (state.gameStatus === GAME_STATUS.PLAYING || state.gameStatus === GAME_STATUS.PAUSED) {
      const stateToSave = {
        ...state,
        version: SAVE_VERSION,
        errors: Array.from(state.errors),
        notes: Array.from(state.notes.entries()).map(([k, v]) => [k, Array.from(v)]),
        wrongAttempts: Array.from(state.wrongAttempts.entries()).map(([k, v]) => [k, Array.from(v)]),
        activeHint: null,
        oddEvenMarkers: state.oddEvenMarkers ? Array.from(state.oddEvenMarkers.entries()) : null,
        kropkiDots: state.kropkiDots ? Array.from(state.kropkiDots.entries()) : null,
        killerCages: state.killerCages,
        littleKillerClues: state.littleKillerClues,
        greaterThanSigns: state.greaterThanSigns ? Array.from(state.greaterThanSigns.entries()) : null,
        thermos: state.thermos,
        sandwichClues: state.sandwichClues,
        history: undefined,
        historyIndex: undefined,
      };
      safeSetItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } else if (state.gameStatus === GAME_STATUS.COMPLETED || state.gameStatus === GAME_STATUS.LOST) {
      safeRemoveItem(STORAGE_KEY);
    }
  }, [state]);

  const newGame = useCallback((difficulty: DifficultyLevel = 'MEDIUM', sudokuType: SudokuTypeId = 'CLASSIC', seed?: number) => {
    dispatch({ type: Actions.NEW_GAME, payload: { difficulty, sudokuType, seed } });
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: CellValue, mistakeLimit: number | null = null) => {
    dispatch({ type: Actions.SET_CELL_VALUE, payload: { row, col, value, mistakeLimit } });
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

  const undo = useCallback(() => {
    dispatch({ type: Actions.UNDO });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: Actions.REDO });
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
      undo,
      redo,
      pauseGame,
      resumeGame,
      updateTime,
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
