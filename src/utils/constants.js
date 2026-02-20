// Sudoku constants and difficulty levels

export const GRID_SIZE = 9;
export const BOX_SIZE = 3;
export const EMPTY_CELL = 0;

export const DIFFICULTY_LEVELS = {
  EASY: {
    name: 'Легкий',
    filledCells: [40, 50],
    maxHints: 5,
  },
  MEDIUM: {
    name: 'Средний',
    filledCells: [30, 40],
    maxHints: 4,
  },
  HARD: {
    name: 'Сложный',
    filledCells: [25, 30],
    maxHints: 3,
  },
  EXPERT: {
    name: 'Эксперт',
    filledCells: [20, 25],
    maxHints: 3,
  },
};

export const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

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
};

// Windoku window positions (top-left corners)
export const WINDOKU_WINDOWS = [
  { row: 1, col: 1 }, // Top-left window
  { row: 1, col: 5 }, // Top-right window
  { row: 5, col: 1 }, // Bottom-left window
  { row: 5, col: 5 }, // Bottom-right window
];

// Knight moves (chess knight L-shape: 2+1)
export const KNIGHT_MOVES = [
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
export const KING_MOVES = [
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
