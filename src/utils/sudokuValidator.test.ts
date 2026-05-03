import { describe, it, expect } from 'vitest';
import {
  isValidMove,
  findConflicts,
  isComplete,
  isSolved,
  copyBoard,
} from './sudokuValidator';
import { EMPTY_CELL } from './constants';
import type {
  Board,
  OddEvenMarkers,
  SandwichClues,
  KillerCage,
  Thermo,
  GreaterThanSigns,
} from '../types/index';

describe('Sudoku Validator', () => {
  // Valid complete sudoku board for testing
  const validBoard: Board = [
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
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      expect(isValidMove(board, 0, 0, 5)).toBe(true);
    });

    it('should return false for duplicate in row', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 0, 1, 5)).toBe(false);
    });

    it('should return false for duplicate in column', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 1, 0, 5)).toBe(false);
    });

    it('should return false for duplicate in 3x3 box', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
      expect(isValidMove(board, 1, 1, 5)).toBe(false);
    });

    it('should allow same number in same cell', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 5;
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
      invalidBoard[0]![1] = invalidBoard[0]![0]!; // Duplicate in row
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
      incompleteBoard[0]![0] = EMPTY_CELL;
      expect(isComplete(incompleteBoard)).toBe(false);
    });
  });

  describe('isSolved', () => {
    it('should return true for valid solved board', () => {
      expect(isSolved(validBoard)).toBe(true);
    });

    it('should return false for incomplete board', () => {
      const incompleteBoard = copyBoard(validBoard);
      incompleteBoard[0]![0] = EMPTY_CELL;
      expect(isSolved(incompleteBoard)).toBe(false);
    });

    it('should return false for complete but invalid board', () => {
      const invalidBoard = copyBoard(validBoard);
      invalidBoard[0]![0] = invalidBoard[0]![1]!;
      expect(isSolved(invalidBoard)).toBe(false);
    });
  });

  describe('copyBoard', () => {
    it('should create a deep copy of board', () => {
      const copy = copyBoard(validBoard);
      expect(copy).toEqual(validBoard);
      expect(copy).not.toBe(validBoard);
      copy[0]![0] = 0; // Use 0 (EMPTY_CELL) which is a valid CellValue
      expect(validBoard[0]![0]).not.toBe(0);
    });
  });

  describe('Anti-King Sudoku', () => {
    // Valid Anti-King Sudoku from sortedpuzzles.com
    const validAntiKingBoard: Board = [
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

    it('should validate Anti-King board correctly', () => {
      const conflicts = findConflicts(validAntiKingBoard, 'ANTI_KING');
      expect(conflicts.size).toBe(0);
    });

    it('should detect invalid Anti-King move (adjacent same digits)', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 5 at adjacent cell [0,1] (should be invalid)
      expect(isValidMove(board, 0, 1, 5, 'ANTI_KING')).toBe(false);

      // Try to place 5 at diagonal adjacent cell [1,1] (should be invalid)
      expect(isValidMove(board, 1, 1, 5, 'ANTI_KING')).toBe(false);
    });

    it('should allow valid Anti-King move (non-adjacent cells)', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 5 at non-adjacent cell [3,3] (should be valid for Anti-King, but check other rules)
      // Since it's in a different 3x3 box, row, and column, it should be valid
      expect(isValidMove(board, 3, 3, 5, 'ANTI_KING')).toBe(true);
    });

    it('should detect all 8 adjacent positions in Anti-King constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at center [4,4]
      board[4]![4] = 5;

      // Check all 8 adjacent cells - all should be invalid for digit 5
      const adjacentCells: [number, number][] = [
        [3, 3], [3, 4], [3, 5],
        [4, 3],         [4, 5],
        [5, 3], [5, 4], [5, 5]
      ];

      adjacentCells.forEach(([row, col]) => {
        expect(isValidMove(board, row, col, 5, 'ANTI_KING')).toBe(false);
      });
    });

    it('should find conflicts in invalid Anti-King board', () => {
      const invalidBoard = copyBoard(validAntiKingBoard);
      // Make two adjacent cells have the same digit
      invalidBoard[0]![0] = invalidBoard[0]![1]!;

      const conflicts = findConflicts(invalidBoard, 'ANTI_KING');
      expect(conflicts.size).toBeGreaterThan(0);
      expect(conflicts.has('0,0') || conflicts.has('0,1')).toBe(true);
    });
  });

  describe('Diagonal Sudoku (X-Sudoku)', () => {
    it('should detect invalid diagonal move', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0] (on main diagonal)
      board[0]![0] = 5;

      // Try to place 5 at [4,4] (also on main diagonal) - should be invalid
      expect(isValidMove(board, 4, 4, 5, 'DIAGONAL')).toBe(false);
    });

    it('should detect invalid anti-diagonal move', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,8] (on anti-diagonal)
      board[0]![8] = 5;

      // Try to place 5 at [4,4] (also on anti-diagonal) - should be invalid
      expect(isValidMove(board, 4, 4, 5, 'DIAGONAL')).toBe(false);
    });

    it('should allow non-diagonal cells with same digit', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0] (on diagonal)
      board[0]![0] = 5;

      // Try to place 5 at [0,1] (not on diagonal) - should be valid (ignoring other rules)
      expect(isValidMove(board, 3, 4, 5, 'DIAGONAL')).toBe(true);
    });
  });

  describe('Odd-Even Sudoku', () => {
    it('should enforce odd marker constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      const oddEvenMarkers: OddEvenMarkers = new Map([['0,0', 'odd']]);

      // Try to place even number in odd-marked cell - should be invalid
      expect(isValidMove(board, 0, 0, 2, 'ODD_EVEN', oddEvenMarkers)).toBe(false);

      // Try to place odd number in odd-marked cell - should be valid
      expect(isValidMove(board, 0, 0, 3, 'ODD_EVEN', oddEvenMarkers)).toBe(true);
    });

    it('should enforce even marker constraint', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      const oddEvenMarkers: OddEvenMarkers = new Map([['0,0', 'even']]);

      // Try to place odd number in even-marked cell - should be invalid
      expect(isValidMove(board, 0, 0, 3, 'ODD_EVEN', oddEvenMarkers)).toBe(false);

      // Try to place even number in even-marked cell - should be valid
      expect(isValidMove(board, 0, 0, 4, 'ODD_EVEN', oddEvenMarkers)).toBe(true);
    });
  });

  describe('Non-Consecutive Sudoku', () => {
    it('should detect invalid move when adjacent cells differ by 1', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 4 at adjacent cell [0,1] - should be invalid (differs by 1)
      expect(isValidMove(board, 0, 1, 4, 'NON_CONSECUTIVE')).toBe(false);

      // Try to place 6 at adjacent cell [1,0] - should be invalid (differs by 1)
      expect(isValidMove(board, 1, 0, 6, 'NON_CONSECUTIVE')).toBe(false);
    });

    it('should allow valid move when adjacent cells do not differ by 1', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 3 at adjacent cell [0,1] - should be valid (differs by 2)
      expect(isValidMove(board, 0, 1, 3, 'NON_CONSECUTIVE')).toBe(true);

      // Try to place 7 at adjacent cell [1,0] - should be valid (differs by 2)
      expect(isValidMove(board, 1, 0, 7, 'NON_CONSECUTIVE')).toBe(true);
    });

    it('should check all 4 orthogonal directions', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at center [4,4]
      board[4]![4] = 5;

      // Check all 4 adjacent cells - all should be invalid for 4 or 6
      expect(isValidMove(board, 4, 3, 4, 'NON_CONSECUTIVE')).toBe(false); // left
      expect(isValidMove(board, 4, 5, 4, 'NON_CONSECUTIVE')).toBe(false); // right
      expect(isValidMove(board, 3, 4, 6, 'NON_CONSECUTIVE')).toBe(false); // up
      expect(isValidMove(board, 5, 4, 6, 'NON_CONSECUTIVE')).toBe(false); // down
    });

    it('should not check diagonal cells', () => {
      const board: Board = Array(9)
        .fill(null)
        .map(() => Array(9).fill(EMPTY_CELL)) as Board;

      // Place 5 at [0,0]
      board[0]![0] = 5;

      // Try to place 4 or 6 at diagonal cell [1,1] - should be valid (diagonals not checked)
      expect(isValidMove(board, 1, 1, 4, 'NON_CONSECUTIVE')).toBe(true);
      expect(isValidMove(board, 1, 1, 6, 'NON_CONSECUTIVE')).toBe(true);
    });
  });

  describe('Sandwich Sudoku', () => {
    const emptySandwich: SandwichClues = {
      rows: [null, null, null, null, null, null, null, null, null],
      cols: [null, null, null, null, null, null, null, null, null],
    };

    it('should reject placement when partial sum exceeds row clue', () => {
      const board: Board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
      // Row 0: 1 at col 0, 9 at col 4, between them cols 1-3
      board[0]![0] = 1;
      board[0]![4] = 9;
      board[0]![1] = 8; // sum between = 8
      const clues: SandwichClues = { ...emptySandwich, rows: [10, null, null, null, null, null, null, null, null] };

      // Placing 7 at col 2 would make sum = 8+7 = 15 > 10
      expect(isValidMove(board, 0, 2, 7, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(false);

      // Placing 2 at col 2 would make sum = 8+2 = 10 <= 10, still has empty col 3
      expect(isValidMove(board, 0, 2, 2, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(true);
    });

    it('should reject complete sandwich with wrong sum', () => {
      const board: Board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
      // Row 0: 1 at col 0, 9 at col 3, between them cols 1-2
      board[0]![0] = 1;
      board[0]![3] = 9;
      board[0]![1] = 3;
      const clues: SandwichClues = { ...emptySandwich, rows: [10, null, null, null, null, null, null, null, null] };

      // Placing 5 at col 2 makes sum = 3+5 = 8 != 10 and sandwich is complete
      expect(isValidMove(board, 0, 2, 5, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(false);

      // Placing 7 at col 2 makes sum = 3+7 = 10 == 10
      expect(isValidMove(board, 0, 2, 7, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(true);
    });

    it('should skip validation when 1 or 9 not placed yet', () => {
      const board: Board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 1; // only 1 placed, no 9
      const clues: SandwichClues = { ...emptySandwich, rows: [5, null, null, null, null, null, null, null, null] };

      // Any digit should be allowed since sandwich boundaries aren't defined yet
      expect(isValidMove(board, 0, 4, 8, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(true);
    });

    it('should check column clues too', () => {
      const board: Board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
      // Col 0: 1 at row 0, 9 at row 3, between them rows 1-2
      board[0]![0] = 1;
      board[3]![0] = 9;
      board[1]![0] = 7;
      const clues: SandwichClues = { ...emptySandwich, cols: [8, null, null, null, null, null, null, null, null] };

      // Placing 6 at row 2 col 0 makes sum = 7+6 = 13 > 8
      expect(isValidMove(board, 2, 0, 6, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(false);
    });

    it('should skip row/col with null clue', () => {
      const board: Board = Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
      board[0]![0] = 1;
      board[0]![4] = 9;
      // Row 0 clue is null — should not validate sandwich
      const clues: SandwichClues = { ...emptySandwich, rows: [null, null, null, null, null, null, null, null, null] };

      expect(isValidMove(board, 0, 2, 8, 'SANDWICH', null, null, null, null, null, null, clues)).toBe(true);
    });
  });

  // Regression #212 — partial-state checks for variant rules. The
  // pre-fix validator silently accepted placements that were already
  // impossible to complete (Killer cage that overshoots its target,
  // Thermo cell that no later cell could exceed, Greater-than signs
  // pointing into empty cells with values out of the achievable
  // range). Player would only learn about the dead-end state after
  // several more placements.

  describe('Killer Sudoku partial-state (#212)', () => {
    function emptyBoard(): Board {
      return Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
    }
    // 4-cell L-shaped cage at top-left with target sum 10.
    const cage: KillerCage = {
      sum: 10,
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 0 },
      ],
    };

    it('rejects placement when partial sum already exceeds target', () => {
      // 7 + 5 placed (sum 12); cage target 10. Adding any digit
      // would overshoot even before completion.
      const board = emptyBoard();
      board[0]![0] = 7;
      board[0]![1] = 5;
      // Try to place anything at the third cage cell — should fail
      // because partial sum 12 + N > 10 for any positive N.
      expect(isValidMove(board, 0, 2, 1, 'KILLER', null, null, [cage])).toBe(false);
    });

    it('rejects placement that makes minimum completion still overshoot', () => {
      // 4-cell cage, target 10. Place 9 at first cell. Remaining 3
      // distinct digits from {1..8} must sum to 10 - 9 = 1 — but the
      // smallest 3-subset is 1+2+3 = 6, so no completion is possible.
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 9, 'KILLER', null, null, [cage])).toBe(false);
    });

    it('accepts placement that leaves a valid completion path', () => {
      // Cage target 10, place 1 at first. Remaining 3 cells need sum
      // 9 from {2..9}\{1} — many valid combos (2+3+4=9, etc).
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 1, 'KILLER', null, null, [cage])).toBe(true);
    });

    it('rejects when no enough distinct digits left for remaining cells', () => {
      // Synthetic: a 5-cell cage in a tight area where 4 are already
      // placed with values consuming most of the small digits, then
      // the 5th cell has no distinct digit left that satisfies sum.
      const tightCage: KillerCage = {
        sum: 30,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
          { row: 0, col: 4 },
        ],
      };
      const board = emptyBoard();
      board[0]![0] = 9;
      board[0]![1] = 8;
      board[0]![2] = 7;
      board[0]![3] = 6;
      // Need sum 30 - 30 = 0 from one remaining cell. Impossible.
      expect(isValidMove(board, 0, 4, 5, 'KILLER', null, null, [tightCage])).toBe(false);
    });

    it('still accepts a complete-cage placement that hits exact sum', () => {
      // 4-cell cage sum 10, three cells filled 1+2+3 = 6, place 4 to
      // complete (1+2+3+4=10).
      const board = emptyBoard();
      board[0]![0] = 1;
      board[0]![1] = 2;
      board[0]![2] = 3;
      expect(isValidMove(board, 1, 0, 4, 'KILLER', null, null, [cage])).toBe(true);
    });

    // Distinct-digit subset sums aren't contiguous over [min, max] — the
    // earlier interval-only guard was an over-approximation. Repro:
    // 8-cell cage target 41, placed {2,4,6,7,8,9} sum 36, available
    // {1,3,5}, k=2, needed 5. 2-subsets sum to {4,6,8}; needed=5 is
    // strictly inside the interval [4,8] but unreachable, so the
    // existence check rejects where the bound check would have accepted.
    it('rejects when subset-sum is unreachable inside the interval', () => {
      const cage: KillerCage = {
        sum: 41,
        cells: [
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
          { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 },
          { row: 0, col: 6 }, { row: 0, col: 7 },
        ],
      };
      const board = emptyBoard();
      board[0]![0] = 2;
      board[0]![1] = 4;
      board[0]![2] = 6;
      board[0]![3] = 7;
      board[0]![4] = 8;
      // Place 9 at cell 5: placed sum = 36, 2 cells remain, needed = 5.
      // Available = {1,3,5}; subsets {4,6,8} skip 5.
      expect(isValidMove(board, 0, 5, 9, 'KILLER', null, null, [cage])).toBe(false);
    });

    it('accepts when subset-sum IS reachable (boundary case for the new check)', () => {
      // 6-cell cage, target 28. Three cells placed {9,4,1} sum 14;
      // candidate=3 at cell 3 makes placed={9,4,1,3} sum 17, leaving
      // 2 cells that must sum to 11 from {2,5,6,7,8}. 5+6=11 → reachable.
      const cage6: KillerCage = {
        sum: 28,
        cells: [
          { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
          { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },
        ],
      };
      const board = emptyBoard();
      board[1]![0] = 9;
      board[1]![1] = 4;
      board[1]![2] = 1;
      expect(isValidMove(board, 1, 3, 3, 'KILLER', null, null, [cage6])).toBe(true);
    });
  });

  describe('Thermo Sudoku partial-state (#212)', () => {
    function emptyBoard(): Board {
      return Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
    }
    // Length-3 horizontal thermo at row 0, cols 0-2 (bulb left).
    const len3Thermo: Thermo = [
      { row: 0, col: 0 }, // bulb (idx 0)
      { row: 0, col: 1 }, // idx 1
      { row: 0, col: 2 }, // tip (idx 2)
    ];

    it('rejects 9 at the bulb of a length-3 thermo (no room to ascend)', () => {
      // Bulb max = 9 - (3-1-0) = 7. So 8 and 9 are impossible.
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 9, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(false);
      expect(isValidMove(board, 0, 0, 8, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(false);
    });

    it('rejects 1 at the tip of a length-3 thermo (no room to descend)', () => {
      // Tip min = idx + 1 = 3. So 1 and 2 are impossible.
      const board = emptyBoard();
      expect(isValidMove(board, 0, 2, 1, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(false);
      expect(isValidMove(board, 0, 2, 2, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(false);
    });

    it('accepts valid bulb placements within range', () => {
      const board = emptyBoard();
      // Bulb range is 1..7
      for (const v of [1, 4, 7] as const) {
        expect(isValidMove(board, 0, 0, v, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(true);
      }
    });

    it('rejects gap-aware: num=4 at idx=0 with idx=2=5 forces idx=1 between 4 and 5', () => {
      // Pre-fix this passed (5 > 4 OK). Post-fix: max(num at idx=0)
      // is min(7, 5 - 2) = 3. So num=4 should fail.
      const board = emptyBoard();
      board[0]![2] = 5;
      expect(isValidMove(board, 0, 0, 4, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(false);
    });

    it('still accepts num=2 at idx=0 with idx=2=5 (idx=1 can be 3 or 4)', () => {
      const board = emptyBoard();
      board[0]![2] = 5;
      expect(isValidMove(board, 0, 0, 2, 'THERMO', null, null, null, null, null, [len3Thermo])).toBe(true);
    });
  });

  describe('Greater-than partial-state (#212)', () => {
    function emptyBoard(): Board {
      return Array(9).fill(null).map(() => Array(9).fill(EMPTY_CELL)) as Board;
    }

    it('rejects 9 on the less-than side of `<` with empty neighbor', () => {
      // Cell (0,0) `<` (0,1): num at (0,0) must be < neighbor.
      // Empty neighbor: num <= 8, so 9 must fail.
      const signs: GreaterThanSigns = new Map([['0,0,r', '<']]);
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 9, 'GREATER_THAN', null, null, null, null, signs)).toBe(false);
    });

    it('rejects 1 on the greater-than side of `>` with empty neighbor', () => {
      // Cell (0,0) `>` (0,1): num at (0,0) must be > neighbor.
      // Empty neighbor: num >= 2, so 1 must fail.
      const signs: GreaterThanSigns = new Map([['0,0,r', '>']]);
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 1, 'GREATER_THAN', null, null, null, null, signs)).toBe(false);
    });

    it('accepts valid placements with empty neighbor', () => {
      // 2..8 are valid for either side (range allows neighbor 1..9).
      const signs: GreaterThanSigns = new Map([['0,0,r', '<']]);
      const board = emptyBoard();
      expect(isValidMove(board, 0, 0, 5, 'GREATER_THAN', null, null, null, null, signs)).toBe(true);
      expect(isValidMove(board, 0, 0, 8, 'GREATER_THAN', null, null, null, null, signs)).toBe(true);
    });

    it('still validates filled-neighbor cases (regression on existing logic)', () => {
      const signs: GreaterThanSigns = new Map([['0,0,r', '>']]);
      const board = emptyBoard();
      board[0]![1] = 5;
      // num at (0,0) must be > 5. 4 fails.
      expect(isValidMove(board, 0, 0, 4, 'GREATER_THAN', null, null, null, null, signs)).toBe(false);
      // 6 succeeds.
      expect(isValidMove(board, 0, 0, 6, 'GREATER_THAN', null, null, null, null, signs)).toBe(true);
    });
  });
});
