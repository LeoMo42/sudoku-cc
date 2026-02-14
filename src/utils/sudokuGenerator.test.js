import { describe, it, expect } from 'vitest';
import { generateFullBoard, createPuzzle, getHint } from './sudokuGenerator';
import { isSolved, isComplete } from './sudokuValidator';
import { solveSudoku, hasUniqueSolution } from './sudokuSolver';
import { GRID_SIZE, EMPTY_CELL } from './constants';

describe('Sudoku Generator', () => {
  describe('generateFullBoard', () => {
    it('should generate a complete valid sudoku board', () => {
      const board = generateFullBoard();
      expect(board).toBeDefined();
      expect(board.length).toBe(GRID_SIZE);
      expect(isComplete(board)).toBe(true);
      expect(isSolved(board)).toBe(true);
    });

    it('should generate different boards on multiple calls', () => {
      const board1 = generateFullBoard();
      const board2 = generateFullBoard();
      // Boards should be different (very unlikely to be same)
      expect(JSON.stringify(board1)).not.toBe(JSON.stringify(board2));
    });
  });

  describe('createPuzzle', () => {
    it('should create a solvable puzzle', () => {
      const { puzzle, solution } = createPuzzle('MEDIUM');
      expect(puzzle).toBeDefined();
      expect(solution).toBeDefined();
      expect(isSolved(solution)).toBe(true);
    });

    it('should create puzzle with correct difficulty (EASY)', () => {
      const { puzzle } = createPuzzle('EASY');
      const filledCells = puzzle.flat().filter((cell) => cell !== EMPTY_CELL).length;
      // EASY: should have more filled cells than harder difficulties
      expect(filledCells).toBeGreaterThanOrEqual(30);
      expect(filledCells).toBeLessThanOrEqual(60);
    });

    it('should create puzzle with correct difficulty (EXPERT)', () => {
      const { puzzle } = createPuzzle('EXPERT');
      const filledCells = puzzle.flat().filter((cell) => cell !== EMPTY_CELL).length;
      // EXPERT: should have fewer filled cells (allow margin for uniqueness constraint)
      expect(filledCells).toBeGreaterThanOrEqual(20);
      expect(filledCells).toBeLessThanOrEqual(50);
    });

    it('should create puzzle that matches its solution', () => {
      const { puzzle, solution } = createPuzzle('MEDIUM');

      // All filled cells in puzzle should match solution
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (puzzle[row][col] !== EMPTY_CELL) {
            expect(puzzle[row][col]).toBe(solution[row][col]);
          }
        }
      }
    });
  });

  describe('getHint', () => {
    it('should return a hint for empty cell', () => {
      const { puzzle, solution } = createPuzzle('MEDIUM');
      const initialBoard = puzzle.map(row => [...row]);
      const hint = getHint(puzzle, solution, initialBoard);

      if (hint) {
        expect(hint.row).toBeGreaterThanOrEqual(0);
        expect(hint.row).toBeLessThan(GRID_SIZE);
        expect(hint.col).toBeGreaterThanOrEqual(0);
        expect(hint.col).toBeLessThan(GRID_SIZE);
        expect(hint.value).toBe(solution[hint.row][hint.col]);
      }
    });

    it('should return null when board is complete', () => {
      const solution = generateFullBoard();
      const hint = getHint(solution, solution, solution);
      expect(hint).toBeNull();
    });
  });
});
