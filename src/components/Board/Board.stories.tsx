import { Board } from './Board';
import { EMPTY_CELL } from '../../utils/constants';

export default {
  title: 'Board/Board',
  component: Board,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Sample puzzle for stories (Wikipedia classic sudoku)
const samplePuzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const emptyBoard = Array(9)
  .fill(null)
  .map(() => Array(9).fill(EMPTY_CELL));

export const EmptyBoard = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const WithPuzzle = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const WithSelection = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: { row: 2, col: 4 },
    errors: new Set(),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// Selecting a filled cell highlights row/col/box peers AND every other
// cell containing the same digit (issue #60).
export const WithMatchingDigitHighlight = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: { row: 0, col: 0 }, // value 5
    errors: new Set(),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// Same selection but with the highlights toggle disabled — verifies the
// "no highlights" mode for users who prefer a quieter board.
export const WithHighlightsDisabled = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: { row: 0, col: 0 },
    highlightsEnabled: false,
    errors: new Set(),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const WithErrors = {
  args: {
    board: [
      [5, 3, 5, 0, 7, 0, 0, 0, 0], // Duplicate 5 in row
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(['0,0', '0,2']),
    notes: new Map(),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const WithNotes = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map([
      ['0,2', new Set([1, 2, 4])],
      ['1,1', new Set([2, 4, 7])],
      ['2,0', new Set([1, 2])],
    ]),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const DiagonalSudoku = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'DIAGONAL',
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const Windoku = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'WINDOKU',
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const AntiKnight = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'ANTI_KNIGHT',
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const OddEven = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'ODD_EVEN',
    oddEvenMarkers: new Map([
      ['0,0', 'odd'],
      ['0,2', 'even'],
      ['1,1', 'odd'],
      ['2,0', 'even'],
      ['3,3', 'odd'],
      ['4,4', 'even'],
    ]),
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const AntiKing = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'ANTI_KING',
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

export const NonConsecutive = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'NON_CONSECUTIVE',
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// The solved grid used to derive constraint data for the stories below
const sampleSolution = [
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

// --- Kropki ---
// Some representative white (|a-b|=1) and black (a=2b) dots derived from sampleSolution
const kropkiDotsData = new Map([
  ['0,2,r', 'white'],  // 4 and 6: |4-6|=2 … but let's just show visual variety
  ['0,6,r', 'white'],  // 9 and 1: for demo purposes
  ['1,0,b', 'white'],  // 6 and 1: demo
  ['1,4,r', 'black'],  // 9 and 5: demo
  ['2,1,r', 'white'],  // 9 and 8: |9-8|=1 ✓ white
  ['2,5,b', 'black'],  // 2 and 1: demo
  ['3,3,r', 'white'],  // 7 and 6: |7-6|=1 ✓ white
  ['4,1,b', 'black'],  // 2 and 1: demo
  ['4,6,r', 'white'],  // 7 and 9: demo
  ['5,2,b', 'white'],  // 3 and 1: demo
  ['6,4,r', 'black'],  // 3 and 7: demo
  ['7,7,b', 'white'],  // 3 and 7: demo
  ['8,3,r', 'white'],  // 2 and 8: demo
]);

export const Kropki = {
  args: {
    board: samplePuzzle,
    initialBoard: samplePuzzle,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'KROPKI',
    kropkiDots: kropkiDotsData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// --- Killer ---
// 36 cages covering all 81 cells, sums derived from sampleSolution
const killerCagesData = [
  { id:  1, sum:  8, cells: [{row:0,col:0},{row:0,col:1}] },
  { id:  2, sum: 10, cells: [{row:0,col:2},{row:0,col:3}] },
  { id:  3, sum: 15, cells: [{row:0,col:4},{row:0,col:5}] },
  { id:  4, sum: 12, cells: [{row:0,col:6},{row:0,col:7},{row:0,col:8}] },
  { id:  5, sum: 15, cells: [{row:1,col:0},{row:1,col:1},{row:1,col:2}] },
  { id:  6, sum: 10, cells: [{row:1,col:3},{row:1,col:4}] },
  { id:  7, sum:  8, cells: [{row:1,col:5},{row:1,col:6}] },
  { id:  8, sum: 12, cells: [{row:1,col:7},{row:1,col:8}] },
  { id:  9, sum:  9, cells: [{row:2,col:0},{row:3,col:0}] },
  { id: 10, sum: 17, cells: [{row:2,col:1},{row:2,col:2}] },
  { id: 11, sum:  9, cells: [{row:2,col:3},{row:2,col:4},{row:2,col:5}] },
  { id: 12, sum: 11, cells: [{row:2,col:6},{row:2,col:7}] },
  { id: 13, sum: 10, cells: [{row:2,col:8},{row:3,col:8}] },
  { id: 14, sum: 21, cells: [{row:3,col:1},{row:3,col:2},{row:3,col:3}] },
  { id: 15, sum: 11, cells: [{row:3,col:4},{row:3,col:5},{row:3,col:6}] },
  { id: 16, sum:  2, cells: [{row:3,col:7}] },
  { id: 17, sum:  6, cells: [{row:4,col:0},{row:4,col:1}] },
  { id: 18, sum: 14, cells: [{row:4,col:2},{row:4,col:3}] },
  { id: 19, sum: 15, cells: [{row:4,col:4},{row:4,col:5},{row:4,col:6}] },
  { id: 20, sum: 10, cells: [{row:4,col:7},{row:4,col:8}] },
  { id: 21, sum: 11, cells: [{row:5,col:0},{row:5,col:1},{row:5,col:2}] },
  { id: 22, sum: 11, cells: [{row:5,col:3},{row:5,col:4}] },
  { id: 23, sum: 12, cells: [{row:5,col:5},{row:5,col:6}] },
  { id: 24, sum: 15, cells: [{row:5,col:7},{row:5,col:8},{row:6,col:8}] },
  { id: 25, sum: 11, cells: [{row:6,col:0},{row:7,col:0}] },
  { id: 26, sum:  7, cells: [{row:6,col:1},{row:6,col:2}] },
  { id: 27, sum: 15, cells: [{row:6,col:3},{row:6,col:4},{row:6,col:5}] },
  { id: 28, sum: 10, cells: [{row:6,col:6},{row:6,col:7}] },
  { id: 29, sum: 19, cells: [{row:7,col:1},{row:7,col:2},{row:7,col:3}] },
  { id: 30, sum: 10, cells: [{row:7,col:4},{row:7,col:5}] },
  { id: 31, sum:  9, cells: [{row:7,col:6},{row:7,col:7}] },
  { id: 32, sum: 14, cells: [{row:7,col:8},{row:8,col:8}] },
  { id: 33, sum:  7, cells: [{row:8,col:0},{row:8,col:1}] },
  { id: 34, sum: 15, cells: [{row:8,col:2},{row:8,col:3},{row:8,col:4}] },
  { id: 35, sum:  7, cells: [{row:8,col:5},{row:8,col:6}] },
  { id: 36, sum:  7, cells: [{row:8,col:7}] },
];

export const Killer = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'KILLER',
    killerCages: killerCagesData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// --- Greater Than ---
// All 144 internal signs derived from sampleSolution
const greaterThanSignsData = (() => {
  const signs = new Map();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (c + 1 < 9) signs.set(`${r},${c},r`, sampleSolution[r][c] > sampleSolution[r][c + 1] ? '>' : '<');
      if (r + 1 < 9) signs.set(`${r},${c},b`, sampleSolution[r][c] > sampleSolution[r + 1][c] ? '>' : '<');
    }
  }
  return signs;
})();

export const GreaterThan = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'GREATER_THAN',
    greaterThanSigns: greaterThanSignsData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// --- Thermo ---
const thermosData = [
  [{row:0,col:0},{row:0,col:1},{row:0,col:2},{row:0,col:3}],
  [{row:2,col:8},{row:1,col:8},{row:0,col:8}],
  [{row:3,col:3},{row:3,col:4},{row:4,col:4},{row:5,col:4}],
  [{row:6,col:1},{row:6,col:2},{row:7,col:2},{row:8,col:2}],
  [{row:5,col:6},{row:4,col:6},{row:3,col:6},{row:2,col:6}],
  [{row:7,col:5},{row:7,col:6},{row:7,col:7}],
];

export const Thermo = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'THERMO',
    thermos: thermosData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// --- Sandwich ---
// Clues computed from sampleSolution: sum of digits strictly between 1 and 9 in each line
const sandwichCluesData = (() => {
  const clues = { rows: [], cols: [] };
  for (let i = 0; i < 9; i++) {
    const row = sampleSolution[i];
    const p1 = row.indexOf(1), p9 = row.indexOf(9);
    const rlo = Math.min(p1, p9), rhi = Math.max(p1, p9);
    clues.rows.push(row.slice(rlo + 1, rhi).reduce((a, b) => a + b, 0));

    const col = sampleSolution.map(r => r[i]);
    const q1 = col.indexOf(1), q9 = col.indexOf(9);
    const clo = Math.min(q1, q9), chi = Math.max(q1, q9);
    clues.cols.push(col.slice(clo + 1, chi).reduce((a, b) => a + b, 0));
  }
  return clues;
})();

export const Sandwich = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'SANDWICH',
    sandwichClues: sandwichCluesData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};

// --- Little Killer ---
// Diagonal sum clues placed outside the grid edges
const littleKillerCluesData = [
  { labelRow: -1, labelCol: 0, dr:  1, dc:  1, sum: 20 },
  { labelRow: -1, labelCol: 2, dr:  1, dc:  1, sum: 14 },
  { labelRow: -1, labelCol: 4, dr:  1, dc:  1, sum: 25 },
  { labelRow: -1, labelCol: 5, dr:  1, dc: -1, sum: 18 },
  { labelRow: -1, labelCol: 7, dr:  1, dc: -1, sum: 11 },
  { labelRow:  1, labelCol: -1, dr:  1, dc:  1, sum: 30 },
  { labelRow:  4, labelCol: -1, dr:  1, dc:  1, sum: 22 },
  { labelRow:  6, labelCol: -1, dr: -1, dc:  1, sum: 16 },
  { labelRow:  8, labelCol: -1, dr: -1, dc:  1, sum: 13 },
];

export const LittleKiller = {
  args: {
    board: emptyBoard,
    initialBoard: emptyBoard,
    selectedCell: null,
    errors: new Set(),
    notes: new Map(),
    sudokuType: 'LITTLE_KILLER',
    littleKillerClues: littleKillerCluesData,
    onCellClick: (row, col) => console.log(`Clicked cell [${row}, ${col}]`),
  },
};
