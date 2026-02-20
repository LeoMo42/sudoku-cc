import { GRID_SIZE, BOX_SIZE, EMPTY_CELL, DIFFICULTY_LEVELS, WINDOKU_WINDOWS, KING_MOVES } from './constants';
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
 * Check if both diagonals are valid (contain all digits 1-9)
 * @param {number[][]} board - The board to check
 * @returns {boolean} - True if both diagonals are valid
 */
function areDiagonalsValid(board) {
  // Check main diagonal (top-left to bottom-right)
  const mainDiag = new Set();
  for (let i = 0; i < GRID_SIZE; i++) {
    if (mainDiag.has(board[i][i]) || board[i][i] === EMPTY_CELL) {
      return false;
    }
    mainDiag.add(board[i][i]);
  }

  // Check anti-diagonal (top-right to bottom-left)
  const antiDiag = new Set();
  for (let i = 0; i < GRID_SIZE; i++) {
    const col = GRID_SIZE - 1 - i;
    if (antiDiag.has(board[i][col]) || board[i][col] === EMPTY_CELL) {
      return false;
    }
    antiDiag.add(board[i][col]);
  }

  return mainDiag.size === GRID_SIZE && antiDiag.size === GRID_SIZE;
}

/**
 * Swap two rows within the same 3x3 block
 * @param {number[][]} board - The board
 * @param {number} row1 - First row
 * @param {number} row2 - Second row
 */
function swapRows(board, row1, row2) {
  [board[row1], board[row2]] = [board[row2], board[row1]];
}

/**
 * Swap two columns within the same 3x3 block
 * @param {number[][]} board - The board
 * @param {number} col1 - First column
 * @param {number} col2 - Second column
 */
function swapCols(board, col1, col2) {
  for (let r = 0; r < GRID_SIZE; r++) {
    [board[r][col1], board[r][col2]] = [board[r][col2], board[r][col1]];
  }
}

/**
 * Try to fix diagonals by applying valid sudoku transformations
 * @param {number[][]} board - The board to fix
 * @returns {number[][] | null} - Fixed board or null
 */
function tryFixDiagonals(board) {
  // First check what's wrong with current diagonals
  const mainDiag = [];
  const antiDiag = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    mainDiag.push(board[i][i]);
    antiDiag.push(board[i][GRID_SIZE - 1 - i]);
  }
  console.log('  Main diagonal:', mainDiag, 'Unique:', new Set(mainDiag).size);
  console.log('  Anti diagonal:', antiDiag, 'Unique:', new Set(antiDiag).size);

  const attempts = 100; // More attempts with transformations

  for (let attempt = 0; attempt < attempts; attempt++) {
    const newBoard = copyBoard(board);

    // Try random valid transformations
    const transformType = Math.floor(Math.random() * 3);

    if (transformType === 0) {
      // Swap two rows within same block
      const block = Math.floor(Math.random() * 3); // 0, 1, or 2
      const baseRow = block * 3;
      const offset1 = Math.floor(Math.random() * 3);
      const offset2 = (offset1 + 1 + Math.floor(Math.random() * 2)) % 3;
      swapRows(newBoard, baseRow + offset1, baseRow + offset2);
    } else if (transformType === 1) {
      // Swap two columns within same block
      const block = Math.floor(Math.random() * 3);
      const baseCol = block * 3;
      const offset1 = Math.floor(Math.random() * 3);
      const offset2 = (offset1 + 1 + Math.floor(Math.random() * 2)) % 3;
      swapCols(newBoard, baseCol + offset1, baseCol + offset2);
    } else {
      // Swap digits
      const digit1 = Math.floor(Math.random() * 9) + 1;
      const digit2 = Math.floor(Math.random() * 9) + 1;
      if (digit1 !== digit2) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newBoard[r][c] === digit1) {
              newBoard[r][c] = digit2;
            } else if (newBoard[r][c] === digit2) {
              newBoard[r][c] = digit1;
            }
          }
        }
      }
    }

    // Check if diagonals are now valid
    if (areDiagonalsValid(newBoard)) {
      console.log(`  ✅ Fixed diagonals on swap attempt ${attempt + 1}`);
      return newBoard;
    }
  }

  console.log('  Could not fix diagonals after 100 transformation attempts');
  return null;
}

/**
 * Base valid X-Sudoku template
 * This is a known valid X-Sudoku solution that we'll permute for variety
 * Source: https://freesudoku.online/x-sudoku/
 * Main diagonal: [1, 8, 2, 3, 9, 6, 7, 5, 4] ✓
 * Anti-diagonal: [7, 1, 3, 2, 9, 5, 4, 6, 8] ✓
 */
const BASE_X_SUDOKU = [
  [1, 3, 5, 8, 2, 9, 6, 4, 7],
  [9, 8, 6, 4, 7, 3, 5, 1, 2],
  [7, 4, 2, 6, 5, 1, 3, 8, 9],
  [6, 7, 1, 3, 4, 2, 8, 9, 5],
  [4, 5, 8, 1, 9, 7, 2, 6, 3],
  [2, 9, 3, 5, 8, 6, 4, 7, 1],
  [5, 1, 4, 9, 3, 8, 7, 2, 6],
  [3, 6, 7, 2, 1, 4, 9, 5, 8],
  [8, 2, 9, 7, 6, 5, 1, 3, 4],
];

/**
 * Check if all Windoku windows are valid (contain all digits 1-9)
 * @param {number[][]} board - The board to check
 * @returns {boolean} - True if all windows are valid
 */
function areWindowsValid(board) {
  for (const window of WINDOKU_WINDOWS) {
    const digits = new Set();
    for (let i = 0; i < BOX_SIZE; i++) {
      for (let j = 0; j < BOX_SIZE; j++) {
        const value = board[window.row + i][window.col + j];
        if (value === EMPTY_CELL || digits.has(value)) {
          return false;
        }
        digits.add(value);
      }
    }
    if (digits.size !== GRID_SIZE) {
      return false;
    }
  }
  return true;
}

/**
 * Generate X-Sudoku by permuting digits in the base template
 * @returns {number[][]} - Valid X-Sudoku board
 */
function generateXSudoku() {
  console.log('🎲 Generating X-Sudoku from base template...');

  // Create a random permutation of digits 1-9
  const permutation = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Apply permutation to base template
  const board = createEmptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const originalDigit = BASE_X_SUDOKU[r][c];
      board[r][c] = permutation[originalDigit - 1];
    }
  }

  console.log('✅ X-Sudoku generated successfully via digit permutation');
  console.log('  Permutation:', [1, 2, 3, 4, 5, 6, 7, 8, 9], '→', permutation);

  return board;
}

/**
 * Generate Windoku by trying classic sudoku until windows are valid
 * @returns {number[][]} - Valid Windoku board
 */
function generateWindoku() {
  console.log('🎲 Generating Windoku...');

  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a classic sudoku
    const board = createEmptyBoard();
    fillDiagonal(board);
    fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });

    // Check if windows are valid
    if (areWindowsValid(board)) {
      console.log(`✅ Windoku generated successfully on attempt ${attempt + 1}`);
      return board;
    }
  }

  console.warn(`❌ Could not generate valid Windoku after ${maxAttempts} attempts, using classic`);
  // Fallback to classic
  const board = createEmptyBoard();
  fillDiagonal(board);
  fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });
  return board;
}

/**
 * Generate Anti-Knight Sudoku using backtracking with knight constraints
 * @returns {number[][]} - Valid Anti-Knight board
 */
function generateAntiKnight() {
  console.log('🎲 Generating Anti-Knight Sudoku...');

  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = createEmptyBoard();
    fillDiagonal(board);

    // Try to fill with anti-knight constraints
    if (fillRemaining(board, 0, BOX_SIZE, 'ANTI_KNIGHT', { count: 0 })) {
      console.log(`✅ Anti-Knight Sudoku generated successfully on attempt ${attempt + 1}`);
      return board;
    }
  }

  console.warn(`❌ Could not generate valid Anti-Knight after ${maxAttempts} attempts, using classic`);
  // Fallback to classic
  const board = createEmptyBoard();
  fillDiagonal(board);
  fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });
  return board;
}

/**
 * Base Anti-King Sudoku template (verified valid)
 * Source: sortedpuzzles.com
 */
const BASE_ANTI_KING_SUDOKU = [
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

/**
 * Generate Anti-King Sudoku using template-based approach with digit permutations
 * @returns {number[][]} - Valid Anti-King board
 */
function generateAntiKing() {
  console.log('🎲 Generating Anti-King Sudoku...');

  // Create a deep copy of the base template
  const board = BASE_ANTI_KING_SUDOKU.map(row => [...row]);

  // Apply random digit permutations
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = shuffle([...digits]);

  // Create permutation mapping
  const permutation = {};
  for (let i = 0; i < 9; i++) {
    permutation[digits[i]] = shuffledDigits[i];
  }

  // Apply permutation to the board
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      board[row][col] = permutation[board[row][col]];
    }
  }

  console.log('✅ Anti-King Sudoku generated using template with digit permutation');
  return board;
}

/**
 * Base Non-Consecutive Sudoku template (generated via Python)
 * Adjacent cells do not differ by 1
 */
const BASE_NON_CONSECUTIVE_SUDOKU = [
  [6, 8, 5, 2, 9, 3, 1, 7, 4],
  [9, 3, 1, 6, 4, 7, 5, 2, 8],
  [2, 7, 4, 1, 8, 5, 9, 6, 3],
  [5, 2, 7, 4, 1, 8, 3, 9, 6],
  [8, 6, 3, 9, 5, 2, 7, 4, 1],
  [1, 4, 9, 7, 3, 6, 2, 8, 5],
  [4, 9, 6, 3, 7, 1, 8, 5, 2],
  [7, 1, 8, 5, 2, 4, 6, 3, 9],
  [3, 5, 2, 8, 6, 9, 4, 1, 7],
];

/**
 * Generate Non-Consecutive Sudoku using template-based approach with digit permutations
 * @returns {number[][]} - Valid Non-Consecutive board
 */
function generateNonConsecutive() {
  console.log('🎲 Generating Non-Consecutive Sudoku...');

  // Create a deep copy of the base template
  const board = BASE_NON_CONSECUTIVE_SUDOKU.map(row => [...row]);

  // Apply random digit permutations
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = shuffle([...digits]);

  // Create permutation mapping
  const permutation = {};
  for (let i = 0; i < 9; i++) {
    permutation[digits[i]] = shuffledDigits[i];
  }

  // Apply permutation to the board
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      board[row][col] = permutation[board[row][col]];
    }
  }

  console.log('✅ Non-Consecutive Sudoku generated using template with digit permutation');
  return board;
}

/**
 * Generate a fully filled valid sudoku board
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {number[][]} - Complete sudoku board
 */
export function generateFullBoard(sudokuType = 'CLASSIC') {
  if (sudokuType === 'DIAGONAL') {
    return generateXSudoku();
  }

  if (sudokuType === 'WINDOKU') {
    return generateWindoku();
  }

  if (sudokuType === 'ANTI_KNIGHT') {
    return generateAntiKnight();
  }

  if (sudokuType === 'ANTI_KING') {
    return generateAntiKing();
  }

  if (sudokuType === 'NON_CONSECUTIVE') {
    return generateNonConsecutive();
  }

  // Classic sudoku generation
  const board = createEmptyBoard();
  fillDiagonal(board);
  fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });
  return board;
}

/**
 * Fill remaining cells using backtracking with randomization
 * @param {number[][]} board - The board
 * @param {number} row - Current row
 * @param {number} col - Current column
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @param {object} counter - Recursion counter for timeout
 * @returns {boolean} - True if successfully filled
 */
function fillRemaining(board, row, col, sudokuType = 'CLASSIC', counter = { count: 0 }) {
  // Prevent infinite recursion - if we've tried too many times, give up
  counter.count++;
  if (counter.count > 50000) {
    return false;
  }
  // Move to next row if we've filled current row
  if (col >= GRID_SIZE && row < GRID_SIZE - 1) {
    row++;
    col = 0;
  }

  // Board is complete
  if (row >= GRID_SIZE && col >= GRID_SIZE) {
    return true;
  }

  // Skip diagonal boxes (already filled) - only for CLASSIC sudoku
  if (sudokuType === 'CLASSIC') {
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
  }

  // Skip if cell is already filled
  if (board[row][col] !== EMPTY_CELL) {
    return fillRemaining(board, row, col + 1, sudokuType, counter);
  }

  // Try random numbers 1-9
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const num of numbers) {
    if (isValidMove(board, row, col, num, sudokuType)) {
      board[row][col] = num;

      if (fillRemaining(board, row, col + 1, sudokuType, counter)) {
        return true;
      }

      board[row][col] = EMPTY_CELL;
    }
  }

  return false;
}

/**
 * Generate odd/even markers for Odd-Even Sudoku
 * @param {number[][]} solution - The solution board
 * @param {number} markerPercentage - Percentage of cells to mark (0-1)
 * @returns {Map<string, string>} - Map of cell positions to 'odd' or 'even'
 */
function generateOddEvenMarkers(solution, markerPercentage = 0.35) {
  const markers = new Map();
  const totalCells = GRID_SIZE * GRID_SIZE;
  const cellsToMark = Math.floor(totalCells * markerPercentage);

  // Create array of all cell positions
  const positions = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      positions.push({ row, col });
    }
  }

  // Shuffle and select cells to mark
  const shuffled = shuffle(positions);
  const selectedCells = shuffled.slice(0, cellsToMark);

  // Assign markers based on solution value
  for (const { row, col } of selectedCells) {
    const value = solution[row][col];
    const marker = value % 2 === 0 ? 'even' : 'odd';
    markers.set(`${row},${col}`, marker);
  }

  return markers;
}

/**
 * Create a puzzle by removing numbers from a full board
 * @param {string} difficulty - Difficulty level key (EASY, MEDIUM, HARD, EXPERT)
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns {{puzzle: number[][], solution: number[][], oddEvenMarkers?: Map<string, string>}} - Puzzle and its solution
 */
export function createPuzzle(difficulty = 'MEDIUM', sudokuType = 'CLASSIC') {
  const solution = generateFullBoard(sudokuType);
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

  // For special sudoku types, uniqueness checking is very slow, so we skip it
  // and just remove the target number of cells
  const skipUniquenessCheck = sudokuType === 'DIAGONAL' ||
                               sudokuType === 'WINDOKU' ||
                               sudokuType === 'ANTI_KNIGHT' ||
                               sudokuType === 'ANTI_KING' ||
                               sudokuType === 'ODD_EVEN' ||
                               sudokuType === 'NON_CONSECUTIVE';

  // Remove cells while maintaining unique solution
  for (const { row, col } of shuffledPositions) {
    if (removed >= cellsToRemove || attempts >= maxAttempts) {
      break;
    }

    attempts++;

    const backup = puzzle[row][col];
    puzzle[row][col] = EMPTY_CELL;

    if (skipUniquenessCheck) {
      // For special sudoku types, just remove cells without checking uniqueness
      removed++;
    } else {
      // Check if puzzle still has unique solution
      // For performance, only check uniqueness every few removals
      const shouldCheckUniqueness = removed % 5 === 0 || removed >= cellsToRemove - 5;

      if (shouldCheckUniqueness && !hasUniqueSolution(puzzle, sudokuType)) {
        // Restore the cell if solution is not unique
        puzzle[row][col] = backup;
      } else {
        removed++;
      }
    }
  }

  // Generate odd/even markers for ODD_EVEN type
  let oddEvenMarkers = null;
  if (sudokuType === 'ODD_EVEN') {
    oddEvenMarkers = generateOddEvenMarkers(solution);
  }

  return { puzzle, solution, oddEvenMarkers };
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
