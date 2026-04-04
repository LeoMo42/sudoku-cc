import { describe, it, expect } from 'vitest';
import { CandidateGrid, DIGIT_BIT, ALL_CANDIDATES, bitsToDigits, popcount } from './candidateGrid';
import type { Board, OddEvenMarkers } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => new Array(9).fill(0)) as Board;
}

// A fully filled valid board (for isSolved / contradiction tests)
const SOLVED_BOARD: Board = [
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

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe('bitsToDigits', () => {
  it('converts 0 to empty array', () => {
    expect(bitsToDigits(0)).toEqual([]);
  });

  it('converts ALL_CANDIDATES to [1..9]', () => {
    expect(bitsToDigits(ALL_CANDIDATES)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('converts single-bit masks correctly', () => {
    for (let d = 1; d <= 9; d++) {
      expect(bitsToDigits(DIGIT_BIT[d]!)).toEqual([d]);
    }
  });

  it('converts multi-bit masks correctly', () => {
    const bits = DIGIT_BIT[1]! | DIGIT_BIT[5]! | DIGIT_BIT[9]!;
    expect(bitsToDigits(bits)).toEqual([1, 5, 9]);
  });
});

describe('popcount', () => {
  it('returns 0 for 0', () => expect(popcount(0)).toBe(0));
  it('returns 9 for ALL_CANDIDATES', () => expect(popcount(ALL_CANDIDATES)).toBe(9));
  it('returns 1 for any single DIGIT_BIT', () => {
    for (let d = 1; d <= 9; d++) expect(popcount(DIGIT_BIT[d]!)).toBe(1);
  });
  it('counts correctly for mixed masks', () => {
    expect(popcount(DIGIT_BIT[1]! | DIGIT_BIT[3]! | DIGIT_BIT[7]!)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Basic construction
// ---------------------------------------------------------------------------

describe('CandidateGrid construction', () => {
  it('empty board: all cells have ALL_CANDIDATES', () => {
    const cg = new CandidateGrid(emptyBoard());
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        expect(cg.candidateBits(r, c)).toBe(ALL_CANDIDATES);
  });

  it('solved board: all cells have 0 candidates', () => {
    const cg = new CandidateGrid(SOLVED_BOARD);
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        expect(cg.candidateBits(r, c)).toBe(0);
  });

  it('partial board: filled cells have 0 candidates', () => {
    const board = emptyBoard();
    board[0]![0] = 5;
    const cg = new CandidateGrid(board);
    expect(cg.candidateBits(0, 0)).toBe(0);
  });

  it('propagation: placing 5 at (0,0) removes 5 from row, col, box peers', () => {
    const board = emptyBoard();
    board[0]![0] = 5;
    const cg = new CandidateGrid(board);
    // Same row
    for (let c = 1; c < 9; c++)
      expect(cg.candidateBits(0, c) & DIGIT_BIT[5]!).toBe(0);
    // Same column
    for (let r = 1; r < 9; r++)
      expect(cg.candidateBits(r, 0) & DIGIT_BIT[5]!).toBe(0);
    // Same box (top-left)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        expect(cg.candidateBits(r, c) & DIGIT_BIT[5]!).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// place() / eliminate()
// ---------------------------------------------------------------------------

describe('place()', () => {
  it('clears candidate bits for placed cell', () => {
    const cg = new CandidateGrid(emptyBoard());
    cg.place(4, 4, 7);
    expect(cg.candidateBits(4, 4)).toBe(0);
    expect(cg.board[4]![4]).toBe(7);
  });

  it('removes digit from peers after placement', () => {
    const cg = new CandidateGrid(emptyBoard());
    cg.place(0, 0, 3);
    // Row peer
    expect(cg.candidateBits(0, 5) & DIGIT_BIT[3]!).toBe(0);
    // Col peer
    expect(cg.candidateBits(7, 0) & DIGIT_BIT[3]!).toBe(0);
    // Box peer
    expect(cg.candidateBits(2, 2) & DIGIT_BIT[3]!).toBe(0);
  });
});

describe('eliminate()', () => {
  it('removes a candidate from a cell', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.candidateBits(0, 0) & DIGIT_BIT[5]!).not.toBe(0);
    cg.eliminate(0, 0, 5);
    expect(cg.candidateBits(0, 0) & DIGIT_BIT[5]!).toBe(0);
  });

  it('returns true when candidate was present', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.eliminate(0, 0, 3)).toBe(true);
  });

  it('returns false when candidate was absent', () => {
    const cg = new CandidateGrid(emptyBoard());
    cg.eliminate(0, 0, 3);
    expect(cg.eliminate(0, 0, 3)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

describe('candidates()', () => {
  it('returns array of candidate digits', () => {
    const cg = new CandidateGrid(emptyBoard());
    cg.eliminate(0, 0, 1);
    cg.eliminate(0, 0, 2);
    cg.eliminate(0, 0, 3);
    const cands = cg.candidates(0, 0);
    expect(cands).not.toContain(1);
    expect(cands).not.toContain(2);
    expect(cands).not.toContain(3);
    expect(cands).toContain(4);
  });
});

describe('candidateCount()', () => {
  it('returns 9 for fresh empty cell', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.candidateCount(0, 0)).toBe(9);
  });

  it('decrements with each elimination', () => {
    const cg = new CandidateGrid(emptyBoard());
    cg.eliminate(0, 0, 5);
    expect(cg.candidateCount(0, 0)).toBe(8);
    cg.eliminate(0, 0, 6);
    expect(cg.candidateCount(0, 0)).toBe(7);
  });
});

describe('isEmpty()', () => {
  it('returns true for unfilled cell', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.isEmpty(0, 0)).toBe(true);
  });

  it('returns false for filled cell', () => {
    const board = emptyBoard();
    board[0]![0] = 5;
    const cg = new CandidateGrid(board);
    expect(cg.isEmpty(0, 0)).toBe(false);
  });
});

describe('isSolved()', () => {
  it('returns true for solved board', () => {
    const cg = new CandidateGrid(SOLVED_BOARD);
    expect(cg.isSolved()).toBe(true);
  });

  it('returns false for empty board', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.isSolved()).toBe(false);
  });
});

describe('hasContradiction()', () => {
  it('returns false for a valid board', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.hasContradiction()).toBe(false);
  });

  it('detects contradiction when an empty cell has no candidates', () => {
    const cg = new CandidateGrid(emptyBoard());
    for (let d = 1; d <= 9; d++) cg.eliminate(0, 0, d);
    expect(cg.hasContradiction()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------

describe('getHouses()', () => {
  it('classic: 27 houses (9 rows + 9 cols + 9 boxes)', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.getHouses().length).toBe(27);
  });

  it('each house has exactly 9 cells', () => {
    const cg = new CandidateGrid(emptyBoard());
    for (const house of cg.getHouses())
      expect(house.length).toBe(9);
  });

  it('DIAGONAL: 29 houses', () => {
    const cg = new CandidateGrid(emptyBoard(), 'DIAGONAL');
    expect(cg.getHouses().length).toBe(29);
  });

  it('WINDOKU: 31 houses (27 + 4 windows)', () => {
    const cg = new CandidateGrid(emptyBoard(), 'WINDOKU');
    expect(cg.getHouses().length).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// Peers
// ---------------------------------------------------------------------------

describe('getPeers()', () => {
  it('classic: cell (4,4) has 20 distinct peers', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.getPeers(4, 4).size).toBe(20);
  });

  it('cell (0,0) has 20 distinct peers in classic', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.getPeers(0, 0).size).toBe(20);
  });

  it('arePeers: same row returns true', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.arePeers(0, 0, 0, 8)).toBe(true);
  });

  it('arePeers: same column returns true', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.arePeers(0, 0, 8, 0)).toBe(true);
  });

  it('arePeers: same box returns true', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.arePeers(0, 0, 2, 2)).toBe(true);
  });

  it('arePeers: neither row/col/box returns false', () => {
    const cg = new CandidateGrid(emptyBoard());
    expect(cg.arePeers(0, 0, 3, 3)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Variant: DIAGONAL
// ---------------------------------------------------------------------------

describe('DIAGONAL variant', () => {
  it('placing on main diagonal propagates to other diagonal cells', () => {
    const board = emptyBoard();
    board[0]![0] = 7;
    const cg = new CandidateGrid(board, 'DIAGONAL');
    // All (i, i) should not have 7
    for (let i = 1; i < 9; i++)
      expect(cg.candidateBits(i, i) & DIGIT_BIT[7]!).toBe(0);
  });

  it('placing on anti-diagonal propagates along anti-diagonal', () => {
    const board = emptyBoard();
    board[0]![8] = 3;
    const cg = new CandidateGrid(board, 'DIAGONAL');
    for (let i = 1; i < 9; i++)
      expect(cg.candidateBits(i, 8 - i) & DIGIT_BIT[3]!).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Variant: ANTI_KNIGHT
// ---------------------------------------------------------------------------

describe('ANTI_KNIGHT variant', () => {
  it('placing a digit removes it from all knight-move positions', () => {
    const board = emptyBoard();
    board[4]![4] = 5;
    const cg = new CandidateGrid(board, 'ANTI_KNIGHT');
    const knightMoves: [number, number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightMoves) {
      const r = 4 + dr, c = 4 + dc;
      if (r >= 0 && r < 9 && c >= 0 && c < 9)
        expect(cg.candidateBits(r, c) & DIGIT_BIT[5]!).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Variant: ANTI_KING
// ---------------------------------------------------------------------------

describe('ANTI_KING variant', () => {
  it('placing a digit removes it from all diagonally-adjacent cells', () => {
    const board = emptyBoard();
    board[4]![4] = 9;
    const cg = new CandidateGrid(board, 'ANTI_KING');
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]] as [number, number][]) {
      expect(cg.candidateBits(4+dr, 4+dc) & DIGIT_BIT[9]!).toBe(0);
    }
    // Orthogonal should not be additionally affected (beyond standard peers)
    // R+1,C (already a row/col peer), just confirm still eliminated through normal peers
  });
});

// ---------------------------------------------------------------------------
// Variant: NON_CONSECUTIVE
// ---------------------------------------------------------------------------

describe('NON_CONSECUTIVE variant', () => {
  it('placing 5 removes 4 and 6 from orthogonal neighbours', () => {
    const board = emptyBoard();
    board[4]![4] = 5;
    const cg = new CandidateGrid(board, 'NON_CONSECUTIVE');
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number, number][]) {
      expect(cg.candidateBits(4+dr, 4+dc) & DIGIT_BIT[4]!).toBe(0);
      expect(cg.candidateBits(4+dr, 4+dc) & DIGIT_BIT[6]!).toBe(0);
    }
  });

  it('edge digit 1 only removes 2 from neighbours', () => {
    const board = emptyBoard();
    board[0]![4] = 1;
    const cg = new CandidateGrid(board, 'NON_CONSECUTIVE');
    // Below (1,4): 2 should be gone
    expect(cg.candidateBits(1, 4) & DIGIT_BIT[2]!).toBe(0);
    // No digit 0 to worry about
  });
});

// ---------------------------------------------------------------------------
// Variant: ODD_EVEN
// ---------------------------------------------------------------------------

describe('ODD_EVEN variant', () => {
  it('odd-marked cell only allows 1,3,5,7,9', () => {
    const board = emptyBoard();
    const markers: OddEvenMarkers = new Map([['0,0', 'odd']]);
    const cg = new CandidateGrid(board, 'ODD_EVEN', { oddEvenMarkers: markers });
    const cands = cg.candidates(0, 0);
    expect(cands).toEqual([1, 3, 5, 7, 9]);
  });

  it('even-marked cell only allows 2,4,6,8', () => {
    const board = emptyBoard();
    const markers: OddEvenMarkers = new Map([['0,0', 'even']]);
    const cg = new CandidateGrid(board, 'ODD_EVEN', { oddEvenMarkers: markers });
    const cands = cg.candidates(0, 0);
    expect(cands).toEqual([2, 4, 6, 8]);
  });

  it('unmarked cell is unaffected', () => {
    const board = emptyBoard();
    const markers: OddEvenMarkers = new Map([['0,0', 'odd']]);
    const cg = new CandidateGrid(board, 'ODD_EVEN', { oddEvenMarkers: markers });
    expect(cg.candidateBits(1, 1)).toBe(ALL_CANDIDATES);
  });
});
