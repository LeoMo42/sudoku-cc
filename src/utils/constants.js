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
};

export const STORAGE_KEY = 'sudoku-game-state';
