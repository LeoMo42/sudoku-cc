import { describe, it, expect } from 'vitest';
import { gameReducer, Actions, isValidSavedState, migrateSavedState } from './GameContext';
import { GAME_STATUS, EMPTY_CELL } from '../utils/constants';
import { copyBoard } from '../utils/sudokuValidator';
import type { GameState } from '../types/index';

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
  });

  describe('CHECK_SOLUTION', () => {
    it('should find conflicts on invalid board', () => {
      let state = createTestState();
      state.board[0]![0] = 5;
      state.board[0]![1] = 5; // duplicate in row
      const next = gameReducer(state, { type: Actions.CHECK_SOLUTION });
      expect(next.errors.size).toBeGreaterThan(0);
    });

    it('should mark game as completed when board is fully solved', () => {
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
      state.board = solved.map(r => [...r]);
      state.solution = solved.map(r => [...r]);
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
    state = gameReducer(state, { type: Actions.UNDO });
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
    migrateSavedState(data);
    expect(data.version).toBeUndefined();
  });
});
