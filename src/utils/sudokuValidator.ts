import { GRID_SIZE, BOX_SIZE, EMPTY_CELL, WINDOKU_WINDOWS, KNIGHT_MOVES, KING_MOVES } from './constants';
import type {
  Board,
  CellValue,
  SudokuTypeId,
  CellPosition,
  OddEvenMarkers,
  KropkiDots,
  GreaterThanSigns,
  KillerCage,
  LittleKillerClue,
  Thermo,
  SandwichClues,
} from '../types/index';

/**
 * Check if placing a number at a specific position is valid
 * @param {number[][]} board - The sudoku board
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} num - Number to place (1-9)
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @param {Map<string, string>} oddEvenMarkers - Map of cell positions to 'odd' or 'even' markers
 * @returns {boolean} - True if the move is valid
 */
/**
 * Check a row or column array against its sandwich clue.
 * Returns false if the constraint is already violated; true otherwise.
 * @param {number[]} line - 9-element array (may contain EMPTY_CELL=0)
 * @param {number} clue - target sum between 1 and 9
 */
function checkSandwichLine(line: CellValue[], clue: number): boolean {
  const pos1 = line.indexOf(1);
  const pos9 = line.indexOf(9);
  if (pos1 === -1 || pos9 === -1) return true; // 1 or 9 not placed yet
  const lo = Math.min(pos1, pos9);
  const hi = Math.max(pos1, pos9);
  let sum = 0;
  let hasEmpty = false;
  for (let i = lo + 1; i < hi; i++) {
    const v = line[i];
    if (v === EMPTY_CELL) { hasEmpty = true; } else { sum += v; }
  }
  if (sum > clue) return false;          // Partial sum already exceeds
  if (!hasEmpty && sum !== clue) return false; // Complete row/col, wrong sum
  return true;
}

/**
 * True iff some k-element subset of `available` sums to exactly `target`.
 * `available` MUST be sorted ascending (caller's responsibility — the
 * Killer call site builds it via 1..9 iteration).
 *
 * Used by the Killer cage partial-state check: the earlier draft used a
 * [minSum, maxSum] interval as the guard, but distinct-digit subset
 * sums aren't contiguous over that interval (e.g. available={1,4,5},
 * k=2 covers only {5,6,9} — 7 falls in the interval but no 2-subset
 * achieves it). For the Killer call site k <= 5 (max cage size) and
 * available.length <= 9, so naive recursion with min/max pruning is
 * trivially fast.
 */
function subsetSumExists(available: number[], k: number, target: number): boolean {
  if (k === 0) return target === 0;
  if (target < 0) return false;
  if (k > available.length) return false;

  // Min/max pruning over the suffix we're still considering.
  let minSuffix = 0;
  for (let i = 0; i < k; i++) minSuffix += available[i];
  if (target < minSuffix) return false;
  let maxSuffix = 0;
  for (let i = available.length - k; i < available.length; i++) {
    maxSuffix += available[i];
  }
  if (target > maxSuffix) return false;

  // Branch on the smallest element: include it, or skip it.
  const head = available[0];
  const rest = available.slice(1);
  return (
    subsetSumExists(rest, k - 1, target - head) ||
    subsetSumExists(rest, k, target)
  );
}

export function isValidMove(
  board: Board,
  row: number,
  col: number,
  num: CellValue,
  sudokuType: SudokuTypeId = 'CLASSIC',
  oddEvenMarkers: OddEvenMarkers | null = null,
  kropkiDots: KropkiDots | null = null,
  killerCages: KillerCage[] | null = null,
  littleKillerClues: LittleKillerClue[] | null = null,
  greaterThanSigns: GreaterThanSigns | null = null,
  thermos: Thermo[] | null = null,
  sandwichClues: SandwichClues | null = null,
): boolean {
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

  // Additional checks for Windoku
  if (sudokuType === 'WINDOKU') {
    // Check if cell is in any of the 4 windows
    for (const window of WINDOKU_WINDOWS) {
      const inWindow =
        row >= window.row &&
        row < window.row + BOX_SIZE &&
        col >= window.col &&
        col < window.col + BOX_SIZE;

      if (inWindow) {
        // Check this window
        for (let i = 0; i < BOX_SIZE; i++) {
          for (let j = 0; j < BOX_SIZE; j++) {
            const currentRow = window.row + i;
            const currentCol = window.col + j;
            if (
              board[currentRow][currentCol] === num &&
              (currentRow !== row || currentCol !== col)
            ) {
              return false;
            }
          }
        }
      }
    }
  }

  // Additional checks for Anti-Knight
  if (sudokuType === 'ANTI_KNIGHT') {
    // Check all knight moves
    for (const move of KNIGHT_MOVES) {
      const knightRow = row + move.row;
      const knightCol = col + move.col;

      // Check if position is within board
      if (
        knightRow >= 0 &&
        knightRow < GRID_SIZE &&
        knightCol >= 0 &&
        knightCol < GRID_SIZE
      ) {
        if (board[knightRow][knightCol] === num) {
          return false;
        }
      }
    }
  }

  // Additional checks for Odd-Even
  if (sudokuType === 'ODD_EVEN' && oddEvenMarkers) {
    const cellKey = `${row},${col}`;
    const marker = oddEvenMarkers.get(cellKey);

    if (marker) {
      const isOdd = num % 2 === 1;
      const isEven = num % 2 === 0;

      if (marker === 'odd' && !isOdd) {
        return false; // Cell is marked as odd but number is even
      }
      if (marker === 'even' && !isEven) {
        return false; // Cell is marked as even but number is odd
      }
    }
  }

  // Additional checks for Anti-King
  if (sudokuType === 'ANTI_KING') {
    // Check all adjacent cells (king moves)
    for (const move of KING_MOVES) {
      const kingRow = row + move.row;
      const kingCol = col + move.col;

      // Check if position is within board
      if (
        kingRow >= 0 &&
        kingRow < GRID_SIZE &&
        kingCol >= 0 &&
        kingCol < GRID_SIZE
      ) {
        if (board[kingRow][kingCol] === num) {
          return false;
        }
      }
    }
  }

  // Additional checks for Non-Consecutive
  if (sudokuType === 'NON_CONSECUTIVE') {
    // Check orthogonally adjacent cells (up, down, left, right)
    const adjacentOffsets = [
      { row: -1, col: 0 },  // up
      { row: 1, col: 0 },   // down
      { row: 0, col: -1 },  // left
      { row: 0, col: 1 }    // right
    ];

    for (const offset of adjacentOffsets) {
      const adjRow = row + offset.row;
      const adjCol = col + offset.col;

      // Check if position is within board
      if (
        adjRow >= 0 &&
        adjRow < GRID_SIZE &&
        adjCol >= 0 &&
        adjCol < GRID_SIZE
      ) {
        const adjValue = board[adjRow][adjCol];
        // Adjacent cells cannot differ by exactly 1
        if (adjValue !== EMPTY_CELL && Math.abs(adjValue - num) === 1) {
          return false;
        }
      }
    }
  }

  // Additional checks for Kropki
  if (sudokuType === 'KROPKI' && kropkiDots !== null) {
    const neighbors = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    ];
    for (const { dr, dc } of neighbors) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const adjVal = board[nr][nc];
      if (adjVal === EMPTY_CELL) continue;

      let key: string;
      if (dr === 1)       key = `${row},${col},b`;
      else if (dr === -1) key = `${nr},${nc},b`;
      else if (dc === 1)  key = `${row},${col},r`;
      else                key = `${nr},${nc},r`;

      const dot = kropkiDots.get(key);
      if (dot === 'white') {
        if (Math.abs(num - adjVal) !== 1) return false;
      } else if (dot === 'black') {
        if (num !== 2 * adjVal && adjVal !== 2 * num) return false;
      } else {
        if (Math.abs(num - adjVal) === 1) return false;
        if (num === 2 * adjVal || adjVal === 2 * num) return false;
      }
    }
  }

  // Additional checks for Killer Sudoku
  if (sudokuType === 'KILLER' && killerCages !== null) {
    const cage = killerCages.find(c => c.cells.some(({ row: cr, col: cc }) => cr === row && cc === col));
    if (cage) {
      // No duplicate within cage
      for (const { row: cr, col: cc } of cage.cells) {
        if ((cr !== row || cc !== col) && board[cr][cc] === num) return false;
      }

      // Partial-state check (#212). The pre-fix code broke on the first
      // empty cell, missing two failure modes: (1) the placed digits
      // already overshoot the target, and (2) what remains can't be
      // filled because no combination of distinct unused digits sums
      // to the difference. Both lead to dead-end states that the
      // player only discovers after several more placements.
      const placed = new Set<number>([num]);
      let placedSum = num;
      let emptyCount = 0;
      for (const { row: cr, col: cc } of cage.cells) {
        if (cr === row && cc === col) continue;
        const v = board[cr][cc];
        if (v === EMPTY_CELL) {
          emptyCount++;
        } else {
          placed.add(v);
          placedSum += v;
        }
      }

      if (emptyCount === 0) {
        if (placedSum !== cage.sum) return false;
      } else {
        // Available digits = {1..9} \ placed. Need to fill emptyCount
        // distinct cells, no duplicates with placed (cage rule).
        const available: number[] = [];
        for (let d = 1; d <= 9; d++) {
          if (!placed.has(d)) available.push(d);
        }
        if (available.length < emptyCount) return false;
        const needed = cage.sum - placedSum;
        // Subset-sum existence check. The earlier draft used the
        // [minSum, maxSum] interval as the guard, but distinct-digit
        // subset sums aren't contiguous over that interval. Codex
        // PR #239 review caught a concrete miss: available={1,4,5},
        // k=2 covers sums {5,6,9} only — needed=7 is in the [5,9]
        // interval but no 2-subset achieves it. Real existence test
        // is required to close the partial-state dead-end this fix
        // claims to handle.
        if (!subsetSumExists(available, emptyCount, needed)) return false;
      }
    }
  }

  // Additional checks for Greater Than
  if (sudokuType === 'GREATER_THAN' && greaterThanSigns !== null) {
    const neighbors = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    ];
    for (const { dr, dc } of neighbors) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const adjVal = board[nr][nc];

      // Build canonical edge key and determine if num is the left/top value
      let key: string;
      let numIsLeftOrTop: boolean;
      if (dr === 1)       { key = `${row},${col},b`; numIsLeftOrTop = true; }
      else if (dr === -1) { key = `${nr},${nc},b`;   numIsLeftOrTop = false; }
      else if (dc === 1)  { key = `${row},${col},r`; numIsLeftOrTop = true; }
      else                { key = `${nr},${nc},r`;   numIsLeftOrTop = false; }

      const sign = greaterThanSigns.get(key);
      if (!sign) continue;

      // Empty neighbor: pre-fix `continue` skipped the structural
      // boundary check, so impossible placements (e.g. `9` on the
      // less-than side of a `<` with no other constraints) were
      // silently accepted (#212). The neighbor digit must be in 1-9
      // and satisfy the sign, so num is bounded:
      //   num must be greater  → neighbor in [1, num-1] → num >= 2
      //   num must be less     → neighbor in [num+1, 9] → num <= 8
      if (adjVal === EMPTY_CELL) {
        const numMustBeGreater = (numIsLeftOrTop && sign === '>') || (!numIsLeftOrTop && sign === '<');
        const numMustBeLess    = (numIsLeftOrTop && sign === '<') || (!numIsLeftOrTop && sign === '>');
        if (numMustBeGreater && num < 2) return false;
        if (numMustBeLess && num > 8) return false;
        continue;
      }

      const leftOrTop     = numIsLeftOrTop ? num    : adjVal;
      const rightOrBottom = numIsLeftOrTop ? adjVal : num;
      if (sign === '>' && !(leftOrTop > rightOrBottom)) return false;
      if (sign === '<' && !(leftOrTop < rightOrBottom)) return false;
    }
  }

  // Additional checks for Little Killer
  if (sudokuType === 'LITTLE_KILLER' && littleKillerClues !== null) {
    for (const clue of littleKillerClues) {
      const inClue = clue.cells.some(c => c.row === row && c.col === col);
      if (!inClue) continue;

      let partialSum = num;
      let complete = true;
      for (const cell of clue.cells) {
        if (cell.row === row && cell.col === col) continue;
        const v = board[cell.row][cell.col];
        if (v === EMPTY_CELL) {
          complete = false;
        } else {
          partialSum += v;
        }
      }
      // Partial sum already exceeds target
      if (partialSum > clue.sum) return false;
      // Diagonal complete but sum doesn't match
      if (complete && partialSum !== clue.sum) return false;
    }
  }

  // Additional checks for Sandwich Sudoku
  if (sudokuType === 'SANDWICH' && sandwichClues !== null) {
    const rowClue = sandwichClues.rows[row];
    if (rowClue !== null && rowClue !== undefined) {
      const rowLine = board[row].map((v, c) => c === col ? num : v);
      if (!checkSandwichLine(rowLine, rowClue)) return false;
    }
    const colClue = sandwichClues.cols[col];
    if (colClue !== null && colClue !== undefined) {
      const colLine = board.map((r, ri) => ri === row ? num : r[col]);
      if (!checkSandwichLine(colLine, colClue)) return false;
    }
  }

  // Additional checks for Thermo Sudoku
  if (sudokuType === 'THERMO' && thermos !== null) {
    for (const thermo of thermos) {
      const idx = thermo.findIndex(c => c.row === row && c.col === col);
      if (idx === -1) continue;

      // Partial-state structural check (#212). The pre-fix code only
      // compared num to filled cells before/after, missing the case
      // where empty cells transitively constrain num. Example: 9 at
      // the bulb of a length-3 thermo with later cells empty was
      // accepted, but cells beyond would need to be >9 — impossible.
      //
      // Lower bound: idx + 1 (cells before need 1..idx ascending),
      // strengthened by any filled cell at i<idx with value v
      // (num >= v + (idx - i) so cells between can fit).
      // Upper bound: 9 - (length - 1 - idx) (cells after need
      // increasing values up to 9), strengthened by any filled cell
      // at j>idx with value v (num <= v - (j - idx)).
      const len = thermo.length;
      let minNum = idx + 1;
      let maxNum = 9 - (len - 1 - idx);
      for (let i = 0; i < idx; i++) {
        const v = board[thermo[i].row][thermo[i].col];
        if (v !== EMPTY_CELL) {
          minNum = Math.max(minNum, v + (idx - i));
        }
      }
      for (let i = idx + 1; i < len; i++) {
        const v = board[thermo[i].row][thermo[i].col];
        if (v !== EMPTY_CELL) {
          maxNum = Math.min(maxNum, v - (i - idx));
        }
      }
      if (num < minNum || num > maxNum) return false;
    }
  }

  return true;
}

/**
 * Find all conflicts (errors) on the board
 * @param {number[][]} board - The sudoku board
 * @param {string} sudokuType - Type of sudoku (CLASSIC, DIAGONAL, etc.)
 * @param {Map<string, string>} oddEvenMarkers - Map of cell positions to 'odd' or 'even' markers
 * @returns {Set<string>} - Set of cell coordinates with conflicts (format: "row,col")
 */
export function findConflicts(
  board: Board,
  sudokuType: SudokuTypeId = 'CLASSIC',
  oddEvenMarkers: OddEvenMarkers | null = null,
  kropkiDots: KropkiDots | null = null,
  killerCages: KillerCage[] | null = null,
  littleKillerClues: LittleKillerClue[] | null = null,
  greaterThanSigns: GreaterThanSigns | null = null,
  thermos: Thermo[] | null = null,
  sandwichClues: SandwichClues | null = null,
): Set<string> {
  const conflicts = new Set<string>();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const num = board[row][col];
      if (num === EMPTY_CELL) continue;

      // Temporarily remove the number to check if it's valid
      board[row][col] = EMPTY_CELL;
      if (!isValidMove(board, row, col, num, sudokuType, oddEvenMarkers, kropkiDots, killerCages, littleKillerClues, greaterThanSigns, thermos, sandwichClues)) {
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
export function isComplete(board: Board): boolean {
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
 * @param {string} sudokuType - Type of sudoku
 * @param {Map<string, string>} oddEvenMarkers - Odd/even markers
 * @param {Map<string, string>} kropkiDots - Kropki dots
 * @param {Array} killerCages - Killer cages
 * @returns {boolean} - True if the board is completely filled and has no conflicts
 */
export function isSolved(
  board: Board,
  sudokuType: SudokuTypeId = 'CLASSIC',
  oddEvenMarkers: OddEvenMarkers | null = null,
  kropkiDots: KropkiDots | null = null,
  killerCages: KillerCage[] | null = null,
  littleKillerClues: LittleKillerClue[] | null = null,
  greaterThanSigns: GreaterThanSigns | null = null,
  thermos: Thermo[] | null = null,
  sandwichClues: SandwichClues | null = null,
): boolean {
  return isComplete(board) && findConflicts(board, sudokuType, oddEvenMarkers, kropkiDots, killerCages, littleKillerClues, greaterThanSigns, thermos, sandwichClues).size === 0;
}

/**
 * Find an empty cell on the board
 * @param {number[][]} board - The sudoku board
 * @returns {{row: number, col: number} | null} - Coordinates of empty cell or null
 */
export function findEmptyCell(board: Board): CellPosition | null {
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
export function copyBoard(board: Board): Board {
  return board.map(row => [...row]);
}
