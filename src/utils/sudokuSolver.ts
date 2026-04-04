import { GRID_SIZE, EMPTY_CELL } from './constants';
import { isValidMove, findEmptyCell, copyBoard } from './sudokuValidator';
import type { Board, SudokuTypeId } from '../types/index';

/**
 * Solve sudoku using backtracking algorithm
 * @param {number[][]} board - The sudoku board (will be modified)
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {boolean} - True if solution found
 */
export function solveSudoku(board: Board, sudokuType: SudokuTypeId = 'CLASSIC'): boolean {
  const emptyCell = findEmptyCell(board);

  // No empty cells means puzzle is solved
  if (!emptyCell) {
    return true;
  }

  const { row, col } = emptyCell;

  // Try numbers 1-9
  for (let num = 1; num <= GRID_SIZE; num++) {
    if (isValidMove(board, row, col, num, sudokuType)) {
      board[row][col] = num;

      // Recursively try to solve the rest
      if (solveSudoku(board, sudokuType)) {
        return true;
      }

      // Backtrack if this number doesn't lead to a solution
      board[row][col] = EMPTY_CELL;
    }
  }

  // No valid number found, need to backtrack
  return false;
}

/**
 * Get a solved copy of the board
 * @param {number[][]} board - The sudoku board
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {number[][] | null} - Solved board or null if unsolvable
 */
export function getSolution(board: Board, sudokuType: SudokuTypeId = 'CLASSIC'): Board | null {
  const boardCopy = copyBoard(board);
  const solved = solveSudoku(boardCopy, sudokuType);
  return solved ? boardCopy : null;
}

/**
 * Count the number of solutions (up to a limit)
 * Used to verify puzzle has a unique solution
 * @param {number[][]} board - The sudoku board
 * @param {number} limit - Maximum solutions to count (default: 2)
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {number} - Number of solutions found (capped at limit)
 */
export function countSolutions(board: Board, limit: number = 2, sudokuType: SudokuTypeId = 'CLASSIC'): number {
  let count = 0;

  function solve(currentBoard: Board): void {
    // If we've found enough solutions, stop searching
    if (count >= limit) {
      return;
    }

    const emptyCell = findEmptyCell(currentBoard);

    // No empty cells means we found a solution
    if (!emptyCell) {
      count++;
      return;
    }

    const { row, col } = emptyCell;

    // Try numbers 1-9
    for (let num = 1; num <= GRID_SIZE; num++) {
      if (count >= limit) break;

      if (isValidMove(currentBoard, row, col, num, sudokuType)) {
        currentBoard[row][col] = num;
        solve(currentBoard);
        currentBoard[row][col] = EMPTY_CELL;
      }
    }
  }

  const boardCopy = copyBoard(board);
  solve(boardCopy);
  return count;
}

/**
 * Check if the puzzle has a unique solution
 * @param {number[][]} board - The sudoku board
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {boolean} - True if puzzle has exactly one solution
 */
export function hasUniqueSolution(board: Board, sudokuType: SudokuTypeId = 'CLASSIC'): boolean {
  return countSolutions(board, 2, sudokuType) === 1;
}
