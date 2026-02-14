import { describe, it, expect } from 'vitest';
import {
  isValidMove,
  findConflicts,
  isComplete,
  isSolved,
  copyBoard,
} from './sudokuValidator';
import { EMPTY_CELL } from './constants';

describe('Sudoku Validator', () => {
  // Valid complete sudoku board for testing
  const validBoard = [
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
      const board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL));
      expect(isValidMove(board, 0, 0, 5)).toBe(true);
    });

    it('should return false for duplicate in row', () => {
      const board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL));
      board[0][0] = 5;
      expect(isValidMove(board, 0, 1, 5)).toBe(false);
    });

    it('should return false for duplicate in column', () => {
      const board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL));
      board[0][0] = 5;
      expect(isValidMove(board, 1, 0, 5)).toBe(false);
    });

    it('should return false for duplicate in 3x3 box', () => {
      const board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL));
      board[0][0] = 5;
      expect(isValidMove(board, 1, 1, 5)).toBe(false);
    });

    it('should allow same number in same cell', () => {
      const board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL));
      board[0][0] = 5;
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
      invalidBoard[0][1] = invalidBoard[0][0]; // Duplicate in row
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
      incompleteBoard[0][0] = EMPTY_CELL;
      expect(isComplete(incompleteBoard)).toBe(false);
    });
  });

  describe('isSolved', () => {
    it('should return true for valid solved board', () => {
      expect(isSolved(validBoard)).toBe(true);
    });

    it('should return false for incomplete board', () => {
      const incompleteBoard = copyBoard(validBoard);
      incompleteBoard[0][0] = EMPTY_CELL;
      expect(isSolved(incompleteBoard)).toBe(false);
    });

    it('should return false for complete but invalid board', () => {
      const invalidBoard = copyBoard(validBoard);
      invalidBoard[0][0] = invalidBoard[0][1];
      expect(isSolved(invalidBoard)).toBe(false);
    });
  });

  describe('copyBoard', () => {
    it('should create a deep copy of board', () => {
      const copy = copyBoard(validBoard);
      expect(copy).toEqual(validBoard);
      expect(copy).not.toBe(validBoard);
      copy[0][0] = 999;
      expect(validBoard[0][0]).not.toBe(999);
    });
  });
});
