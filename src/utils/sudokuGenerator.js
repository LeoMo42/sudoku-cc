import { GRID_SIZE, BOX_SIZE, EMPTY_CELL, DIFFICULTY_LEVELS } from './constants';
import { isValidMove, copyBoard } from './sudokuValidator';
import { solveSudoku, hasUniqueSolution } from './sudokuSolver';

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create an empty 9x9 board
 * @returns {number[][]} - Empty board
 */
function createEmptyBoard() {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(EMPTY_CELL));
}

/**
 * Fill the board diagonally (the three 3x3 boxes on the diagonal)
 * These boxes are independent and can be filled without conflicts
 * @param {number[][]} board - The board to fill
 */
function fillDiagonal(board) {
  for (let box = 0; box < GRID_SIZE; box += BOX_SIZE) {
    fillBox(board, box, box);
  }
}

/**
 * Fill a 3x3 box with random numbers 1-9
 * @param {number[][]} board - The board
 * @param {number} row - Starting row of the box
 * @param {number} col - Starting column of the box
 */
function fillBox(board, row, col) {
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let idx = 0;

  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      board[row + i][col + j] = numbers[idx++];
    }
  }
}

/**
 * Generate a fully filled valid sudoku board
 * @returns {number[][]} - Complete sudoku board
 */
export function generateFullBoard() {
  const board = createEmptyBoard();

  // Fill diagonal boxes first (they're independent)
  fillDiagonal(board);

  // Fill remaining cells using backtracking with randomization
  fillRemaining(board, 0, BOX_SIZE);

  return board;
}

/**
 * Fill remaining cells using backtracking with randomization
 * @param {number[][]} board - The board
 * @param {number} row - Current row
 * @param {number} col - Current column
 * @returns {boolean} - True if successfully filled
 */
function fillRemaining(board, row, col) {
  // Move to next row if we've filled current row
  if (col >= GRID_SIZE && row < GRID_SIZE - 1) {
    row++;
    col = 0;
  }

  // Board is complete
  if (row >= GRID_SIZE && col >= GRID_SIZE) {
    return true;
  }

  // Skip diagonal boxes (already filled)
  if (row < BOX_SIZE) {
    if (col < BOX_SIZE) col = BOX_SIZE;
  } else if (row < GRID_SIZE - BOX_SIZE) {
    if (col === Math.floor(row / BOX_SIZE) * BOX_SIZE) {
      col += BOX_SIZE;
    }
  } else {
    if (col === GRID_SIZE - BOX_SIZE) {
      row++;
      col = 0;
      if (row >= GRID_SIZE) return true;
    }
  }

  // Skip if cell is already filled
  if (board[row][col] !== EMPTY_CELL) {
    return fillRemaining(board, row, col + 1);
  }

  // Try random numbers 1-9
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const num of numbers) {
    if (isValidMove(board, row, col, num)) {
      board[row][col] = num;

      if (fillRemaining(board, row, col + 1)) {
        return true;
      }

      board[row][col] = EMPTY_CELL;
    }
  }

  return false;
}

/**
 * Create a puzzle by removing numbers from a full board
 * @param {string} difficulty - Difficulty level key (EASY, MEDIUM, HARD, EXPERT)
 * @returns {{puzzle: number[][], solution: number[][]}} - Puzzle and its solution
 */
export function createPuzzle(difficulty = 'MEDIUM') {
  const solution = generateFullBoard();
  const puzzle = copyBoard(solution);

  const difficultyConfig = DIFFICULTY_LEVELS[difficulty];
  const [minFilled, maxFilled] = difficultyConfig.filledCells;

  // Target number of filled cells (random within range)
  const targetFilled =
    Math.floor(Math.random() * (maxFilled - minFilled + 1)) + minFilled;
  const cellsToRemove = GRID_SIZE * GRID_SIZE - targetFilled;

  // Create array of all cell positions
  const positions = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      positions.push({ row, col });
    }
  }

  // Shuffle positions for random removal
  const shuffledPositions = shuffle(positions);

  let removed = 0;
  let attempts = 0;
  const maxAttempts = GRID_SIZE * GRID_SIZE * 2;

  // Remove cells while maintaining unique solution
  for (const { row, col } of shuffledPositions) {
    if (removed >= cellsToRemove || attempts >= maxAttempts) {
      break;
    }

    attempts++;

    const backup = puzzle[row][col];
    puzzle[row][col] = EMPTY_CELL;

    // Check if puzzle still has unique solution
    // For performance, only check uniqueness every few removals
    const shouldCheckUniqueness = removed % 5 === 0 || removed >= cellsToRemove - 5;

    if (shouldCheckUniqueness && !hasUniqueSolution(puzzle)) {
      // Restore the cell if solution is not unique
      puzzle[row][col] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

/**
 * Get a random hint for the current board
 * @param {number[][]} currentBoard - Current board state
 * @param {number[][]} solution - Solution board
 * @param {number[][]} initialBoard - Initial puzzle (to avoid hinting initial cells)
 * @returns {{row: number, col: number, value: number} | null} - Hint or null
 */
export function getHint(currentBoard, solution, initialBoard) {
  const emptyCells = [];

  // Find all empty cells that are not initial cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (
        currentBoard[row][col] === EMPTY_CELL &&
        initialBoard[row][col] === EMPTY_CELL
      ) {
        emptyCells.push({ row, col });
      }
    }
  }

  // No empty cells to hint
  if (emptyCells.length === 0) {
    return null;
  }

  // Return random empty cell with its solution value
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return {
    row: randomCell.row,
    col: randomCell.col,
    value: solution[randomCell.row][randomCell.col],
  };
}
