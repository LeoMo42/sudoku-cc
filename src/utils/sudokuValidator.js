import { GRID_SIZE, BOX_SIZE, EMPTY_CELL, SUDOKU_TYPES } from './constants';

/**
 * Check if placing a number at a specific position is valid
 * @param {number[][]} board - The sudoku board
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} num - Number to place (1-9)
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {boolean} - True if the move is valid
 */
export function isValidMove(board, row, col, num, sudokuType = 'CLASSIC') {
  // Check row
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[row][x] === num && x !== col) {
      return false;
    }
  }

  // Check column
  for (let x = 0; x < GRID_SIZE; x++) {
    if (board[x][col] === num && x !== row) {
      return false;
    }
  }

  // Check 3x3 box
  const boxStartRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxStartCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      const currentRow = boxStartRow + i;
      const currentCol = boxStartCol + j;
      if (
        board[currentRow][currentCol] === num &&
        (currentRow !== row || currentCol !== col)
      ) {
        return false;
      }
    }
  }

  // Additional checks for Diagonal Sudoku
  if (sudokuType === 'DIAGONAL') {
    // Check main diagonal (top-left to bottom-right)
    if (row === col) {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (board[i][i] === num && i !== row) {
          return false;
        }
      }
    }

    // Check anti-diagonal (top-right to bottom-left)
    if (row + col === GRID_SIZE - 1) {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (board[i][GRID_SIZE - 1 - i] === num && i !== row) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Find all conflicts (errors) on the board
 * @param {number[][]} board - The sudoku board
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {Set<string>} - Set of cell coordinates with conflicts (format: "row,col")
 */
export function findConflicts(board, sudokuType = 'CLASSIC') {
  const conflicts = new Set();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const num = board[row][col];
      if (num === EMPTY_CELL) continue;

      // Temporarily remove the number to check if it's valid
      board[row][col] = EMPTY_CELL;
      if (!isValidMove(board, row, col, num, sudokuType)) {
        conflicts.add(`${row},${col}`);
      }
      board[row][col] = num;
    }
  }

  return conflicts;
}

/**
 * Check if the board is completely filled
 * @param {number[][]} board - The sudoku board
 * @returns {boolean} - True if all cells are filled
 */
export function isComplete(board) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === EMPTY_CELL) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if the board is solved correctly
 * @param {number[][]} board - The sudoku board
 * @returns {boolean} - True if the board is completely filled and has no conflicts
 */
export function isSolved(board) {
  return isComplete(board) && findConflicts(board).size === 0;
}

/**
 * Find an empty cell on the board
 * @param {number[][]} board - The sudoku board
 * @returns {{row: number, col: number} | null} - Coordinates of empty cell or null
 */
export function findEmptyCell(board) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === EMPTY_CELL) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Create a deep copy of the board
 * @param {number[][]} board - The sudoku board
 * @returns {number[][]} - Deep copy of the board
 */
export function copyBoard(board) {
  return board.map(row => [...row]);
}
