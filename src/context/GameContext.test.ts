import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted above imports — find/replace findHintStep with a
// vi.fn so #219 hint-counter tests can drive both the "hint found" and
// "hint not found" branches of GET_HINT without standing up a real
// puzzle. No other test in this file dispatches GET_HINT or APPLY_HINT,
// so the mock is otherwise inert.
vi.mock('../utils/hintEngine', () => ({
  findHintStep: vi.fn(),
}));

import { findHintStep } from '../utils/hintEngine';
import { gameReducer, Actions, isValidSavedState, migrateSavedState, safeSetItem, safeRemoveItem } from './GameContext';
import { GAME_STATUS, EMPTY_CELL } from '../utils/constants';
import { copyBoard } from '../utils/sudokuValidator';
import type { GameState } from '../types/index';

const mockedFindHintStep = vi.mocked(findHintStep);

function createTestState(): GameState {
  const board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL));
  return {
    board: copyBoard(board),
    initialBoard: copyBoard(board),
    solution: copyBoard(board),
    selectedCell: null,
    difficulty: 'EASY',
    sudokuType: 'CLASSIC',
    gameStatus: GAME_STATUS.PLAYING,
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
    history: [{ board: copyBoard(board), notes: new Map() }],
    historyIndex: 0,
  };
}

describe('gameReducer', () => {
  describe('SET_CELL_VALUE', () => {
    it('should place a value on the board', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      expect(next.board[0]![0]).toBe(5);
    });

    it('should not modify initial cells', () => {
      const state = createTestState();
      state.initialBoard[0]![0] = 5;
      state.board[0]![0] = 5;
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 3 },
      });
      expect(next.board[0]![0]).toBe(5);
      expect(next).toBe(state);
    });

    it('should clear a cell with EMPTY_CELL', () => {
      const state = createTestState();
      state.board[0]![0] = 5;
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: EMPTY_CELL },
      });
      expect(next.board[0]![0]).toBe(EMPTY_CELL);
    });

    it('should clear notes when value is set', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(state.notes.has('0,0')).toBe(true);

      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      expect(state.notes.has('0,0')).toBe(false);
    });

    it('should clear multiple notes when value is set', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 1 },
      });
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 7 },
      });
      expect(state.notes.get('0,0')?.size).toBe(3);

      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      expect(state.notes.has('0,0')).toBe(false);
    });

    it('should detect row conflicts', () => {
      const state = createTestState();
      state.board[0]![0] = 5;
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 5, value: 5 },
      });
      expect(next.errors.size).toBeGreaterThan(0);
    });

    // Regression #216 — paused games should not be mutable. The UI hides
    // the number pad while paused, but a stale keyboard handler could
    // still dispatch SET_CELL_VALUE; the reducer must enforce the guard.
    it.each([GAME_STATUS.PAUSED, GAME_STATUS.IDLE] as const)(
      'is a no-op when gameStatus is %s',
      (status) => {
        const state = { ...createTestState(), gameStatus: status };
        const next = gameReducer(state, {
          type: Actions.SET_CELL_VALUE,
          payload: { row: 0, col: 0, value: 5 },
        });
        expect(next).toBe(state);
        expect(next.board[0]![0]).toBe(EMPTY_CELL);
      },
    );

    // Regression #221 — same-value placement (tapping the same digit
    // twice, or Clear on an already-empty cell) must be a no-op so it
    // doesn't push a redundant history snapshot.
    it('is a no-op when value === current value (digit twice)', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      const historyLengthBefore = state.history.length;
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      expect(next).toBe(state);
      expect(next.history.length).toBe(historyLengthBefore);
    });

    it('is a no-op when clearing an already-empty cell', () => {
      const state = createTestState();
      const historyLengthBefore = state.history.length;
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: EMPTY_CELL },
      });
      expect(next).toBe(state);
      expect(next.history.length).toBe(historyLengthBefore);
    });
  });

  describe('SELECT_CELL', () => {
    it('should set selectedCell', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.SELECT_CELL,
        payload: { row: 3, col: 7 },
      });
      expect(next.selectedCell).toEqual({ row: 3, col: 7 });
    });
  });

  describe('TOGGLE_NOTES_MODE', () => {
    it('should toggle notesMode on and off', () => {
      let state = createTestState();
      expect(state.notesMode).toBe(false);

      state = gameReducer(state, { type: Actions.TOGGLE_NOTES_MODE });
      expect(state.notesMode).toBe(true);

      state = gameReducer(state, { type: Actions.TOGGLE_NOTES_MODE });
      expect(state.notesMode).toBe(false);
    });
  });

  describe('SET_NOTE', () => {
    it('should add a note to an empty cell', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(next.notes.get('0,0')?.has(3)).toBe(true);
    });

    it('should toggle a note off if already present', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(state.notes.has('0,0')).toBe(false);
    });

    it('should not leave empty Set in notes map after toggling last note off', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(state.notes.size).toBe(1);
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(state.notes.has('0,0')).toBe(false);
      expect(state.notes.size).toBe(0);
    });

    it('should not set notes on initial cells', () => {
      const state = createTestState();
      state.initialBoard[0]![0] = 5;
      const next = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(next).toBe(state);
    });

    it('should not set notes on filled cells', () => {
      const state = createTestState();
      state.board[0]![0] = 5;
      const next = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 3 },
      });
      expect(next).toBe(state);
    });

    it('should support multiple notes in same cell', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 1 },
      });
      state = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 5 },
      });
      const cellNotes = state.notes.get('0,0')!;
      expect(cellNotes.has(1)).toBe(true);
      expect(cellNotes.has(5)).toBe(true);
      expect(cellNotes.size).toBe(2);
    });
  });

  describe('PAUSE_GAME / RESUME_GAME', () => {
    it('should pause the game', () => {
      const state = createTestState();
      const paused = gameReducer(state, { type: Actions.PAUSE_GAME });
      expect(paused.gameStatus).toBe(GAME_STATUS.PAUSED);
    });

    it('should resume the game', () => {
      let state = createTestState();
      state = gameReducer(state, { type: Actions.PAUSE_GAME });
      const resumed = gameReducer(state, { type: Actions.RESUME_GAME });
      expect(resumed.gameStatus).toBe(GAME_STATUS.PLAYING);
    });

    // Regression #215 — pause/resume must NOT resurrect terminal states.
    it.each([GAME_STATUS.IDLE, GAME_STATUS.COMPLETED, GAME_STATUS.LOST] as const)(
      'PAUSE_GAME is a no-op when status is %s',
      (status) => {
        const state = { ...createTestState(), gameStatus: status };
        const result = gameReducer(state, { type: Actions.PAUSE_GAME });
        expect(result.gameStatus).toBe(status);
        expect(result).toBe(state);
      },
    );

    it.each([GAME_STATUS.IDLE, GAME_STATUS.PLAYING, GAME_STATUS.COMPLETED, GAME_STATUS.LOST] as const)(
      'RESUME_GAME is a no-op when status is %s',
      (status) => {
        const state = { ...createTestState(), gameStatus: status };
        const result = gameReducer(state, { type: Actions.RESUME_GAME });
        expect(result.gameStatus).toBe(status);
        expect(result).toBe(state);
      },
    );
  });

  describe('UPDATE_TIME', () => {
    it('should increment elapsedTime by 1', () => {
      const state = createTestState();
      const next = gameReducer(state, { type: Actions.UPDATE_TIME });
      expect(next.elapsedTime).toBe(1);
    });

    it('should increment cumulatively', () => {
      let state = createTestState();
      state = gameReducer(state, { type: Actions.UPDATE_TIME });
      state = gameReducer(state, { type: Actions.UPDATE_TIME });
      state = gameReducer(state, { type: Actions.UPDATE_TIME });
      expect(state.elapsedTime).toBe(3);
    });
  });

  describe('LOAD_STATE', () => {
    it('should restore board and scalar fields', () => {
      const state = createTestState();
      const board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL));
      board[0]![0] = 7;
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: {
          board,
          difficulty: 'HARD',
          sudokuType: 'DIAGONAL',
          gameStatus: GAME_STATUS.PLAYING,
          elapsedTime: 42,
        },
      });
      expect(next.board[0]![0]).toBe(7);
      expect(next.difficulty).toBe('HARD');
      expect(next.sudokuType).toBe('DIAGONAL');
      expect(next.elapsedTime).toBe(42);
    });

    it('should deserialize errors from array to Set', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: { errors: ['0,0', '1,1'] },
      });
      expect(next.errors).toBeInstanceOf(Set);
      expect(next.errors.has('0,0')).toBe(true);
      expect(next.errors.has('1,1')).toBe(true);
    });

    it('should deserialize notes from array to Map of Sets', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: { notes: [['0,0', [1, 3, 5]]] },
      });
      expect(next.notes).toBeInstanceOf(Map);
      const cellNotes = next.notes.get('0,0')!;
      expect(cellNotes).toBeInstanceOf(Set);
      expect(cellNotes.has(1)).toBe(true);
      expect(cellNotes.has(3)).toBe(true);
      expect(cellNotes.has(5)).toBe(true);
    });

    it('should deserialize oddEvenMarkers from array to Map', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: { oddEvenMarkers: [['0,0', 'odd'], ['1,1', 'even']] },
      });
      expect(next.oddEvenMarkers).toBeInstanceOf(Map);
      expect(next.oddEvenMarkers!.get('0,0')).toBe('odd');
    });

    it('should clear activeHint on load', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: {},
      });
      expect(next.activeHint).toBeNull();
    });

    it('should reset history on load to prevent undo into stale state', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      expect(state.history.length).toBe(2);

      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: {},
      });
      expect(next.history.length).toBe(1);
      expect(next.historyIndex).toBe(0);
    });

    it('should deep-clone notes in history snapshot so edits after load do not corrupt undo', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: { notes: [['0,0', [1, 3]]] },
      });
      // Toggle note 1 off — history snapshot should be unaffected
      const after = gameReducer(next, {
        type: Actions.SET_NOTE,
        payload: { row: 0, col: 0, number: 1 },
      });
      // Undo should restore the original notes including note 1
      const undone = gameReducer(after, { type: Actions.UNDO });
      expect(undone.notes.get('0,0')?.has(1)).toBe(true);
      expect(undone.notes.get('0,0')?.has(3)).toBe(true);
    });
  });

  // Regression #217 — every reducer that mutates the board (or the
  // candidate grid via notes) must clear activeHint, so a stale hint
  // can't be applied against a state it was no longer computed against.
  describe('activeHint clearing on board mutation (#217)', () => {
    function withActiveHint(): GameState {
      return {
        ...createTestState(),
        // Minimal placement-shaped activeHint. The reducer doesn't
        // inspect its fields here — it just needs to be non-null so
        // the assertion has something to clear.
        activeHint: {
          technique: 'NAKED_SINGLE',
          placement: { row: 0, col: 0, value: 5 },
          eliminations: [],
          highlightCells: [],
          message: 'stub',
        } as never,
      };
    }

    it('SET_CELL_VALUE clears activeHint', () => {
      const state = withActiveHint();
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 1, col: 1, value: 3 },
      });
      expect(next.activeHint).toBeNull();
    });

    it('UNDO clears activeHint', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      // Inject a stale hint AFTER a move was made (so history exists)
      state = { ...state, activeHint: { technique: 'NAKED_SINGLE', placement: { row: 0, col: 0, value: 5 }, eliminations: [], highlightCells: [], message: 'stub' } as never };
      const undone = gameReducer(state, { type: Actions.UNDO });
      expect(undone.activeHint).toBeNull();
    });

    it('REDO clears activeHint', () => {
      let state = createTestState();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5 },
      });
      state = gameReducer(state, { type: Actions.UNDO });
      state = { ...state, activeHint: { technique: 'NAKED_SINGLE', placement: { row: 0, col: 0, value: 5 }, eliminations: [], highlightCells: [], message: 'stub' } as never };
      const redone = gameReducer(state, { type: Actions.REDO });
      expect(redone.activeHint).toBeNull();
    });

    it('SET_NOTE clears activeHint', () => {
      const state = withActiveHint();
      const next = gameReducer(state, {
        type: Actions.SET_NOTE,
        payload: { row: 1, col: 1, number: 3 },
      });
      expect(next.activeHint).toBeNull();
    });
  });

  // Regression #219 — hintsUsed must be charged on GET_HINT (when a
  // hint is actually returned), not deferred until APPLY_HINT. Showing
  // the target cell + technique IS the costly action; deferring made
  // it trivial to bypass the per-difficulty hint limit by requesting,
  // reading, and dismissing.
  describe('hint counter charging (#219)', () => {
    const stubHint = {
      technique: 'NAKED_SINGLE',
      placement: { row: 0, col: 0, value: 5 },
      eliminations: [],
      highlightCells: [{ row: 0, col: 0, role: 'target' as const }],
      message: 'stub',
    };

    beforeEach(() => {
      mockedFindHintStep.mockReset();
    });

    it('GET_HINT increments hintsUsed when a hint is returned', () => {
      mockedFindHintStep.mockReturnValue(stubHint as never);
      const state = createTestState();
      expect(state.hintsUsed).toBe(0);
      const next = gameReducer(state, { type: Actions.GET_HINT });
      expect(next.hintsUsed).toBe(1);
      expect(next.activeHint).not.toBeNull();
    });

    it('GET_HINT does NOT increment when no hint is found', () => {
      mockedFindHintStep.mockReturnValue(null);
      const state = createTestState();
      const next = gameReducer(state, { type: Actions.GET_HINT });
      expect(next).toBe(state);
      expect(next.hintsUsed).toBe(0);
    });

    it('GET_HINT does NOT increment when hint limit already reached', () => {
      mockedFindHintStep.mockReturnValue(stubHint as never);
      // Difficulty.EASY maxHints is well under 9999; this is a hard cap.
      const state = { ...createTestState(), hintsUsed: 9999 };
      const next = gameReducer(state, { type: Actions.GET_HINT });
      expect(next).toBe(state);
      expect(next.hintsUsed).toBe(9999);
      // findHintStep should not even be invoked when over the limit
      expect(mockedFindHintStep).not.toHaveBeenCalled();
    });

    it('APPLY_HINT does NOT re-charge hintsUsed (already charged at GET_HINT)', () => {
      const state: GameState = {
        ...createTestState(),
        hintsUsed: 1,
        activeHint: stubHint as never,
      };
      const next = gameReducer(state, { type: Actions.APPLY_HINT });
      expect(next.hintsUsed).toBe(1);
      // Sanity: the placement was actually applied
      expect(next.board[0]![0]).toBe(5);
    });
  });

  describe('CHECK_SOLUTION', () => {
    it('should find conflicts on invalid board', () => {
      let state = createTestState();
      state.board[0]![0] = 5;
      state.board[0]![1] = 5; // duplicate in row
      const next = gameReducer(state, { type: Actions.CHECK_SOLUTION });
      expect(next.errors.has('0,0')).toBe(true);
      expect(next.errors.has('0,1')).toBe(true);
    });

    it('should mark game as completed when board is fully solved', () => {
      // Valid Classic Sudoku solution. Variant-specific completion tests (Diagonal, Anti-Knight, etc.)
      // should be added separately as they require variant-valid grids.
      const solved = [
        [5,3,4,6,7,8,9,1,2],
        [6,7,2,1,9,5,3,4,8],
        [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3],
        [4,2,6,8,5,3,7,9,1],
        [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4],
        [2,8,7,4,1,9,6,3,5],
        [3,4,5,2,8,6,1,7,9],
      ];
      const state = createTestState();
      state.sudokuType = 'CLASSIC';
      state.board = solved.map(r => [...r]);
      state.solution = solved.map(r => [...r]);
      // Realistic initialBoard: some cells are givens, rest are empty
      state.initialBoard = solved.map(r => r.map((v, i) => i % 3 === 0 ? v : EMPTY_CELL));
      const next = gameReducer(state, { type: Actions.CHECK_SOLUTION });
      expect(next.errors.size).toBe(0);
      expect(next.gameStatus).toBe(GAME_STATUS.COMPLETED);
    });
  });
});

describe('Undo/Redo', () => {
  it('should push history on SET_CELL_VALUE', () => {
    const state = createTestState();
    const next = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5 },
    });
    expect(next.board[0]![0]).toBe(5);
    expect(next.history.length).toBe(2);
    expect(next.historyIndex).toBe(1);
    expect(next.history[0]!.board[0]![0]).toBe(EMPTY_CELL);
  });

  it('should undo a cell value change', () => {
    let state = createTestState();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5 },
    });
    expect(state.board[0]![0]).toBe(5);
    const undone = gameReducer(state, { type: Actions.UNDO });
    expect(undone.board[0]![0]).toBe(EMPTY_CELL);
    expect(undone.historyIndex).toBe(0);
  });

  it('should redo after undo', () => {
    let state = createTestState();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5 },
    });
    expect(state.board[0]![0]).toBe(5);
    state = gameReducer(state, { type: Actions.UNDO });
    expect(state.board[0]![0]).toBe(EMPTY_CELL);
    const redone = gameReducer(state, { type: Actions.REDO });
    expect(redone.board[0]![0]).toBe(5);
    expect(redone.historyIndex).toBe(1);
  });

  it('should not undo past the beginning', () => {
    const state = createTestState();
    expect(gameReducer(state, { type: Actions.UNDO })).toBe(state);
  });

  it('should not redo past the end', () => {
    const state = createTestState();
    expect(gameReducer(state, { type: Actions.REDO })).toBe(state);
  });

  it('should truncate redo stack on new move after undo', () => {
    let state = createTestState();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5 },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 7 },
    });
    state = gameReducer(state, { type: Actions.UNDO });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 3 },
    });
    expect(state.history.length).toBe(3);
    expect(state.board[0]![1]).toBe(3);
    expect(gameReducer(state, { type: Actions.REDO })).toBe(state);
  });

  it('should push history on SET_NOTE', () => {
    const state = createTestState();
    const next = gameReducer(state, {
      type: Actions.SET_NOTE,
      payload: { row: 0, col: 0, number: 5 },
    });
    expect(next.notes.get('0,0')?.has(5)).toBe(true);
    expect(next.history.length).toBe(2);
    expect(next.historyIndex).toBe(1);
  });

  it('should undo a note toggle', () => {
    let state = createTestState();
    state = gameReducer(state, {
      type: Actions.SET_NOTE,
      payload: { row: 0, col: 0, number: 5 },
    });
    expect(state.notes.get('0,0')?.has(5)).toBe(true);
    const undone = gameReducer(state, { type: Actions.UNDO });
    expect(undone.notes.get('0,0')).toBeUndefined();
  });

  it('should handle multiple undo/redo cycles', () => {
    let state = createTestState();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 1 },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 2 },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 2, value: 3 },
    });

    state = gameReducer(state, { type: Actions.UNDO });
    state = gameReducer(state, { type: Actions.UNDO });
    state = gameReducer(state, { type: Actions.UNDO });
    expect(state.board[0]![0]).toBe(EMPTY_CELL);
    expect(state.board[0]![1]).toBe(EMPTY_CELL);
    expect(state.board[0]![2]).toBe(EMPTY_CELL);
    expect(state.historyIndex).toBe(0);

    state = gameReducer(state, { type: Actions.REDO });
    state = gameReducer(state, { type: Actions.REDO });
    state = gameReducer(state, { type: Actions.REDO });
    expect(state.board[0]![0]).toBe(1);
    expect(state.board[0]![1]).toBe(2);
    expect(state.board[0]![2]).toBe(3);
    expect(state.historyIndex).toBe(3);
  });
});

describe('isValidSavedState', () => {
  it('should accept valid state', () => {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    expect(isValidSavedState({
      board,
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
    })).toBe(true);
  });

  it('should reject null', () => {
    expect(isValidSavedState(null)).toBe(false);
  });

  it('should reject non-object', () => {
    expect(isValidSavedState('hello')).toBe(false);
    expect(isValidSavedState(42)).toBe(false);
  });

  it('should reject missing board', () => {
    expect(isValidSavedState({
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
    })).toBe(false);
  });

  it('should reject board with wrong dimensions', () => {
    expect(isValidSavedState({
      board: [[1, 2, 3]],
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
    })).toBe(false);
  });

  it('should reject board with wrong row length', () => {
    const board = Array(9).fill(null).map(() => Array(8).fill(0));
    expect(isValidSavedState({
      board,
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
    })).toBe(false);
  });

  it('should reject missing sudokuType', () => {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    expect(isValidSavedState({
      board,
      difficulty: 'EASY',
      gameStatus: 'playing',
    })).toBe(false);
  });

  it('should reject missing difficulty', () => {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    expect(isValidSavedState({
      board,
      sudokuType: 'CLASSIC',
      gameStatus: 'playing',
    })).toBe(false);
  });

  it('should reject missing gameStatus', () => {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    expect(isValidSavedState({
      board,
      difficulty: 'EASY',
      sudokuType: 'CLASSIC',
    })).toBe(false);
  });
});

describe('mistake counter', () => {
  // Helper: build a state with a known solution so we can deterministically
  // call placements right or wrong without running the real generator.
  function withSolution(): GameState {
    const state = createTestState();
    // Solution[0][0] = 5 (the rest stays empty / irrelevant for these tests).
    state.solution[0]![0] = 5;
    state.solution[0]![1] = 7;
    return state;
  }

  it('does not increment when placing the correct digit', () => {
    const state = withSolution();
    const next = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5, mistakeLimit: null },
    });
    expect(next.mistakeCount).toBe(0);
  });

  it('increments when placing a wrong digit', () => {
    const state = withSolution();
    const next = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    expect(next.mistakeCount).toBe(1);
  });

  it('does not increment when re-confirming the same wrong digit', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
    // Same wrong digit again — should be a no-op for the counter.
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
  });

  it('increments again when replacing wrong with another wrong digit', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 8, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(2);
  });

  it('does not increment when replacing wrong with the correct digit', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
  });

  it('does not increment when clearing a wrong cell', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: EMPTY_CELL, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
  });

  // D2 (research-round interview): same wrong digit at the same cell
  // counts ONE mistake total, even if the player clears between attempts.
  // Previously this counted as two — punitive on muscle-memory typos.
  it('does NOT double-count wrong-clear-same-wrong (D2 #219 logic)', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: EMPTY_CELL, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
  });

  it('does not decrement on undo', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(1);
    state = gameReducer(state, { type: Actions.UNDO });
    // Counter is monotonic — undo restores board state but not history.
    expect(state.mistakeCount).toBe(1);
  });

  it('NEW_GAME resets mistakeCount to 0', () => {
    const state = withSolution();
    state.mistakeCount = 7;
    const next = gameReducer(state, {
      type: Actions.NEW_GAME,
      payload: { difficulty: 'EASY', sudokuType: 'CLASSIC' },
    });
    expect(next.mistakeCount).toBe(0);
  });

  it('transitions to lost state when limit is reached', () => {
    let state = withSolution();
    state.solution[0]![0] = 5;
    state.solution[0]![1] = 7;
    state.solution[0]![2] = 3;
    // Limit = 2: 2 mistakes triggers lost.
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: 2 },
    });
    expect(state.gameStatus).toBe(GAME_STATUS.PLAYING);
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 9, mistakeLimit: 2 },
    });
    expect(state.mistakeCount).toBe(2);
    expect(state.gameStatus).toBe(GAME_STATUS.LOST);
  });

  it('does not transition to lost when limit is null even past threshold', () => {
    let state = withSolution();
    state.solution[0]![0] = 5;
    state.solution[0]![1] = 7;
    // Two wrong placements, no limit set.
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 9, mistakeLimit: null },
    });
    expect(state.mistakeCount).toBe(2);
    expect(state.gameStatus).toBe(GAME_STATUS.PLAYING);
  });

  it('blocks further writes once lost', () => {
    let state = withSolution();
    state.gameStatus = GAME_STATUS.LOST;
    const before = state;
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5, mistakeLimit: null },
    });
    expect(state).toBe(before);
  });

  it('SET_NOTE never affects mistakeCount', () => {
    let state = withSolution();
    state = gameReducer(state, {
      type: Actions.SET_NOTE,
      payload: { row: 0, col: 0, number: 9 },
    });
    expect(state.mistakeCount).toBe(0);
  });

  it('LOAD_STATE restores mistakeCount when present', () => {
    const state = createTestState();
    const next = gameReducer(state, {
      type: Actions.LOAD_STATE,
      payload: { mistakeCount: 4 },
    });
    expect(next.mistakeCount).toBe(4);
  });

  it('LOAD_STATE defaults mistakeCount to 0 for old saves', () => {
    const state = createTestState();
    state.mistakeCount = 99;
    const next = gameReducer(state, {
      type: Actions.LOAD_STATE,
      payload: {},
    });
    expect(next.mistakeCount).toBe(0);
  });

  // Per-cell wrongAttempts tracking (D2). Each unique wrong digit at a
  // given cell counts exactly once across the lifetime of the game.
  describe('per-cell wrongAttempts (D2)', () => {
    it('records the wrong digit in wrongAttempts on first attempt', () => {
      const state = withSolution();
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      expect(next.wrongAttempts.get('0,0')?.has(9)).toBe(true);
      expect(next.mistakeCount).toBe(1);
    });

    it('does not record correct placements in wrongAttempts', () => {
      const state = withSolution();
      const next = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 5, mistakeLimit: null },
      });
      expect(next.wrongAttempts.has('0,0')).toBe(false);
    });

    it('keeps wrongAttempts across clear (digit history is sticky)', () => {
      let state = withSolution();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: EMPTY_CELL, mistakeLimit: null },
      });
      expect(state.wrongAttempts.get('0,0')?.has(9)).toBe(true);
    });

    it('counts two distinct wrong digits at same cell as two mistakes', () => {
      let state = withSolution();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 8, mistakeLimit: null },
      });
      expect(state.mistakeCount).toBe(2);
      expect(state.wrongAttempts.get('0,0')?.has(9)).toBe(true);
      expect(state.wrongAttempts.get('0,0')?.has(8)).toBe(true);
    });

    it('does NOT re-count a digit already in wrongAttempts (third repeat)', () => {
      let state = withSolution();
      // 9 wrong, 8 wrong, 9 wrong again — third placement should not
      // bump the counter.
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 8, mistakeLimit: null },
      });
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      expect(state.mistakeCount).toBe(2);
    });

    it('tracks per-cell independently (same digit at different cells = 2 mistakes)', () => {
      let state = withSolution();
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 0, value: 9, mistakeLimit: null },
      });
      state = gameReducer(state, {
        type: Actions.SET_CELL_VALUE,
        payload: { row: 0, col: 1, value: 9, mistakeLimit: null },
      });
      expect(state.mistakeCount).toBe(2);
      expect(state.wrongAttempts.get('0,0')?.has(9)).toBe(true);
      expect(state.wrongAttempts.get('0,1')?.has(9)).toBe(true);
    });

    it('NEW_GAME resets wrongAttempts to empty Map', () => {
      const state = withSolution();
      state.wrongAttempts.set('5,5', new Set([3, 7]));
      const next = gameReducer(state, {
        type: Actions.NEW_GAME,
        payload: { difficulty: 'EASY', sudokuType: 'CLASSIC' },
      });
      expect(next.wrongAttempts.size).toBe(0);
    });

    it('LOAD_STATE deserializes wrongAttempts from saved entries', () => {
      const state = createTestState();
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: { wrongAttempts: [['0,0', [9, 8]], ['1,1', [3]]] } as never,
      });
      expect(next.wrongAttempts.get('0,0')?.has(9)).toBe(true);
      expect(next.wrongAttempts.get('0,0')?.has(8)).toBe(true);
      expect(next.wrongAttempts.get('1,1')?.has(3)).toBe(true);
    });

    it('LOAD_STATE defaults to empty Map for old saves without wrongAttempts', () => {
      const state = createTestState();
      state.wrongAttempts.set('5,5', new Set([7]));
      const next = gameReducer(state, {
        type: Actions.LOAD_STATE,
        payload: {},
      });
      expect(next.wrongAttempts.size).toBe(0);
    });
  });
});

describe('migrateSavedState', () => {
  it('should add version 1 to unversioned state', () => {
    const data: Record<string, unknown> = { board: [] };
    const result = migrateSavedState(data);
    expect(result.version).toBe(1);
  });

  it('should not downgrade version 1', () => {
    const data: Record<string, unknown> = { version: 1, board: [] };
    const result = migrateSavedState(data);
    expect(result.version).toBe(1);
  });

  it('should preserve existing fields', () => {
    const data: Record<string, unknown> = { difficulty: 'HARD', elapsedTime: 99 };
    const result = migrateSavedState(data);
    expect(result.difficulty).toBe('HARD');
    expect(result.elapsedTime).toBe(99);
  });

  it('should not mutate the input', () => {
    const data: Record<string, unknown> = { board: [] };
    const result = migrateSavedState(data);
    expect(data.version).toBeUndefined();
    expect(result).not.toBe(data);
  });
});

// Regression #218 — localStorage helpers must not propagate throws from
// SecurityError / QuotaExceededError environments (private browsing,
// blocked-domain policies, full quota). The previous code called
// localStorage.setItem/getItem/removeItem directly and crashed the
// provider mount on hostile storage.
describe('safe localStorage helpers (#218)', () => {
  function mockThrowingStorage(): Storage {
    const storage = {
      length: 0,
      clear: () => { throw new Error('SecurityError'); },
      getItem: () => { throw new Error('SecurityError'); },
      key: () => { throw new Error('SecurityError'); },
      removeItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('SecurityError'); },
    } satisfies Storage;
    return storage;
  }

  let originalStorage: Storage;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
    warnSpy.mockRestore();
  });

  it('safeSetItem swallows SecurityError instead of crashing the caller', () => {
    expect(() => safeSetItem('any-key', 'any-value')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist to localStorage:',
      expect.any(Error),
    );
  });

  it('safeRemoveItem swallows SecurityError silently (cleanup path)', () => {
    expect(() => safeRemoveItem('any-key')).not.toThrow();
    // safeRemoveItem deliberately does NOT log — it's only called from
    // already-failing paths where adding more noise hurts signal.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
