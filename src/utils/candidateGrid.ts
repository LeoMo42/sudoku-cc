/**
 * CandidateGrid — bitset-based candidate tracker for Sudoku variants.
 * Ported from scripts/evaluator/candidates.py
 *
 * Representation:
 *   grid[r][c] is a 9-bit integer.
 *   Bit (d-1) being set means digit d is a candidate.
 *   Example: 0b000000101 = digits 1 and 3 are possible.
 *   ALL_CANDIDATES = 0b111111111 = 511
 *   Filled cell: grid[r][c] = 0
 */

import type {
  Board,
  CellValue,
  SudokuTypeId,
  OddEvenMarkers,
  KropkiDots,
  GreaterThanSigns,
  KillerCage,
  LittleKillerClue,
  Thermo,
  SandwichClues,
  VariantConstraints,
} from '../types/index';

export const ALL_CANDIDATES = (1 << 9) - 1; // 511

// DIGIT_BIT[d] = bitmask for digit d (d = 1..9)
export const DIGIT_BIT: number[] = [0, ...Array.from({ length: 9 }, (_, i) => 1 << i)];

const WINDOKU_WINDOWS: [number, number][] = [[1, 1], [1, 5], [5, 1], [5, 5]];

const KNIGHT_MOVES: [number, number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_DIAGONALS: [number, number][] = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ORTHOGONALS: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];

export function bitsToDigits(bits: number): number[] {
  const digits: number[] = [];
  let b = bits, d = 1;
  while (b) {
    if (b & 1) digits.push(d);
    b >>>= 1;
    d++;
  }
  return digits;
}

export function popcount(bits: number): number {
  let n = bits;
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function bitsForRange(lo: number, hi: number): number {
  let bits = 0;
  for (let d = Math.max(1, lo); d <= Math.min(9, hi); d++) bits |= DIGIT_BIT[d];
  return bits;
}

function killerValidDigits(n: number, target: number, excluded: Set<number>): Set<number> {
  const valid = new Set<number>();
  function combine(start: number, remaining: number, count: number, digits: number[]): void {
    if (count === 0) {
      if (remaining === 0) digits.forEach(d => valid.add(d));
      return;
    }
    for (let d = start; d <= 9; d++) {
      if (excluded.has(d)) continue;
      if (remaining - d < 0) break;
      digits.push(d);
      combine(d + 1, remaining - d, count - 1, digits);
      digits.pop();
    }
  }
  combine(1, target, n, []);
  return valid;
}

interface ThermoPosition {
  ti: number;
  pi: number;
}

export class CandidateGrid {
  sudokuType: SudokuTypeId;
  oddEvenMarkers: OddEvenMarkers | null;
  killerCages: KillerCage[] | null;
  kropkiDots: KropkiDots | null;
  greaterThanSigns: GreaterThanSigns | null;
  thermos: Thermo[] | null;
  sandwichClues: SandwichClues | null;
  littleKillerClues: LittleKillerClue[] | null;
  board: CellValue[][];
  grid: number[][];
  private _thermoPositions: Map<string, ThermoPosition[]>;
  private _cellToCage: Map<string, KillerCage>;
  private _cellToLK: Map<string, LittleKillerClue[]>;
  private _housesCache: [number, number][][] | null;
  private _peerCache: Map<string, Set<string>>;

  constructor(
    board: Board,
    sudokuType: SudokuTypeId = 'CLASSIC',
    {
      oddEvenMarkers = null,
      killerCages = null,
      kropkiDots = null,
      greaterThanSigns = null,
      thermos = null,
      sandwichClues = null,
      littleKillerClues = null,
    }: VariantConstraints = {}
  ) {
    this.sudokuType = sudokuType;
    this.oddEvenMarkers = oddEvenMarkers ?? null;
    this.killerCages = killerCages ?? null;
    this.kropkiDots = kropkiDots ?? null;
    this.greaterThanSigns = greaterThanSigns ?? null;
    this.thermos = thermos ?? null;
    this.sandwichClues = sandwichClues ?? null;
    this.littleKillerClues = littleKillerClues ?? null;

    // Deep-copy board
    this.board = board.map(row => [...row]);
    this.grid = Array.from({ length: 9 }, () => new Array(9).fill(0));

    // Build thermo position lookup
    this._thermoPositions = new Map(); // "r,c" → [{ti, pi}]
    if (thermos) {
      thermos.forEach((thermo, ti) => {
        thermo.forEach((cell, pi) => {
          const key = `${cell.row},${cell.col}`;
          if (!this._thermoPositions.has(key)) this._thermoPositions.set(key, []);
          this._thermoPositions.get(key)!.push({ ti, pi });
        });
      });
    }

    // Build killer cage lookup
    this._cellToCage = new Map(); // "r,c" → cage
    if (killerCages) {
      killerCages.forEach(cage => {
        cage.cells.forEach(cell => {
          this._cellToCage.set(`${cell.row},${cell.col}`, cage);
        });
      });
    }

    // Build little killer lookup
    this._cellToLK = new Map(); // "r,c" → [clue, ...]
    if (littleKillerClues) {
      littleKillerClues.forEach(clue => {
        clue.cells.forEach(cell => {
          const key = `${cell.row},${cell.col}`;
          if (!this._cellToLK.has(key)) this._cellToLK.set(key, []);
          this._cellToLK.get(key)!.push(clue);
        });
      });
    }

    this._housesCache = null;
    this._peerCache = new Map();

    this._initialize();
  }

  private _initialize(): void {
    // 1. All empty cells start with all candidates
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.grid[r][c] = this.board[r][c] !== 0 ? 0 : ALL_CANDIDATES;
      }
    }

    // 2. ODD_EVEN: restrict by parity
    // oddEvenMarkers is a Map<"r,c", 'odd'|'even'>
    if (this.sudokuType === 'ODD_EVEN' && this.oddEvenMarkers) {
      const ODD_BITS  = 0b101010101; // 1,3,5,7,9
      const EVEN_BITS = 0b010101010; // 2,4,6,8
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.board[r][c] === 0) {
            const parity = this.oddEvenMarkers.get(`${r},${c}`);
            if (parity === 'odd')  this.grid[r][c] &= ODD_BITS;
            if (parity === 'even') this.grid[r][c] &= EVEN_BITS;
          }
        }
      }
    }

    // 3. THERMO: restrict each cell by position
    if (this.sudokuType === 'THERMO' && this.thermos) {
      for (const thermo of this.thermos) {
        const n = thermo.length;
        thermo.forEach((cell, i) => {
          const { row: r, col: c } = cell;
          if (this.board[r][c] === 0) {
            const minVal = i + 1;
            const maxVal = 9 - (n - 1 - i);
            this.grid[r][c] &= bitsForRange(minVal, maxVal);
          }
        });
      }
    }

    // 4. KILLER: restrict to digits that appear in any valid combination
    if (this.sudokuType === 'KILLER' && this.killerCages) {
      for (const cage of this.killerCages) {
        const placedDigits = new Set<number>(
          cage.cells.map(cell => this.board[cell.row][cell.col]).filter(v => v !== 0)
        );
        const placedSum = [...placedDigits].reduce((a, b) => a + b, 0);
        const nEmpty = cage.cells.filter(cell => this.board[cell.row][cell.col] === 0).length;
        if (nEmpty === 0) continue;
        const remainingSum = cage.sum - placedSum;
        const valid = killerValidDigits(nEmpty, remainingSum, placedDigits);
        let validBits = 0;
        valid.forEach(d => { validBits |= DIGIT_BIT[d]; });
        cage.cells.forEach(cell => {
          const { row: r, col: c } = cell;
          if (this.board[r][c] === 0) this.grid[r][c] &= validBits;
        });
      }
    }

    // 5. Propagate all placed digits
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] !== 0) {
          this._applyPlacement(r, c, this.board[r][c] as number);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Core placement / elimination
  // -------------------------------------------------------------------------

  place(row: number, col: number, digit: number): void {
    this.board[row][col] = digit as CellValue;
    this.grid[row][col] = 0;
    this._applyPlacement(row, col, digit);
  }

  private _applyPlacement(row: number, col: number, digit: number): void {
    const bit = DIGIT_BIT[digit];

    // Standard peers: row, column, box
    for (let r = 0; r < 9; r++) this.grid[r][col] &= ~bit;
    for (let c = 0; c < 9; c++) this.grid[row][c] &= ~bit;
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        this.grid[r][c] &= ~bit;

    this.grid[row][col] = 0;

    // Variant-specific
    if (this.sudokuType === 'DIAGONAL') {
      if (row === col) {
        for (let i = 0; i < 9; i++) this.grid[i][i] &= ~bit;
        this.grid[row][col] = 0;
      }
      if (row + col === 8) {
        for (let i = 0; i < 9; i++) this.grid[i][8 - i] &= ~bit;
        this.grid[row][col] = 0;
      }
    } else if (this.sudokuType === 'WINDOKU') {
      for (const [wr, wc] of WINDOKU_WINDOWS) {
        if (wr <= row && row <= wr + 2 && wc <= col && col <= wc + 2) {
          for (let r = wr; r < wr + 3; r++)
            for (let c = wc; c < wc + 3; c++)
              this.grid[r][c] &= ~bit;
          this.grid[row][col] = 0;
          break;
        }
      }
    } else if (this.sudokuType === 'ANTI_KNIGHT') {
      for (const [dr, dc] of KNIGHT_MOVES) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 9 && c >= 0 && c < 9) this.grid[r][c] &= ~bit;
      }
    } else if (this.sudokuType === 'ANTI_KING') {
      for (const [dr, dc] of KING_DIAGONALS) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 9 && c >= 0 && c < 9) this.grid[r][c] &= ~bit;
      }
    } else if (this.sudokuType === 'NON_CONSECUTIVE') {
      const lobit = digit > 1 ? DIGIT_BIT[digit - 1] : 0;
      const hibit = digit < 9 ? DIGIT_BIT[digit + 1] : 0;
      const mask = lobit | hibit;
      for (const [dr, dc] of ORTHOGONALS) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 9 && c >= 0 && c < 9) this.grid[r][c] &= ~mask;
      }
    } else if (this.sudokuType === 'THERMO' && this.thermos) {
      this._applyThermo(row, col, digit);
    } else if (this.sudokuType === 'GREATER_THAN' && this.greaterThanSigns) {
      this._applyGreaterThan(row, col, digit);
    } else if (this.sudokuType === 'KILLER' && this.killerCages) {
      this._applyKiller(row, col, digit);
    } else if (this.sudokuType === 'KROPKI' && this.kropkiDots != null) {
      this._applyKropki(row, col, digit);
    } else if (this.sudokuType === 'SANDWICH' && this.sandwichClues) {
      this._applySandwich(row, col, digit);
    } else if (this.sudokuType === 'LITTLE_KILLER' && this.littleKillerClues) {
      this._applyLittleKiller(row, col, digit);
    }
  }

  // -------------------------------------------------------------------------
  // Variant-specific propagators
  // -------------------------------------------------------------------------

  private _applyThermo(row: number, col: number, digit: number): void {
    const key = `${row},${col}`;
    const positions = this._thermoPositions.get(key);
    if (!positions) return;
    for (const { ti, pi } of positions) {
      const thermo = this.thermos![ti];
      const geMask = bitsForRange(digit, 9);
      for (let j = 0; j < pi; j++) {
        const { row: r, col: c } = thermo[j];
        this.grid[r][c] &= ~geMask;
      }
      const leMask = bitsForRange(1, digit);
      for (let j = pi + 1; j < thermo.length; j++) {
        const { row: r, col: c } = thermo[j];
        this.grid[r][c] &= ~leMask;
      }
    }
  }

  private _applyGreaterThan(row: number, col: number, digit: number): void {
    const signs = this.greaterThanSigns!; // Map<key, '>'|'<'>
    const get = (key: string) => signs.get(key);
    const geMask = bitsForRange(digit, 9);
    const leMask = bitsForRange(1, digit);

    if (col + 1 < 9) {
      const sign = get(`${row},${col},r`);
      if (sign === '>') this.grid[row][col + 1] &= ~geMask;
      else if (sign === '<') this.grid[row][col + 1] &= ~leMask;
    }
    if (col - 1 >= 0) {
      const sign = get(`${row},${col - 1},r`);
      if (sign === '>') this.grid[row][col - 1] &= ~leMask;
      else if (sign === '<') this.grid[row][col - 1] &= ~geMask;
    }
    if (row + 1 < 9) {
      const sign = get(`${row},${col},b`);
      if (sign === '>') this.grid[row + 1][col] &= ~geMask;
      else if (sign === '<') this.grid[row + 1][col] &= ~leMask;
    }
    if (row - 1 >= 0) {
      const sign = get(`${row - 1},${col},b`);
      if (sign === '>') this.grid[row - 1][col] &= ~leMask;
      else if (sign === '<') this.grid[row - 1][col] &= ~geMask;
    }
  }

  private _applyKiller(row: number, col: number, digit: number): void {
    const cage = this._cellToCage.get(`${row},${col}`);
    if (!cage) return;
    const bit = DIGIT_BIT[digit];
    cage.cells.forEach(cell => {
      const { row: r, col: c } = cell;
      if (r !== row || c !== col) this.grid[r][c] &= ~bit;
    });
    const emptyCells = cage.cells.filter(cell => this.board[cell.row][cell.col] === 0);
    if (emptyCells.length === 1) {
      const { row: r2, col: c2 } = emptyCells[0];
      const filledSum = cage.cells
        .filter(cell => this.board[cell.row][cell.col] !== 0)
        .reduce((s, cell) => s + (this.board[cell.row][cell.col] as number), 0);
      const remaining = cage.sum - filledSum;
      if (remaining >= 1 && remaining <= 9) {
        this.grid[r2][c2] &= DIGIT_BIT[remaining];
      } else {
        this.grid[r2][c2] = 0;
      }
    }
  }

  private _applyKropki(row: number, col: number, digit: number): void {
    const dots = this.kropkiDots!; // Map<key, 'white'|'black'>
    const edges: [number, number, string][] = [];
    if (col + 1 < 9) edges.push([row, col + 1, `${row},${col},r`]);
    if (col - 1 >= 0) edges.push([row, col - 1, `${row},${col - 1},r`]);
    if (row + 1 < 9) edges.push([row + 1, col, `${row},${col},b`]);
    if (row - 1 >= 0) edges.push([row - 1, col, `${row - 1},${col},b`]);

    for (const [nr, nc, key] of edges) {
      const dot = dots.get ? dots.get(key) : (dots as unknown as Record<string, string>)[key];
      if (dot === 'white') {
        let allowed = 0;
        if (digit > 1) allowed |= DIGIT_BIT[digit - 1];
        if (digit < 9) allowed |= DIGIT_BIT[digit + 1];
        this.grid[nr][nc] &= allowed;
      } else if (dot === 'black') {
        let allowed = 0;
        if (digit * 2 <= 9) allowed |= DIGIT_BIT[digit * 2];
        if (digit % 2 === 0) allowed |= DIGIT_BIT[digit / 2];
        this.grid[nr][nc] &= allowed;
      } else {
        let elim = 0;
        if (digit > 1) elim |= DIGIT_BIT[digit - 1];
        if (digit < 9) elim |= DIGIT_BIT[digit + 1];
        if (digit * 2 <= 9) elim |= DIGIT_BIT[digit * 2];
        if (digit % 2 === 0) elim |= DIGIT_BIT[digit / 2];
        this.grid[nr][nc] &= ~elim;
      }
    }
  }

  private _applySandwich(row: number, col: number, digit: number): void {
    if (digit !== 1 && digit !== 9) return;
    const clues = this.sandwichClues!;
    this._sandwichLine(Array.from({ length: 9 }, (_, c) => [row, c] as [number, number]), clues.rows[row]);
    this._sandwichLine(Array.from({ length: 9 }, (_, r) => [r, col] as [number, number]), clues.cols[col]);
  }

  private _sandwichLine(cells: [number, number][], clue: number | null): void {
    const values = cells.map(([r, c]) => this.board[r][c]);
    const p1 = values.indexOf(1);
    const p9 = values.indexOf(9);
    if (p1 === -1 || p9 === -1) return;
    const lo = Math.min(p1, p9), hi = Math.max(p1, p9);
    const between = cells.slice(lo + 1, hi);
    if (!between.length) return;
    const emptyBetween = between.filter(([r, c]) => this.board[r][c] === 0);
    if (emptyBetween.length === 1) {
      const [r2, c2] = emptyBetween[0];
      const filled = between.reduce((s, [r, c]) => s + (this.board[r][c] as number), 0);
      const remaining = (clue ?? 0) - filled;
      if (remaining >= 1 && remaining <= 9) {
        this.grid[r2][c2] &= DIGIT_BIT[remaining];
      } else {
        this.grid[r2][c2] = 0;
      }
    }
  }

  private _applyLittleKiller(row: number, col: number, _digit: number): void {
    const clues = this._cellToLK.get(`${row},${col}`) || [];
    for (const clue of clues) {
      const emptyCells = clue.cells.filter(cell => this.board[cell.row][cell.col] === 0);
      if (emptyCells.length === 1) {
        const { row: r2, col: c2 } = emptyCells[0];
        const filled = clue.cells
          .filter(cell => this.board[cell.row][cell.col] !== 0)
          .reduce((s, cell) => s + (this.board[cell.row][cell.col] as number), 0);
        const remaining = clue.sum - filled;
        if (remaining >= 1 && remaining <= 9) {
          this.grid[r2][c2] &= DIGIT_BIT[remaining];
        } else {
          this.grid[r2][c2] = 0;
        }
      }
    }
  }

  eliminate(row: number, col: number, digit: number): boolean {
    const bit = DIGIT_BIT[digit];
    if (this.grid[row][col] & bit) {
      this.grid[row][col] &= ~bit;
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Query helpers
  // -------------------------------------------------------------------------

  candidates(row: number, col: number): number[] {
    return bitsToDigits(this.grid[row][col]);
  }

  candidateCount(row: number, col: number): number {
    return popcount(this.grid[row][col]);
  }

  candidateBits(row: number, col: number): number {
    return this.grid[row][col];
  }

  isEmpty(row: number, col: number): boolean {
    return this.board[row][col] === 0;
  }

  isSolved(): boolean {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (this.board[r][c] === 0) return false;
    return true;
  }

  hasContradiction(): boolean {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (this.board[r][c] === 0 && this.grid[r][c] === 0) return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // Houses
  // -------------------------------------------------------------------------

  getHouses(): [number, number][][] {
    if (this._housesCache) return this._housesCache;

    const houses: [number, number][][] = [];

    // Rows
    for (let r = 0; r < 9; r++)
      houses.push(Array.from({ length: 9 }, (_, c) => [r, c]));

    // Columns
    for (let c = 0; c < 9; c++)
      houses.push(Array.from({ length: 9 }, (_, r) => [r, c]));

    // 3×3 boxes
    for (let br = 0; br < 3; br++)
      for (let bc = 0; bc < 3; bc++)
        houses.push(
          Array.from({ length: 9 }, (_, i) => [br * 3 + Math.floor(i / 3), bc * 3 + (i % 3)])
        );

    if (this.sudokuType === 'DIAGONAL') {
      houses.push(Array.from({ length: 9 }, (_, i) => [i, i]));
      houses.push(Array.from({ length: 9 }, (_, i) => [i, 8 - i]));
    } else if (this.sudokuType === 'WINDOKU') {
      for (const [wr, wc] of WINDOKU_WINDOWS)
        houses.push(
          Array.from({ length: 9 }, (_, i) => [wr + Math.floor(i / 3), wc + (i % 3)])
        );
    } else if (this.sudokuType === 'KILLER' && this.killerCages) {
      for (const cage of this.killerCages)
        houses.push(cage.cells.map(cell => [cell.row, cell.col]));
    }

    this._housesCache = houses;
    return houses;
  }

  getPeers(row: number, col: number): Set<string> {
    const key = `${row},${col}`;
    if (this._peerCache.has(key)) return this._peerCache.get(key)!;

    const peers = new Set<string>();
    for (const house of this.getHouses()) {
      const inHouse = house.some(([r, c]) => r === row && c === col);
      if (inHouse) house.forEach(([r, c]) => peers.add(`${r},${c}`));
    }
    peers.delete(key);

    this._peerCache.set(key, peers);
    return peers;
  }

  // Helper: check if two cells are peers
  arePeers(r1: number, c1: number, r2: number, c2: number): boolean {
    return this.getPeers(r1, c1).has(`${r2},${c2}`);
  }
}
