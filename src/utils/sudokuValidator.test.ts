import { describe, it, expect } from 'vitest';
import {
  isValidMove,
  findConflicts,
  isComplete,
  isSolved,
  copyBoard,
} from './sudokuValidator';
import { EMPTY_CELL } from './constants';
import type { Board, OddEvenMarkers } from '../types/index';

describe('Sudoku Validator', () => {
  // Valid complete sudoku board for testing
  const validBoard: Board = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];

  describe('isValidMove', () => {
    it('should return true for valid move', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      expect(isValidMove(board, 0, 0, 5)).toBe(true);
    });

    it('should return false for duplicate in row', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 0, 1, 5)).toBe(false);
    });

    it('should return false for duplicate in column', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 1, 0, 5)).toBe(false);
    });

    it('should return false for duplicate in 3x3 box', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 1, 1, 5)).toBe(false);
    });

    it('should allow same number in same cell', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 0, 0, 5)).toBe(true);
    });
  });

  describe('findConflicts', () => {
    it('should find no conflicts on valid board', () => {
      const conflicts = findConflicts(validBoard);
      expect(conflicts.size).toBe(0);
    });

    it('should find conflicts on invalid board', () => {
      const invalidBoard = copyBoard(validBoard);
      invalidBoard[0]![1] = invalidBoard[0]![0]!; // Duplicate in row
      const conflicts = findConflicts(invalidBoard);
      expect(conflicts.size).toBeGreaterThan(0);
    });
  });

  describe('isComplete', () => {
    it('should return true for complete board', () => {
      expect(isComplete(validBoard)).toBe(true);
    });

    it('should return false for incomplete board', () => {
      const incompleteBoard = copyBoard(validBoard);
      incompleteBoard[0]![0] = EMPTY_CELL;
      expect(isComplete(incompleteBoard)).toBe(false);
    });
  });

  describe('isSolved', () => {
    it('should return true for valid solved board', () => {
      expect(isSolved(validBoard)).toBe(true);
    });

    it('should return false for incomplete board', () => {
      const incompleteBoard = copyBoard(validBoard);
      incompleteBoard[0]![0] = EMPTY_CELL;
      expect(isSolved(incompleteBoard)).toBe(false);
    });

    it('should return false for complete but invalid board', () => {
      const invalidBoard = copyBoard(validBoard);
      invalidBoard[0]![0] = invalidBoard[0]![1]!;
      expect(isSolved(invalidBoard)).toBe(false);
    });
  });

  describe('copyBoard', () => {
    it('should create a deep copy of board', () => {
      const copy = copyBoard(validBoard);
      expect(copy).toEqual(validBoard);
      expect(copy).not.toBe(validBoard);
      copy[0]![0] = 0; // Use 0 (EMPTY_CELL) which is a valid CellValue
      expect(validBoard[0]![0]).not.toBe(0);
    });
  });

  describe('Anti-King Sudoku', () => {
    // Valid Anti-King Sudoku from sortedpuzzles.com
    const validAntiKingBoard: Board = [
      [7, 8, 4, 3, 9, 5, 1, 2, 6],
      [6, 9, 5, 2, 1, 7, 3, 4, 8],
      [2, 3, 1, 4, 6, 8, 5, 9, 7],
      [8, 7, 9, 5, 2, 4, 6, 3, 1],
      [1, 5, 6, 8, 3, 9, 2, 7, 4],
      [3, 4, 2, 1, 7, 6, 8, 5, 9],
      [5, 6, 7, 9, 8, 3, 4, 1, 2],
      [9, 2, 3, 6, 4, 1, 7, 8, 5],
      [4, 1, 8, 7, 5, 2, 9, 6, 3]
    ];

    it('should validate Anti-King board correctly', () => {
      const conflicts = findConflicts(validAntiKingBoard, 'ANTI_KING');
      expect(conflicts.size).toBe(0);
    });

    it('should detect invalid Anti-King move (adjacent same digits)', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 5 at adjacent cell [0,1] (should be invalid)
      expect(isValidMove(board, 0, 1, 5, 'ANTI_KING')).toBe(false);

      // Try to place 5 at diagonal adjacent cell [1,1] (should be invalid)
      expect(isValidMove(board, 1, 1, 5, 'ANTI_KING')).toBe(false);
    });

    it('should allow valid Anti-King move (non-adjacent cells)', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 5 at non-adjacent cell [3,3] (should be valid for Anti-King, but check other rules)
      // Since it's in a different 3x3 box, row, and column, it should be valid
      expect(isValidMove(board, 3, 3, 5, 'ANTI_KING')).toBe(true);
    });

    it('should detect all 8 adjacent positions in Anti-King constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at center [4,4]
      board[4]![4] = 5;

      // Check all 8 adjacent cells - all should be invalid for digit 5
      const adjacentCells: [number, number][] = [
        [3, 3], [3, 4], [3, 5],
        [4, 3],         [4, 5],
        [5, 3], [5, 4], [5, 5]
      ];

      adjacentCells.forEach(([row, col]) => {
        expect(isValidMove(board, row, col, 5, 'ANTI_KING')).toBe(false);
      });
    });

    it('should find conflicts in invalid Anti-King board', () => {
      const invalidBoard = copyBoard(validAntiKingBoard);
      // Make two adjacent cells have the same digit
      invalidBoard[0]![0] = invalidBoard[0]![1]!;

      const conflicts = findConflicts(invalidBoard, 'ANTI_KING');
      expect(conflicts.size).toBeGreaterThan(0);
      expect(conflicts.has('0,0') || conflicts.has('0,1')).toBe(true);
    });
  });

  describe('Diagonal Sudoku (X-Sudoku)', () => {
    it('should detect invalid diagonal move', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0] (on main diagonal)
      board[0]![0] = 5;

      // Try to place 5 at [4,4] (also on main diagonal) - should be invalid
      expect(isValidMove(board, 4, 4, 5, 'DIAGONAL')).toBe(false);
    });

    it('should detect invalid anti-diagonal move', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,8] (on anti-diagonal)
      board[0]![8] = 5;

      // Try to place 5 at [4,4] (also on anti-diagonal) - should be invalid
      expect(isValidMove(board, 4, 4, 5, 'DIAGONAL')).toBe(false);
    });

    it('should allow non-diagonal cells with same digit', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0] (on diagonal)
      board[0]![0] = 5;

      // Try to place 5 at [0,1] (not on diagonal) - should be valid (ignoring other rules)
      expect(isValidMove(board, 3, 4, 5, 'DIAGONAL')).toBe(true);
    });
  });

  describe('Odd-Even Sudoku', () => {
    it('should enforce odd marker constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      const oddEvenMarkers: OddEvenMarkers = new Map([['0,0', 'odd']]);

      // Try to place even number in odd-marked cell - should be invalid
      expect(isValidMove(board, 0, 0, 2, 'ODD_EVEN', oddEvenMarkers)).toBe(false);

      // Try to place odd number in odd-marked cell - should be valid
      expect(isValidMove(board, 0, 0, 3, 'ODD_EVEN', oddEvenMarkers)).toBe(true);
    });

    it('should enforce even marker constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      const oddEvenMarkers: OddEvenMarkers = new Map([['0,0', 'even']]);

      // Try to place odd number in even-marked cell - should be invalid
      expect(isValidMove(board, 0, 0, 3, 'ODD_EVEN', oddEvenMarkers)).toBe(false);

      // Try to place even number in even-marked cell - should be valid
      expect(isValidMove(board, 0, 0, 4, 'ODD_EVEN', oddEvenMarkers)).toBe(true);
    });
  });

  describe('Non-Consecutive Sudoku', () => {
    it('should detect invalid move when adjacent cells differ by 1', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 4 at adjacent cell [0,1] - should be invalid (differs by 1)
      expect(isValidMove(board, 0, 1, 4, 'NON_CONSECUTIVE')).toBe(false);

      // Try to place 6 at adjacent cell [1,0] - should be invalid (differs by 1)
      expect(isValidMove(board, 1, 0, 6, 'NON_CONSECUTIVE')).toBe(false);
    });

    it('should allow valid move when adjacent cells do not differ by 1', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 3 at adjacent cell [0,1] - should be valid (differs by 2)
      expect(isValidMove(board, 0, 1, 3, 'NON_CONSECUTIVE')).toBe(true);

      // Try to place 7 at adjacent cell [1,0] - should be valid (differs by 2)
      expect(isValidMove(board, 1, 0, 7, 'NON_CONSECUTIVE')).toBe(true);
    });

    it('should check all 4 orthogonal directions', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at center [4,4]
      board[4]![4] = 5;

      // Check all 4 adjacent cells - all should be invalid for 4 or 6
      expect(isValidMove(board, 4, 3, 4, 'NON_CONSECUTIVE')).toBe(false); // left
      expect(isValidMove(board, 4, 5, 4, 'NON_CONSECUTIVE')).toBe(false); // right
      expect(isValidMove(board, 3, 4, 6, 'NON_CONSECUTIVE')).toBe(false); // up
      expect(isValidMove(board, 5, 4, 6, 'NON_CONSECUTIVE')).toBe(false); // down
    });

    it('should not check diagonal cells', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 4 or 6 at diagonal cell [1,1] - should be valid (diagonals not checked)
      expect(isValidMove(board, 1, 1, 4, 'NON_CONSECUTIVE')).toBe(true);
      expect(isValidMove(board, 1, 1, 6, 'NON_CONSECUTIVE')).toBe(true);
    });
  });
});
