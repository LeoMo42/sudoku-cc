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

// Sample puzzle for stories
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
