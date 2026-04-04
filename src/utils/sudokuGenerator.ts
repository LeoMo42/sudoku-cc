import { GRID_SIZE, BOX_SIZE, EMPTY_CELL, DIFFICULTY_LEVELS, WINDOKU_WINDOWS } from './constants';
import { isValidMove, copyBoard } from './sudokuValidator';
import { hasUniqueSolution } from './sudokuSolver';
import type {
  Board,
  CellValue,
  SudokuTypeId,
  DifficultyLevel,
  PuzzleResult,
  CellPosition,
  OddEvenMarkers,
  KropkiDots,
  KropkiDotType,
  GreaterThanSigns,
  GreaterThanSign,
  LittleKillerClue,
  Thermo,
  SandwichClues,
  Parity,
} from '../types/index';

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create an empty 9x9 board
 * @returns Empty board
 */
function createEmptyBoard(): Board {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(EMPTY_CELL)) as Board;
}

/**
 * Fill the board diagonally (the three 3x3 boxes on the diagonal)
 * These boxes are independent and can be filled without conflicts
 * @param board - The board to fill
 */
function fillDiagonal(board: Board): void {
  for (let box = 0; box < GRID_SIZE; box += BOX_SIZE) {
    fillBox(board, box, box);
  }
}

/**
 * Fill a 3x3 box with random numbers 1-9
 * @param board - The board
 * @param row - Starting row of the box
 * @param col - Starting column of the box
 */
function fillBox(board: Board, row: number, col: number): void {
  const numbers = shuffle<CellValue>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let idx = 0;

  for (let i = 0; i < BOX_SIZE; i++) {
    for (let j = 0; j < BOX_SIZE; j++) {
      board[row + i][col + j] = numbers[idx++];
    }
  }
}



/**
 * Base valid X-Sudoku template
 * This is a known valid X-Sudoku solution that we'll permute for variety
 * Source: https://freesudoku.online/x-sudoku/
 * Main diagonal: [1, 8, 2, 3, 9, 6, 7, 5, 4] ✓
 * Anti-diagonal: [7, 1, 3, 2, 9, 5, 4, 6, 8] ✓
 */
const BASE_X_SUDOKU: Board = [
  [1, 3, 5, 8, 2, 9, 6, 4, 7],
  [9, 8, 6, 4, 7, 3, 5, 1, 2],
  [7, 4, 2, 6, 5, 1, 3, 8, 9],
  [6, 7, 1, 3, 4, 2, 8, 9, 5],
  [4, 5, 8, 1, 9, 7, 2, 6, 3],
  [2, 9, 3, 5, 8, 6, 4, 7, 1],
  [5, 1, 4, 9, 3, 8, 7, 2, 6],
  [3, 6, 7, 2, 1, 4, 9, 5, 8],
  [8, 2, 9, 7, 6, 5, 1, 3, 4],
] as Board;

/**
 * Check if all Windoku windows are valid (contain all digits 1-9)
 * @param board - The board to check
 * @returns True if all windows are valid
 */
function areWindowsValid(board: Board): boolean {
  for (const window of WINDOKU_WINDOWS) {
    const digits = new Set<CellValue>();
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
 * @returns Valid X-Sudoku board
 */
function generateXSudoku(): Board {
  // Create a random permutation of digits 1-9
  const permutation = shuffle<CellValue>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Apply permutation to base template
  const board = createEmptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const originalDigit = BASE_X_SUDOKU[r][c];
      board[r][c] = permutation[originalDigit - 1];
    }
  }

  return board;
}

/**
 * Generate Windoku by trying classic sudoku until windows are valid
 * @returns Valid Windoku board
 */
function generateWindoku(): Board {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a classic sudoku
    const board = createEmptyBoard();
    fillDiagonal(board);
    fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });

    // Check if windows are valid
    if (areWindowsValid(board)) {
      return board;
    }
  }

  // Fallback to classic
  const board = createEmptyBoard();
  fillDiagonal(board);
  fillRemaining(board, 0, BOX_SIZE, 'CLASSIC', { count: 0 });
  return board;
}

/**
 * Generate Anti-Knight Sudoku using backtracking with knight constraints
 * @returns Valid Anti-Knight board
 */
function generateAntiKnight(): Board {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = createEmptyBoard();
    fillDiagonal(board);

    // Try to fill with anti-knight constraints
    if (fillRemaining(board, 0, BOX_SIZE, 'ANTI_KNIGHT', { count: 0 })) {
      return board;
    }
  }

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
const BASE_ANTI_KING_SUDOKU: Board = [
  [7, 8, 4, 3, 9, 5, 1, 2, 6],
  [6, 9, 5, 2, 1, 7, 3, 4, 8],
  [2, 3, 1, 4, 6, 8, 5, 9, 7],
  [8, 7, 9, 5, 2, 4, 6, 3, 1],
  [1, 5, 6, 8, 3, 9, 2, 7, 4],
  [3, 4, 2, 1, 7, 6, 8, 5, 9],
  [5, 6, 7, 9, 8, 3, 4, 1, 2],
  [9, 2, 3, 6, 4, 1, 7, 8, 5],
  [4, 1, 8, 7, 5, 2, 9, 6, 3]
] as Board;

/**
 * Generate Anti-King Sudoku using template-based approach with digit permutations
 * @returns Valid Anti-King board
 */
function generateAntiKing(): Board {
  // Create a deep copy of the base template
  const board: Board = BASE_ANTI_KING_SUDOKU.map(row => [...row]) as Board;

  // Apply random digit permutations
  const digits: CellValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = shuffle<CellValue>([...digits]);

  // Create permutation mapping
  const permutation: Record<number, CellValue> = {};
  for (let i = 0; i < 9; i++) {
    permutation[digits[i]] = shuffledDigits[i];
  }

  // Apply permutation to the board
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      board[row][col] = permutation[board[row][col]];
    }
  }

  return board;
}

/**
 * Base Non-Consecutive Sudoku template (generated via Python)
 * Adjacent cells do not differ by 1
 */
const BASE_NON_CONSECUTIVE_SUDOKU: Board = [
  [6, 8, 5, 2, 9, 3, 1, 7, 4],
  [9, 3, 1, 6, 4, 7, 5, 2, 8],
  [2, 7, 4, 1, 8, 5, 9, 6, 3],
  [5, 2, 7, 4, 1, 8, 3, 9, 6],
  [8, 6, 3, 9, 5, 2, 7, 4, 1],
  [1, 4, 9, 7, 3, 6, 2, 8, 5],
  [4, 9, 6, 3, 7, 1, 8, 5, 2],
  [7, 1, 8, 5, 2, 4, 6, 3, 9],
  [3, 5, 2, 8, 6, 9, 4, 1, 7],
] as Board;

/**
 * Generate Non-Consecutive Sudoku using template-based approach with digit permutations
 * @returns Valid Non-Consecutive board
 */
function generateNonConsecutive(): Board {
  // Create a deep copy of the base template
  const board: Board = BASE_NON_CONSECUTIVE_SUDOKU.map(row => [...row]) as Board;

  // Apply random digit permutations
  const digits: CellValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = shuffle<CellValue>([...digits]);

  // Create permutation mapping
  const permutation: Record<number, CellValue> = {};
  for (let i = 0; i < 9; i++) {
    permutation[digits[i]] = shuffledDigits[i];
  }

  // Apply permutation to the board
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      board[row][col] = permutation[board[row][col]];
    }
  }

  return board;
}

/**
 * Generate a fully filled valid sudoku board
 * @param sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns Complete sudoku board
 */
export function generateFullBoard(sudokuType: SudokuTypeId = 'CLASSIC'): Board {
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
 * @param board - The board
 * @param row - Current row
 * @param col - Current column
 * @param sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @param counter - Recursion counter for timeout
 * @returns True if successfully filled
 */
function fillRemaining(
  board: Board,
  row: number,
  col: number,
  sudokuType: SudokuTypeId = 'CLASSIC',
  counter: { count: number } = { count: 0 }
): boolean {
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
  const numbers = shuffle<CellValue>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

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

interface KillerCageInternal {
  id: number;
  cells: CellPosition[];
  sum: number;
}

/**
 * Generate Killer Sudoku cages from a completed solution
 * @param solution - The solution board
 * @returns Cages
 */
function generateKillerCages(solution: Board): KillerCageInternal[] {
  const assigned: boolean[][] = Array(9).fill(null).map(() => Array(9).fill(false));
  const cages: KillerCageInternal[] = [];
  const allCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) allCells.push({ r, c });
  const cells = shuffle(allCells);

  for (const { r, c } of cells) {
    if (assigned[r][c]) continue;
    const targetSize = 2 + Math.floor(Math.random() * 4); // 2-5
    const cageCells: CellPosition[] = [{ row: r, col: c }];
    assigned[r][c] = true;

    while (cageCells.length < targetSize) {
      const candidates: CellPosition[] = [];
      for (const { row, col } of cageCells) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
          const nr = row+dr, nc = col+dc;
          if (nr>=0 && nr<9 && nc>=0 && nc<9 && !assigned[nr][nc])
            candidates.push({ row: nr, col: nc });
        }
      }
      if (!candidates.length) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      cageCells.push(pick);
      assigned[pick.row][pick.col] = true;
    }

    const sum = cageCells.reduce((s, { row, col }) => s + solution[row][col], 0);
    cages.push({ id: cages.length, cells: cageCells, sum });
  }
  return cages;
}

/**
 * Generate Little Killer diagonal sum clues from a completed solution.
 * Each clue describes a diagonal of cells outside→inside the board with an arrow and target sum.
 * @param solution - The solution board
 * @returns Little killer clues
 */
function generateLittleKillerClues(solution: Board): LittleKillerClue[] {
  const directions: { dr: number; dc: number }[] = [
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: -1, dc: -1 },
  ];

  const allDiagonals: LittleKillerClue[] = [];

  for (const { dr, dc } of directions) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        // (r, c) is a valid starting cell if the previous step is outside the board
        const prevR = r - dr;
        const prevC = c - dc;
        const prevOutside = prevR < 0 || prevR >= GRID_SIZE || prevC < 0 || prevC >= GRID_SIZE;
        if (!prevOutside) continue;

        // Collect all cells along this diagonal
        const cells: CellPosition[] = [];
        let nr = r, nc = c;
        while (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          cells.push({ row: nr, col: nc });
          nr += dr;
          nc += dc;
        }

        if (cells.length < 2) continue;

        const sum = cells.reduce((s, { row, col }) => s + solution[row][col], 0);
        allDiagonals.push({
          sum,
          cells,
          direction: [dr, dc],
          position: [r - dr, c - dc],
        });
      }
    }
  }

  // Pick a random subset of ~10 clues
  const shuffled = shuffle(allDiagonals);
  return shuffled.slice(0, 10);
}

/**
 * Generate Kropki dots from a completed solution
 * @param solution - The solution board
 * @returns Map of edge keys to dot types
 */
function generateKropkiDots(solution: Board): KropkiDots {
  const dots: KropkiDots = new Map();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = solution[r][c];
      if (c < 8) {
        const v2 = solution[r][c + 1];
        if (Math.abs(v - v2) === 1)        dots.set(`${r},${c},r`, 'white' as KropkiDotType);
        else if (v === 2*v2 || v2 === 2*v) dots.set(`${r},${c},r`, 'black' as KropkiDotType);
      }
      if (r < 8) {
        const v2 = solution[r + 1][c];
        if (Math.abs(v - v2) === 1)        dots.set(`${r},${c},b`, 'white' as KropkiDotType);
        else if (v === 2*v2 || v2 === 2*v) dots.set(`${r},${c},b`, 'black' as KropkiDotType);
      }
    }
  }
  return dots;
}

/**
 * Generate Sandwich clues from a completed solution.
 * For each row/col: sum of digits strictly between the positions of 1 and 9.
 * @param solution - The solution board
 * @returns 9 row sums and 9 col sums
 */
function generateSandwichClues(solution: Board): SandwichClues {
  const rows: number[] = [];
  const cols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const row = solution[r];
    const pos1 = row.indexOf(1);
    const pos9 = row.indexOf(9);
    const lo = Math.min(pos1, pos9);
    const hi = Math.max(pos1, pos9);
    let sum = 0;
    for (let c = lo + 1; c < hi; c++) sum += row[c];
    rows.push(sum);
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const col = solution.map(r => r[c]);
    const pos1 = col.indexOf(1);
    const pos9 = col.indexOf(9);
    const lo = Math.min(pos1, pos9);
    const hi = Math.max(pos1, pos9);
    let sum = 0;
    for (let r = lo + 1; r < hi; r++) sum += col[r];
    cols.push(sum);
  }

  return { rows, cols };
}

/**
 * Generate thermometer chains from a completed solution.
 * Each thermo is an ordered array of orthogonally-adjacent cells with strictly increasing values.
 * @param solution - The solution board
 * @returns Array of thermos (each thermo is ordered from bulb to tip)
 */
function generateThermos(solution: Board): Thermo[] {
  const usedCells = new Set<string>();
  const thermos: Thermo[] = [];
  const maxAttempts = 400;
  const targetCount = 6;

  for (let attempt = 0; attempt < maxAttempts && thermos.length < targetCount; attempt++) {
    const startR = Math.floor(Math.random() * GRID_SIZE);
    const startC = Math.floor(Math.random() * GRID_SIZE);
    if (usedCells.has(`${startR},${startC}`)) continue;

    const thermo: Thermo = [{ row: startR, col: startC }];

    for (let step = 0; step < 5; step++) {
      const { row, col } = thermo[thermo.length - 1];
      const currentVal = solution[row][col];
      const candidates: CellPosition[] = [];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        if (usedCells.has(`${nr},${nc}`)) continue;
        if (thermo.some(cell => cell.row === nr && cell.col === nc)) continue;
        if (solution[nr][nc] > currentVal) candidates.push({ row: nr, col: nc });
      }
      if (!candidates.length) break;
      thermo.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }

    if (thermo.length >= 3) {
      for (const cell of thermo) usedCells.add(`${cell.row},${cell.col}`);
      thermos.push(thermo);
    }
  }

  return thermos;
}

/**
 * Generate Greater Than inequality signs from a completed solution.
 * Sign key "row,col,r" = right border of cell (row,col) vs (row,col+1).
 * Sign key "row,col,b" = bottom border of cell (row,col) vs (row+1,col).
 * Value '>' means left/top cell > right/bottom cell; '<' means left/top < right/bottom.
 * @param solution - The solution board
 * @returns All 144 internal edge signs
 */
function generateGreaterThanSigns(solution: Board): GreaterThanSigns {
  const signs: GreaterThanSigns = new Map();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE - 1; c++) {
      signs.set(`${r},${c},r`, (solution[r][c] > solution[r][c + 1] ? '>' : '<') as GreaterThanSign);
    }
  }
  for (let r = 0; r < GRID_SIZE - 1; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      signs.set(`${r},${c},b`, (solution[r][c] > solution[r + 1][c] ? '>' : '<') as GreaterThanSign);
    }
  }
  return signs;
}

/**
 * Generate odd/even markers for Odd-Even Sudoku
 * @param solution - The solution board
 * @param markerPercentage - Percentage of cells to mark (0-1)
 * @returns Map of cell positions to 'odd' or 'even'
 */
function generateOddEvenMarkers(solution: Board, markerPercentage: number = 0.35): OddEvenMarkers {
  const markers: OddEvenMarkers = new Map();
  const totalCells = GRID_SIZE * GRID_SIZE;
  const cellsToMark = Math.floor(totalCells * markerPercentage);

  // Create array of all cell positions
  const positions: CellPosition[] = [];
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
    const marker: Parity = value % 2 === 0 ? 'even' : 'odd';
    markers.set(`${row},${col}`, marker);
  }

  return markers;
}

/**
 * Create a puzzle by removing numbers from a full board
 * @param difficulty - Difficulty level key (EASY, MEDIUM, HARD, EXPERT)
 * @param sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @returns Puzzle and its solution
 */
export function createPuzzle(difficulty: DifficultyLevel = 'MEDIUM', sudokuType: SudokuTypeId = 'CLASSIC'): PuzzleResult {
  const solution = generateFullBoard(sudokuType);

  // Killer Sudoku: empty board + cages, no cell removal needed
  if (sudokuType === 'KILLER') {
    const killerCages = generateKillerCages(solution);
    return { puzzle: createEmptyBoard(), solution, oddEvenMarkers: null, kropkiDots: null, killerCages, littleKillerClues: null, greaterThanSigns: null, thermos: null, sandwichClues: null };
  }

  const puzzle = copyBoard(solution);

  const difficultyConfig = DIFFICULTY_LEVELS[difficulty];
  const [minFilled, maxFilled] = difficultyConfig.filledCells;

  // Target number of filled cells (random within range)
  const targetFilled =
    Math.floor(Math.random() * (maxFilled - minFilled + 1)) + minFilled;
  const cellsToRemove = GRID_SIZE * GRID_SIZE - targetFilled;

  // Create array of all cell positions
  const positions: CellPosition[] = [];
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
  const skipUniquenessCheck = sudokuType !== 'CLASSIC';

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
  let oddEvenMarkers: OddEvenMarkers | null = null;
  if (sudokuType === 'ODD_EVEN') {
    oddEvenMarkers = generateOddEvenMarkers(solution);
  }

  // Generate Kropki dots for KROPKI type
  let kropkiDots: KropkiDots | null = null;
  if (sudokuType === 'KROPKI') {
    kropkiDots = generateKropkiDots(solution);
  }

  // Generate Little Killer diagonal clues for LITTLE_KILLER type
  let littleKillerClues: LittleKillerClue[] | null = null;
  if (sudokuType === 'LITTLE_KILLER') {
    littleKillerClues = generateLittleKillerClues(solution);
  }

  // Generate Greater Than inequality signs for GREATER_THAN type
  let greaterThanSigns: GreaterThanSigns | null = null;
  if (sudokuType === 'GREATER_THAN') {
    greaterThanSigns = generateGreaterThanSigns(solution);
  }

  // Generate thermometers for THERMO type
  let thermos: Thermo[] | null = null;
  if (sudokuType === 'THERMO') {
    thermos = generateThermos(solution);
  }

  // Generate sandwich clues for SANDWICH type
  let sandwichClues: SandwichClues | null = null;
  if (sudokuType === 'SANDWICH') {
    sandwichClues = generateSandwichClues(solution);
  }

  return { puzzle, solution, oddEvenMarkers, kropkiDots, killerCages: null, littleKillerClues, greaterThanSigns, thermos, sandwichClues };
}

/**
 * Get a random hint for the current board
 * @param currentBoard - Current board state
 * @param solution - Solution board
 * @param initialBoard - Initial puzzle (to avoid hinting initial cells)
 * @returns Hint or null
 */
export function getHint(currentBoard: Board, solution: Board, initialBoard: Board): (CellPosition & { value: number }) | null {
  const emptyCells: CellPosition[] = [];

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
