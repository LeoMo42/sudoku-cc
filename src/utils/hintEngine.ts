/**
 * Hint engine — finds the next logical step using human solving techniques.
 * Ported from scripts/evaluator/techniques.py
 *
 * All techniques return a HintStep or null:
 * {
 *   technique: string,          // e.g. 'NAKED_SINGLE'
 *   difficulty: string,         // 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
 *   placement: {row, col, value} | null,
 *   eliminations: [{row, col, digit}],
 *   highlightCells: [{row, col, role}],  // role: 'target'|'cause'|'eliminate'
 *   learnMoreSlug: string,       // for future /learn/<slug> pages
 * }
 *
 * findHintStep() tries techniques from easiest to hardest, applies the first
 * found step to the candidate grid (for correct state), and returns the step.
 */

import { CandidateGrid, DIGIT_BIT, bitsToDigits, popcount } from './candidateGrid';
import type {
  Board,
  SudokuTypeId,
  DifficultyLevel,
  TechniqueName,
  HintStep,
  Placement,
  Elimination,
  HighlightCell,
  VariantConstraints,
} from '../types/index';

// ---------------------------------------------------------------------------
// Scores and difficulty levels (mirror of Python)
// ---------------------------------------------------------------------------

const TECHNIQUE_DIFFICULTY: Record<TechniqueName, DifficultyLevel> = {
  NAKED_SINGLE:        'EASY',
  HIDDEN_SINGLE:       'MEDIUM',
  LOCKED_CANDIDATES:   'MEDIUM',
  NAKED_PAIR:          'MEDIUM',
  HIDDEN_PAIR:         'MEDIUM',
  NAKED_TRIPLE:        'HARD',
  HIDDEN_TRIPLE:       'HARD',
  NAKED_QUAD:          'HARD',
  HIDDEN_QUAD:         'HARD',
  X_WING:              'HARD',
  SWORDFISH:           'HARD',
  JELLYFISH:           'HARD',
  XY_WING:             'HARD',
  XYZ_WING:            'HARD',
  W_WING:              'HARD',
  UNIQUE_RECTANGLE_1:  'HARD',
  UNIQUE_RECTANGLE_2:  'EXPERT',
  SIMPLE_COLORING:     'EXPERT',
};

const LEARN_MORE_SLUGS: Record<TechniqueName, string> = {
  NAKED_SINGLE:        'naked-single',
  HIDDEN_SINGLE:       'hidden-single',
  LOCKED_CANDIDATES:   'locked-candidates',
  NAKED_PAIR:          'naked-pair',
  HIDDEN_PAIR:         'hidden-pair',
  NAKED_TRIPLE:        'naked-triple',
  HIDDEN_TRIPLE:       'hidden-triple',
  NAKED_QUAD:          'naked-quad',
  HIDDEN_QUAD:         'hidden-quad',
  X_WING:              'x-wing',
  SWORDFISH:           'swordfish',
  JELLYFISH:           'jellyfish',
  XY_WING:             'xy-wing',
  XYZ_WING:            'xyz-wing',
  W_WING:              'w-wing',
  UNIQUE_RECTANGLE_1:  'unique-rectangle',
  UNIQUE_RECTANGLE_2:  'unique-rectangle',
  SIMPLE_COLORING:     'simple-coloring',
};

interface MakeStepOptions {
  placement?: Placement | null;
  eliminations?: Elimination[];
  causeCells?: number[][];
}

function makeStep(
  technique: TechniqueName,
  { placement = null, eliminations = [], causeCells = [] }: MakeStepOptions = {}
): HintStep {
  const highlightCells: HighlightCell[] = [];

  if (placement) {
    highlightCells.push({ row: placement.row, col: placement.col, role: 'target' });
  }
  for (const [r, c] of causeCells) {
    highlightCells.push({ row: r, col: c, role: 'cause' });
  }
  for (const { row, col } of eliminations) {
    // Avoid duplicating cells already marked as cause
    if (!causeCells.some(([cr, cc]) => cr === row && cc === col)) {
      highlightCells.push({ row, col, role: 'eliminate' });
    }
  }

  return {
    technique,
    difficulty: TECHNIQUE_DIFFICULTY[technique],
    placement,
    eliminations,
    highlightCells,
    learnMoreSlug: LEARN_MORE_SLUGS[technique],
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function* combinations(arr: number[][], r: number): Generator<number[][]> {
  if (r === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - r; i++) {
    for (const rest of combinations(arr.slice(i + 1), r - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

function twoBits(bits: number): [number, number] {
  const low = bits & (-bits);
  const high = bits & ~low;
  return [low, high];
}

// ---------------------------------------------------------------------------
// 1. Naked Single
// ---------------------------------------------------------------------------

function nakedSingle(cg: CandidateGrid): HintStep | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (cg.isEmpty(r, c) && cg.candidateCount(r, c) === 1) {
        const digit = cg.candidates(r, c)[0];
        cg.place(r, c, digit);
        return makeStep('NAKED_SINGLE', {
          placement: { row: r, col: c, value: digit },
        });
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Hidden Single
// ---------------------------------------------------------------------------

function hiddenSingle(cg: CandidateGrid): HintStep | null {
  for (const house of cg.getHouses()) {
    for (let digit = 1; digit <= 9; digit++) {
      const bit = DIGIT_BIT[digit];
      const positions = house.filter(([r, c]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit));
      if (positions.length === 1) {
        const [r, c] = positions[0];
        const _causeCells = house
          .filter(([hr, hc]) => !cg.isEmpty(hr, hc) || (hr === r && hc === c) ? false : true)
          .filter(([hr, hc]) => cg.candidateBits(hr, hc) & bit ? false : true);
        void _causeCells;
        cg.place(r, c, digit);
        return makeStep('HIDDEN_SINGLE', {
          placement: { row: r, col: c, value: digit },
          causeCells: house.filter(([hr, hc]) => hr !== r || hc !== c),
        });
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Locked Candidates (Pointing + Claiming)
// ---------------------------------------------------------------------------

function lockedCandidates(cg: CandidateGrid): HintStep | null {
  // Pointing: digit in a box is confined to one row/col
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxCells: number[][] = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          boxCells.push([br * 3 + dr, bc * 3 + dc]);

      for (let digit = 1; digit <= 9; digit++) {
        const bit = DIGIT_BIT[digit];
        const positions = boxCells.filter(([r, c]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit));
        if (positions.length < 2) continue;

        const rows = new Set(positions.map(([r]) => r));
        const cols = new Set(positions.map(([, c]) => c));
        const elims: Elimination[] = [];

        if (rows.size === 1) {
          const lockedRow = [...rows][0];
          for (let c = 0; c < 9; c++) {
            if (c >= bc * 3 && c < bc * 3 + 3) continue;
            if (cg.isEmpty(lockedRow, c) && (cg.candidateBits(lockedRow, c) & bit))
              elims.push({ row: lockedRow, col: c, digit });
          }
        } else if (cols.size === 1) {
          const lockedCol = [...cols][0];
          for (let r = 0; r < 9; r++) {
            if (r >= br * 3 && r < br * 3 + 3) continue;
            if (cg.isEmpty(r, lockedCol) && (cg.candidateBits(r, lockedCol) & bit))
              elims.push({ row: r, col: lockedCol, digit });
          }
        }

        if (elims.length > 0) {
          elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
          return makeStep('LOCKED_CANDIDATES', {
            eliminations: elims,
            causeCells: positions,
          });
        }
      }
    }
  }

  // Claiming: digit in a row/col is confined to one box
  for (let r = 0; r < 9; r++) {
    for (let digit = 1; digit <= 9; digit++) {
      const bit = DIGIT_BIT[digit];
      const positions = Array.from({ length: 9 }, (_, c) => [r, c])
        .filter(([, c]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit));
      if (positions.length < 2) continue;
      const boxCols = new Set(positions.map(([, c]) => Math.floor(c / 3)));
      if (boxCols.size === 1) {
        const bc = [...boxCols][0], br = Math.floor(r / 3);
        const elims: Elimination[] = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const [er, ec] = [br * 3 + dr, bc * 3 + dc];
            if (er === r) continue;
            if (cg.isEmpty(er, ec) && (cg.candidateBits(er, ec) & bit))
              elims.push({ row: er, col: ec, digit });
          }
        if (elims.length > 0) {
          elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
          return makeStep('LOCKED_CANDIDATES', { eliminations: elims, causeCells: positions });
        }
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    for (let digit = 1; digit <= 9; digit++) {
      const bit = DIGIT_BIT[digit];
      const positions = Array.from({ length: 9 }, (_, r) => [r, c])
        .filter(([r]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit));
      if (positions.length < 2) continue;
      const boxRows = new Set(positions.map(([r]) => Math.floor(r / 3)));
      if (boxRows.size === 1) {
        const br = [...boxRows][0], bc = Math.floor(c / 3);
        const elims: Elimination[] = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const [er, ec] = [br * 3 + dr, bc * 3 + dc];
            if (ec === c) continue;
            if (cg.isEmpty(er, ec) && (cg.candidateBits(er, ec) & bit))
              elims.push({ row: er, col: ec, digit });
          }
        if (elims.length > 0) {
          elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
          return makeStep('LOCKED_CANDIDATES', { eliminations: elims, causeCells: positions });
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4 & 5. Naked / Hidden Subsets
// ---------------------------------------------------------------------------

function _nakedSubset(cg: CandidateGrid, size: number): HintStep | null {
  const technique = ['', '', 'NAKED_PAIR', 'NAKED_TRIPLE', 'NAKED_QUAD'][size] as TechniqueName;
  for (const house of cg.getHouses()) {
    const emptyCells = house.filter(([r, c]) => cg.isEmpty(r, c));
    if (emptyCells.length < size + 1) continue;
    for (const combo of combinations(emptyCells, size)) {
      let combined = 0;
      for (const [r, c] of combo) combined |= cg.candidateBits(r, c);
      if (popcount(combined) !== size) continue;
      const elims: Elimination[] = [];
      for (const [r, c] of house) {
        if (!cg.isEmpty(r, c) || combo.some(([cr, cc]) => cr === r && cc === c)) continue;
        for (const digit of bitsToDigits(combined)) {
          if (cg.candidateBits(r, c) & DIGIT_BIT[digit])
            elims.push({ row: r, col: c, digit });
        }
      }
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
        return makeStep(technique, { eliminations: elims, causeCells: combo });
      }
    }
  }
  return null;
}

function _hiddenSubset(cg: CandidateGrid, size: number): HintStep | null {
  const technique = ['', '', 'HIDDEN_PAIR', 'HIDDEN_TRIPLE', 'HIDDEN_QUAD'][size] as TechniqueName;
  for (const house of cg.getHouses()) {
    const emptyCells = house.filter(([r, c]) => cg.isEmpty(r, c));
    if (emptyCells.length < size + 1) continue;

    const digitPositions: Record<number, number[][]> = {};
    for (let digit = 1; digit <= 9; digit++) {
      const bit = DIGIT_BIT[digit];
      const pos = emptyCells.filter(([r, c]) => cg.candidateBits(r, c) & bit);
      if (pos.length >= 2 && pos.length <= size) digitPositions[digit] = pos;
    }

    for (const digitCombo of combinations(Object.keys(digitPositions).map(Number).map(d => [d]), size)) {
      const digits = digitCombo.map(([d]) => d);
      const cellsInvolved = new Set<string>();
      for (const d of digits)
        for (const [r, c] of digitPositions[d]) cellsInvolved.add(`${r},${c}`);
      if (cellsInvolved.size !== size) continue;

      const comboBits = digits.reduce((acc, d) => acc | DIGIT_BIT[d], 0);
      const elims: Elimination[] = [];
      for (const key of cellsInvolved) {
        const [r, c] = key.split(',').map(Number);
        const extra = cg.candidateBits(r, c) & ~comboBits;
        for (const digit of bitsToDigits(extra)) elims.push({ row: r, col: c, digit });
      }
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
        const causeCells = [...cellsInvolved].map(k => k.split(',').map(Number));
        return makeStep(technique, { eliminations: elims, causeCells });
      }
    }
  }
  return null;
}

const nakedPair   = (cg: CandidateGrid): HintStep | null => _nakedSubset(cg, 2);
const nakedTriple = (cg: CandidateGrid): HintStep | null => _nakedSubset(cg, 3);
const nakedQuad   = (cg: CandidateGrid): HintStep | null => _nakedSubset(cg, 4);
const hiddenPair   = (cg: CandidateGrid): HintStep | null => _hiddenSubset(cg, 2);
const hiddenTriple = (cg: CandidateGrid): HintStep | null => _hiddenSubset(cg, 3);
const hiddenQuad   = (cg: CandidateGrid): HintStep | null => _hiddenSubset(cg, 4);

// ---------------------------------------------------------------------------
// 6. Basic Fish: X-Wing (2), Swordfish (3), Jellyfish (4)
// ---------------------------------------------------------------------------

function _basicFish(cg: CandidateGrid, size: number): HintStep | null {
  const technique = ['', '', 'X_WING', 'SWORDFISH', 'JELLYFISH'][size] as TechniqueName;

  for (let digit = 1; digit <= 9; digit++) {
    const bit = DIGIT_BIT[digit];

    // Row-based
    const rowCols: Set<number>[] = Array.from({ length: 9 }, (_, r) =>
      new Set(Array.from({ length: 9 }, (_, c) => c).filter(c => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit)))
    );

    for (const baseRows of combinations(Array.from({ length: 9 }, (_, i) => [i]), size)) {
      const baseRowNums = baseRows.map(([r]) => r);
      // Each base row must actually contribute ≥2 candidate columns.
      // A row with 0 candidates (digit already placed) or 1 candidate
      // (a hidden single in that row) cannot anchor a fish — its
      // placement isn't constrained to the union of baseCols, so the
      // fish elimination is unsound (#213). The previous code only
      // checked the union size, so e.g. R1={3,7} + R2={} (digit
      // placed elsewhere) still passed `baseCols.size === 2 === size`
      // and falsely eliminated the digit from cols 3,7 in non-base rows.
      // Note: the upper bound (each row contributes ≤size cols) is
      // enforced indirectly by the `baseCols.size !== size` check
      // below — if any row contributes >size cols, the union exceeds
      // size and the combination is rejected.
      if (baseRowNums.some(r => rowCols[r].size < 2)) continue;
      const baseCols = new Set<number>();
      for (const r of baseRowNums) for (const c of rowCols[r]) baseCols.add(c);
      if (baseCols.size !== size) continue;
      const elims: Elimination[] = [];
      for (let r = 0; r < 9; r++) {
        if (baseRowNums.includes(r)) continue;
        for (const c of baseCols)
          if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit))
            elims.push({ row: r, col: c, digit });
      }
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
        return makeStep(technique, {
          eliminations: elims,
          causeCells: baseRowNums.flatMap(r => [...rowCols[r]].map(c => [r, c])),
        });
      }
    }

    // Column-based
    const colRows: Set<number>[] = Array.from({ length: 9 }, (_, c) =>
      new Set(Array.from({ length: 9 }, (_, r) => r).filter(r => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit)))
    );

    for (const baseCols of combinations(Array.from({ length: 9 }, (_, i) => [i]), size)) {
      const baseColNums = baseCols.map(([c]) => c);
      // Same min-2-contribution guard as the row branch above (#213).
      if (baseColNums.some(c => colRows[c].size < 2)) continue;
      const baseRowsSet = new Set<number>();
      for (const c of baseColNums) for (const r of colRows[c]) baseRowsSet.add(r);
      if (baseRowsSet.size !== size) continue;
      const elims: Elimination[] = [];
      for (let c = 0; c < 9; c++) {
        if (baseColNums.includes(c)) continue;
        for (const r of baseRowsSet)
          if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit))
            elims.push({ row: r, col: c, digit });
      }
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
        return makeStep(technique, {
          eliminations: elims,
          causeCells: baseColNums.flatMap(c => [...colRows[c]].map(r => [r, c])),
        });
      }
    }
  }
  return null;
}

const xWing    = (cg: CandidateGrid): HintStep | null => _basicFish(cg, 2);
const swordfish = (cg: CandidateGrid): HintStep | null => _basicFish(cg, 3);
const jellyfish = (cg: CandidateGrid): HintStep | null => _basicFish(cg, 4);

// ---------------------------------------------------------------------------
// 7. XY-Wing
// ---------------------------------------------------------------------------

function xyWing(cg: CandidateGrid): HintStep | null {
  const bivalue: number[][] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (cg.isEmpty(r, c) && cg.candidateCount(r, c) === 2)
        bivalue.push([r, c]);

  for (const [pr, pc] of bivalue) {
    const pivotBits = cg.candidateBits(pr, pc);
    const pivotPeers = cg.getPeers(pr, pc);

    const pivotBivaluePeers = bivalue.filter(
      ([r, c]) => pivotPeers.has(`${r},${c}`)
    );

    for (const [p1r, p1c] of pivotBivaluePeers) {
      const p1Bits = cg.candidateBits(p1r, p1c);
      if (popcount(p1Bits & pivotBits) !== 1) continue;
      const zBit = p1Bits & ~pivotBits;

      for (const [p2r, p2c] of pivotBivaluePeers) {
        if (p2r === p1r && p2c === p1c) continue;
        const p2Bits = cg.candidateBits(p2r, p2c);
        const shared2 = p2Bits & pivotBits;
        if (shared2 === (p1Bits & pivotBits) || popcount(shared2) !== 1) continue;
        if ((p2Bits & ~pivotBits) !== zBit) continue;

        const p1Peers = cg.getPeers(p1r, p1c);
        const p2Peers = cg.getPeers(p2r, p2c);
        const zDigit = bitsToDigits(zBit)[0];

        const elims: Elimination[] = [];
        for (const key of p1Peers) {
          if (!p2Peers.has(key)) continue;
          const [r, c] = key.split(',').map(Number);
          if ((r === pr && c === pc) || (r === p1r && c === p1c) || (r === p2r && c === p2c)) continue;
          if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & zBit))
            elims.push({ row: r, col: c, digit: zDigit });
        }
        if (elims.length > 0) {
          elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
          return makeStep('XY_WING', {
            eliminations: elims,
            causeCells: [[pr, pc], [p1r, p1c], [p2r, p2c]],
          });
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 8. XYZ-Wing
// ---------------------------------------------------------------------------

function xyzWing(cg: CandidateGrid): HintStep | null {
  const trivalue: number[][] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (cg.isEmpty(r, c) && cg.candidateCount(r, c) === 3)
        trivalue.push([r, c]);

  for (const [pr, pc] of trivalue) {
    const pivotBits = cg.candidateBits(pr, pc);
    const pivotPeers = cg.getPeers(pr, pc);

    const pincers: number[][] = [];
    for (const key of pivotPeers) {
      const [r, c] = key.split(',').map(Number);
      if (cg.isEmpty(r, c) && cg.candidateCount(r, c) === 2 &&
          popcount(cg.candidateBits(r, c) & pivotBits) === 2)
        pincers.push([r, c]);
    }

    for (let i = 0; i < pincers.length; i++) {
      const [p1r, p1c] = pincers[i];
      const p1Bits = cg.candidateBits(p1r, p1c);
      for (let j = i + 1; j < pincers.length; j++) {
        const [p2r, p2c] = pincers[j];
        const p2Bits = cg.candidateBits(p2r, p2c);
        if ((p1Bits | p2Bits) !== pivotBits) continue;
        const zBit = p1Bits & p2Bits;
        if (popcount(zBit) !== 1) continue;
        const zDigit = bitsToDigits(zBit)[0];

        const p1Peers = cg.getPeers(p1r, p1c);
        const p2Peers = cg.getPeers(p2r, p2c);

        const elims: Elimination[] = [];
        for (const key of pivotPeers) {
          if (!p1Peers.has(key) || !p2Peers.has(key)) continue;
          const [r, c] = key.split(',').map(Number);
          if ((r === p1r && c === p1c) || (r === p2r && c === p2c)) continue;
          if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & zBit))
            elims.push({ row: r, col: c, digit: zDigit });
        }
        if (elims.length > 0) {
          elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
          return makeStep('XYZ_WING', {
            eliminations: elims,
            causeCells: [[pr, pc], [p1r, p1c], [p2r, p2c]],
          });
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 9. W-Wing
// ---------------------------------------------------------------------------

function wWing(cg: CandidateGrid): HintStep | null {
  const bivalue = new Map<string, number>();
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (cg.isEmpty(r, c) && cg.candidateCount(r, c) === 2)
        bivalue.set(`${r},${c}`, cg.candidateBits(r, c));

  const cells = [...bivalue.keys()];

  for (let i = 0; i < cells.length; i++) {
    const k1 = cells[i];
    const [r1, c1] = k1.split(',').map(Number);
    const bits1 = bivalue.get(k1)!;
    const peers1 = cg.getPeers(r1, c1);

    for (let j = i + 1; j < cells.length; j++) {
      const k2 = cells[j];
      const [r2, c2] = k2.split(',').map(Number);
      const bits2 = bivalue.get(k2)!;
      if (bits1 !== bits2) continue;
      const peers2 = cg.getPeers(r2, c2);
      const [aBit, bBit] = twoBits(bits1);

      for (const [linkBit, elimBit] of [[aBit, bBit], [bBit, aBit]] as [number, number][]) {
        const elimDigit = bitsToDigits(elimBit)[0];

        for (const house of cg.getHouses()) {
          const linkPos = house.filter(
            ([r, c]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & linkBit)
          );
          if (linkPos.length !== 2) continue;
          const [x, y] = linkPos;
          const xKey = `${x[0]},${x[1]}`, yKey = `${y[0]},${y[1]}`;
          if (xKey === k1 || xKey === k2 || yKey === k1 || yKey === k2) continue;
          if (!((peers1.has(xKey) && peers2.has(yKey)) ||
                (peers1.has(yKey) && peers2.has(xKey)))) continue;

          const elims: Elimination[] = [];
          for (const key of peers1) {
            if (!peers2.has(key)) continue;
            if (key === k1 || key === k2) continue;
            const [r, c] = key.split(',').map(Number);
            if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & elimBit))
              elims.push({ row: r, col: c, digit: elimDigit });
          }
          if (elims.length > 0) {
            elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
            return makeStep('W_WING', {
              eliminations: elims,
              causeCells: [[r1, c1], [r2, c2], x, y],
            });
          }
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 10. Unique Rectangle (Type 1 and 2)
// ---------------------------------------------------------------------------

interface URCandidate {
  corners: number[][];
  bits: number[];
  a: number;
  b: number;
}

interface URType2Candidate {
  corners: number[][];
  roofIdxs: number[];
  xBit: number;
  a: number;
  b: number;
}

function* _urRectangles(cg: CandidateGrid): Generator<URCandidate> {
  for (let r1 = 0; r1 < 9; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 9; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const boxes = new Set([
            `${Math.floor(r1/3)},${Math.floor(c1/3)}`,
            `${Math.floor(r1/3)},${Math.floor(c2/3)}`,
            `${Math.floor(r2/3)},${Math.floor(c1/3)}`,
            `${Math.floor(r2/3)},${Math.floor(c2/3)}`,
          ]);
          if (boxes.size !== 2) continue;
          const corners = [[r1,c1],[r1,c2],[r2,c1],[r2,c2]];
          if (!corners.every(([r,c]) => cg.isEmpty(r,c))) continue;
          const bits = corners.map(([r,c]) => cg.candidateBits(r,c));
          const common = bits.reduce((a, b) => a & b);
          if (popcount(common) < 2) continue;
          for (const combo of combinations(bitsToDigits(common).map(d => [d]), 2)) {
            yield { corners, bits, a: combo[0][0], b: combo[1][0] };
          }
        }
      }
    }
  }
}

function uniqueRectangle(cg: CandidateGrid): HintStep | null {
  const type2Candidates: URType2Candidate[] = [];

  for (const { corners, bits, a, b } of _urRectangles(cg)) {
    const ab = DIGIT_BIT[a] | DIGIT_BIT[b];
    const extras = bits.map(bb => bb & ~ab);
    const nExact = extras.filter(e => e === 0).length;

    // Type 1
    if (nExact === 3) {
      const roofIdx = extras.findIndex(e => e !== 0);
      const [rr, rc] = corners[roofIdx];
      const elims: Elimination[] = [a, b]
        .filter(d => cg.candidateBits(rr, rc) & DIGIT_BIT[d])
        .map(d => ({ row: rr, col: rc, digit: d }));
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
        return makeStep('UNIQUE_RECTANGLE_1', {
          eliminations: elims,
          causeCells: corners.filter((_, i) => i !== roofIdx),
        });
      }
    }

    // Collect Type 2 candidates
    if (nExact === 2) {
      const roofIdxs = extras.map((e, i) => e !== 0 ? i : -1).filter(i => i !== -1);
      if (roofIdxs.length === 2 &&
          extras[roofIdxs[0]] === extras[roofIdxs[1]] &&
          popcount(extras[roofIdxs[0]]) === 1) {
        type2Candidates.push({ corners, roofIdxs, xBit: extras[roofIdxs[0]], a, b });
      }
    }
  }

  // Type 2
  for (const { corners, roofIdxs, xBit } of type2Candidates) {
    const xDigit = bitsToDigits(xBit)[0];
    const [rr0, rc0] = corners[roofIdxs[0]];
    const [rr1, rc1] = corners[roofIdxs[1]];
    const peers0 = cg.getPeers(rr0, rc0);
    const peers1 = cg.getPeers(rr1, rc1);
    const elims: Elimination[] = [];
    for (const key of peers0) {
      if (!peers1.has(key)) continue;
      const [r, c] = key.split(',').map(Number);
      if ((r === rr0 && c === rc0) || (r === rr1 && c === rc1)) continue;
      if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & xBit))
        elims.push({ row: r, col: c, digit: xDigit });
    }
    if (elims.length > 0) {
      elims.forEach(({ row, col, digit }) => cg.eliminate(row, col, digit));
      return makeStep('UNIQUE_RECTANGLE_2', {
        eliminations: elims,
        causeCells: [[rr0, rc0], [rr1, rc1], ...corners.filter((_, i) => !roofIdxs.includes(i))],
      });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 11. Simple Coloring
// ---------------------------------------------------------------------------

function simpleColoring(cg: CandidateGrid): HintStep | null {
  for (let digit = 1; digit <= 9; digit++) {
    const bit = DIGIT_BIT[digit];

    // Build strong-link graph
    const strongLinks = new Map<string, Set<string>>(); // "r,c" → Set of "r,c"
    for (const house of cg.getHouses()) {
      const positions = house.filter(([r, c]) => cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit));
      if (positions.length === 2) {
        const [a, b] = positions;
        const ka = `${a[0]},${a[1]}`, kb = `${b[0]},${b[1]}`;
        if (!strongLinks.has(ka)) strongLinks.set(ka, new Set());
        if (!strongLinks.has(kb)) strongLinks.set(kb, new Set());
        strongLinks.get(ka)!.add(kb);
        strongLinks.get(kb)!.add(ka);
      }
    }

    // BFS 2-color components
    const color = new Map<string, number>();
    const components: Map<string, number>[] = [];

    for (const start of strongLinks.keys()) {
      if (color.has(start)) continue;
      const component = new Map<string, number>([[start, 0]]);
      const queue: string[] = [start];
      while (queue.length > 0) {
        const node = queue.pop()!;
        for (const neighbor of (strongLinks.get(node) || [])) {
          if (!component.has(neighbor)) {
            component.set(neighbor, 1 - component.get(node)!);
            queue.push(neighbor);
          }
        }
      }
      for (const [k, v] of component) color.set(k, v);
      components.push(component);
    }

    for (const component of components) {
      const cells0 = new Set([...component.entries()].filter(([,v]) => v === 0).map(([k]) => k));
      const cells1 = new Set([...component.entries()].filter(([,v]) => v === 1).map(([k]) => k));

      // Rule 4: Color Wrap
      for (const house of cg.getHouses()) {
        const houseKeys = new Set(house.map(([r,c]) => `${r},${c}`));
        for (const badCells of [cells0, cells1]) {
          const overlap = [...badCells].filter(k => houseKeys.has(k));
          if (overlap.length >= 2) {
            const elims: Elimination[] = [];
            for (const k of badCells) {
              const [r, c] = k.split(',').map(Number);
              if (cg.isEmpty(r, c) && (cg.candidateBits(r, c) & bit))
                elims.push({ row: r, col: c, digit });
            }
            if (elims.length > 0) {
              elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
              return makeStep('SIMPLE_COLORING', {
                eliminations: elims,
                causeCells: [...component.keys()].map(k => k.split(',').map(Number)),
              });
            }
          }
        }
      }

      // Rule 2: Color Trap
      const elims: Elimination[] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!cg.isEmpty(r, c) || !(cg.candidateBits(r, c) & bit)) continue;
          const key = `${r},${c}`;
          if (component.has(key)) continue;
          const peers = cg.getPeers(r, c);
          const sees0 = [...cells0].some(k => peers.has(k));
          const sees1 = [...cells1].some(k => peers.has(k));
          if (sees0 && sees1) elims.push({ row: r, col: c, digit });
        }
      }
      if (elims.length > 0) {
        elims.forEach(({ row, col, digit: d }) => cg.eliminate(row, col, d));
        return makeStep('SIMPLE_COLORING', {
          eliminations: elims,
          causeCells: [...component.keys()].map(k => k.split(',').map(Number)),
        });
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const TECHNIQUES: Array<(cg: CandidateGrid) => HintStep | null> = [
  nakedSingle,
  hiddenSingle,
  lockedCandidates,
  nakedPair,
  hiddenPair,
  nakedTriple,
  hiddenTriple,
  nakedQuad,
  hiddenQuad,
  xWing,
  swordfish,
  jellyfish,
  xyWing,
  xyzWing,
  wWing,
  uniqueRectangle,
  simpleColoring,
];

/**
 * Find the next logical hint step for the given board state.
 *
 * @param board - Current board (0 = empty)
 * @param sudokuType - Puzzle variant
 * @param constraints - Variant-specific constraints
 * @returns HintStep or null if puzzle is already solved / stuck
 */
export function findHintStep(
  board: Board,
  sudokuType: SudokuTypeId,
  constraints: VariantConstraints = {}
): HintStep | null {
  const cg = new CandidateGrid(board, sudokuType, constraints);

  if (cg.isSolved() || cg.hasContradiction()) return null;

  for (const technique of TECHNIQUES) {
    // Unique Rectangle assumes the puzzle has exactly one solution —
    // its eliminations are derived from "this candidate would create
    // an ambiguous quartet, therefore it can't be right." That
    // assumption holds for CLASSIC (whose generator runs uniqueness
    // checks on every removal, fixed in #214) but NOT for the variant
    // generators, which still skip uniqueness checking for perf
    // reasons (#211). Running UR on a non-unique puzzle eliminates
    // candidates that legitimately belong to one of the alternate
    // solutions, then the hint engine pushes the player toward the
    // OTHER solution which fails Check. Skip UR on variants until
    // #211 is closed.
    if (technique === uniqueRectangle && sudokuType !== 'CLASSIC') continue;
    const step = technique(cg);
    if (step !== null) return step;
  }

  return null;
}
