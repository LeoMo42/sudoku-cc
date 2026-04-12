// Sudoku constants and difficulty levels
import type {
  DifficultyLevel,
  DifficultyConfig,
  SudokuTypeId,
  SudokuTypeConfig,
  GameStatus,
  GridOffset,
} from '../types/index';

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;
export const EMPTY_CELL = 0;

export const DIFFICULTY_LEVELS = {
  EASY: {
    name: 'Легкий',
    filledCells: [40, 50] as [number, number],
    maxHints: 10,
    mistakeLimit: 5,
  },
  MEDIUM: {
    name: 'Средний',
    filledCells: [30, 40] as [number, number],
    maxHints: 10,
    mistakeLimit: 4,
  },
  HARD: {
    name: 'Сложный',
    filledCells: [25, 30] as [number, number],
    maxHints: 10,
    mistakeLimit: 3,
  },
  EXPERT: {
    name: 'Эксперт',
    filledCells: [20, 25] as [number, number],
    maxHints: 10,
    mistakeLimit: 3,
  },
} satisfies Record<DifficultyLevel, DifficultyConfig>;

export const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  LOST: 'lost',
} as const satisfies Record<string, GameStatus>;

export const SUDOKU_TYPES = {
  CLASSIC: {
    id: 'CLASSIC',
    name: 'Classic Sudoku',
    description: 'Standard 9x9 Sudoku with 3x3 boxes',
  },
  DIAGONAL: {
    id: 'DIAGONAL',
    name: 'Diagonal Sudoku (X-Sudoku)',
    description: 'Classic rules + both main diagonals must contain 1-9',
  },
  WINDOKU: {
    id: 'WINDOKU',
    name: 'Windoku (Window Sudoku)',
    description: 'Classic rules + 4 additional 3×3 windows must contain 1-9',
  },
  ANTI_KNIGHT: {
    id: 'ANTI_KNIGHT',
    name: 'Anti-Knight Sudoku',
    description: 'Classic rules + same digits cannot be a knight\'s move apart',
  },
  ODD_EVEN: {
    id: 'ODD_EVEN',
    name: 'Odd-Even Sudoku',
    description: 'Classic rules + marked cells must contain odd or even digits',
  },
  ANTI_KING: {
    id: 'ANTI_KING',
    name: 'Anti-King Sudoku',
    description: 'Classic rules + same digits cannot be adjacent (king\'s move)',
  },
  NON_CONSECUTIVE: {
    id: 'NON_CONSECUTIVE',
    name: 'Non-Consecutive Sudoku',
    description: 'Classic rules + adjacent cells cannot differ by 1',
  },
  KROPKI: {
    id: 'KROPKI',
    name: 'Kropki Sudoku',
    description: 'Classic rules + white dot=diff 1, black dot=×2 between neighbours',
  },
  KILLER: {
    id: 'KILLER',
    name: 'Killer Sudoku',
    description: 'Classic rules + cages with target sums, no digit repeats in cage',
  },
  LITTLE_KILLER: {
    id: 'LITTLE_KILLER',
    name: 'Little Killer Sudoku',
    description: 'Classic rules + diagonal sum clues on the outside of the grid (digits may repeat)',
  },
  GREATER_THAN: {
    id: 'GREATER_THAN',
    name: 'Greater Than Sudoku',
    description: 'Classic rules + inequality signs between adjacent cells must be satisfied',
  },
  THERMO: {
    id: 'THERMO',
    name: 'Thermo Sudoku',
    description: 'Classic rules + digits must strictly increase along each thermometer from bulb to tip',
  },
  SANDWICH: {
    id: 'SANDWICH',
    name: 'Sandwich Sudoku',
    description: 'Classic rules + clues outside the grid show the sum of digits between 1 and 9 in each row/column',
  },
} satisfies Record<SudokuTypeId, SudokuTypeConfig>;

// Windoku window positions (top-left corners)
export const WINDOKU_WINDOWS: GridOffset[] = [
  { row: 1, col: 1 }, // Top-left window
  { row: 1, col: 5 }, // Top-right window
  { row: 5, col: 1 }, // Bottom-left window
  { row: 5, col: 5 }, // Bottom-right window
];

// Knight moves (chess knight L-shape: 2+1)
export const KNIGHT_MOVES: GridOffset[] = [
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 1, col: -2 },
  { row: 1, col: 2 },
  { row: 2, col: -1 },
  { row: 2, col: 1 },
];

// King moves (all 8 adjacent cells)
export const KING_MOVES: GridOffset[] = [
  { row: -1, col: -1 }, // top-left
  { row: -1, col: 0 },  // top
  { row: -1, col: 1 },  // top-right
  { row: 0, col: -1 },  // left
  { row: 0, col: 1 },   // right
  { row: 1, col: -1 },  // bottom-left
  { row: 1, col: 0 },   // bottom
  { row: 1, col: 1 },   // bottom-right
];

export const STORAGE_KEY = 'sudoku-game-state';
export const SAVE_VERSION = 1;
