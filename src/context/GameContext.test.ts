import { describe, it, expect } from 'vitest';
import { gameReducer, Actions } from './GameContext';
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
    // History[0] should be the original empty board
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
    state = gameReducer(state, { type: Actions.UNDO });
    expect(state.board[0]![0]).toBe(EMPTY_CELL);

    const redone = gameReducer(state, { type: Actions.REDO });
    expect(redone.board[0]![0]).toBe(5);
    expect(redone.historyIndex).toBe(1);
  });

  it('should not undo past the beginning', () => {
    const state = createTestState();
    const result = gameReducer(state, { type: Actions.UNDO });
    expect(result).toBe(state); // same reference, no change
  });

  it('should not redo past the end', () => {
    const state = createTestState();
    const result = gameReducer(state, { type: Actions.REDO });
    expect(result).toBe(state);
  });

  it('should truncate redo stack on new move after undo', () => {
    let state = createTestState();
    // Place 5, then 7
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 0, value: 5 },
    });
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 7 },
    });
    expect(state.history.length).toBe(3);

    // Undo once (back to after placing 5)
    state = gameReducer(state, { type: Actions.UNDO });
    expect(state.historyIndex).toBe(1);

    // Place 3 instead — should truncate the redo entry
    state = gameReducer(state, {
      type: Actions.SET_CELL_VALUE,
      payload: { row: 0, col: 1, value: 3 },
    });
    expect(state.history.length).toBe(3); // not 4
    expect(state.board[0]![1]).toBe(3);

    // Redo should do nothing (future was truncated)
    const afterRedo = gameReducer(state, { type: Actions.REDO });
    expect(afterRedo).toBe(state);
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

    // Undo all three
    state = gameReducer(state, { type: Actions.UNDO });
    state = gameReducer(state, { type: Actions.UNDO });
    state = gameReducer(state, { type: Actions.UNDO });
    expect(state.board[0]![0]).toBe(EMPTY_CELL);
    expect(state.board[0]![1]).toBe(EMPTY_CELL);
    expect(state.board[0]![2]).toBe(EMPTY_CELL);
    expect(state.historyIndex).toBe(0);

    // Redo all three
    state = gameReducer(state, { type: Actions.REDO });
    state = gameReducer(state, { type: Actions.REDO });
    state = gameReducer(state, { type: Actions.REDO });
    expect(state.board[0]![0]).toBe(1);
    expect(state.board[0]![1]).toBe(2);
    expect(state.board[0]![2]).toBe(3);
    expect(state.historyIndex).toBe(3);
  });
});
