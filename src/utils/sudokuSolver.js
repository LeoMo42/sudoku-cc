import { GRID_SIZE, EMPTY_CELL } from './constants';
import { isValidMove, findEmptyCell, copyBoard } from './sudokuValidator';

/**
 * Solve sudoku using backtracking algorithm
 * @param {number[][]} board - The sudoku board (will be modified)
 * @returns {boolean} - True if solution found
 */
export function solveSudoku(board) {
  const emptyCell = findEmptyCell(board);

  // No empty cells means puzzle is solved
  if (!emptyCell) {
    return true;
  }

  const { row, col } = emptyCell;

  // Try numbers 1-9
  for (let num = 1; num <= GRID_SIZE; num++) {
    if (isValidMove(board, row, col, num)) {
      board[row][col] = num;

      // Recursively try to solve the rest
      if (solveSudoku(board)) {
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
 * @returns {number[][] | null} - Solved board or null if unsolvable
 */
export function getSolution(board) {
  const boardCopy = copyBoard(board);
  const solved = solveSudoku(boardCopy);
  return solved ? boardCopy : null;
}

/**
 * Count the number of solutions (up to a limit)
 * Used to verify puzzle has a unique solution
 * @param {number[][]} board - The sudoku board
 * @param {number} limit - Maximum solutions to count (default: 2)
 * @returns {number} - Number of solutions found (capped at limit)
 */
export function countSolutions(board, limit = 2) {
  let count = 0;

  function solve(currentBoard) {
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

      if (isValidMove(currentBoard, row, col, num)) {
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
 * @returns {boolean} - True if puzzle has exactly one solution
 */
export function hasUniqueSolution(board) {
  return countSolutions(board, 2) === 1;
}
