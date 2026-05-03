// Board types
export type CellValue = number;
export type Board = number[][];

// Sudoku type identifiers
export type SudokuTypeId =
  | 'CLASSIC'
  | 'DIAGONAL'
  | 'WINDOKU'
  | 'ANTI_KNIGHT'
  | 'ODD_EVEN'
  | 'ANTI_KING'
  | 'NON_CONSECUTIVE'
  | 'KROPKI'
  | 'KILLER'
  | 'LITTLE_KILLER'
  | 'GREATER_THAN'
  | 'THERMO'
  | 'SANDWICH';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface DifficultyConfig {
  name: string;
  filledCells: [number, number];
  maxHints: number;
  // Default mistake limit when "limit mistakes" setting is enabled.
  // Hardcoded per difficulty for now; a future settings modal can let
  // the user override these per-difficulty.
  mistakeLimit: number;
}

export interface SudokuTypeConfig {
  id: SudokuTypeId;
  name: string;
  description: string;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface GridOffset {
  row: number;
  col: number;
}

// Game status
export type GameStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'lost';

// Variant constraint types
export type Parity = 'odd' | 'even';
export type OddEvenMarkers = Map<string, Parity>;
export type KropkiDotType = 'white' | 'black';
export type KropkiDots = Map<string, KropkiDotType>;
export type GreaterThanSign = '>' | '<';
export type GreaterThanSigns = Map<string, GreaterThanSign>;

export interface KillerCage {
  sum: number;
  cells: CellPosition[];
}

export interface LittleKillerClue {
  sum: number;
  cells: CellPosition[];
  direction: [number, number];
  position: [number, number];
}

export type Thermo = CellPosition[];

export interface SandwichClues {
  rows: (number | null)[];
  cols: (number | null)[];
}

// Variant constraints bundle
export interface VariantConstraints {
  oddEvenMarkers?: OddEvenMarkers | null;
  killerCages?: KillerCage[] | null;
  kropkiDots?: KropkiDots | null;
  greaterThanSigns?: GreaterThanSigns | null;
  thermos?: Thermo[] | null;
  sandwichClues?: SandwichClues | null;
  littleKillerClues?: LittleKillerClue[] | null;
}

// Hint engine types
export type TechniqueName =
  | 'NAKED_SINGLE'
  | 'HIDDEN_SINGLE'
  | 'LOCKED_CANDIDATES'
  | 'NAKED_PAIR'
  | 'HIDDEN_PAIR'
  | 'NAKED_TRIPLE'
  | 'HIDDEN_TRIPLE'
  | 'NAKED_QUAD'
  | 'HIDDEN_QUAD'
  | 'X_WING'
  | 'SWORDFISH'
  | 'JELLYFISH'
  | 'XY_WING'
  | 'XYZ_WING'
  | 'W_WING'
  | 'UNIQUE_RECTANGLE_1'
  | 'UNIQUE_RECTANGLE_2'
  | 'SIMPLE_COLORING';

export type HighlightRole = 'target' | 'cause' | 'eliminate';

export interface HighlightCell {
  row: number;
  col: number;
  role: HighlightRole;
}

export interface Placement {
  row: number;
  col: number;
  value: number;
}

export interface Elimination {
  row: number;
  col: number;
  digit: number;
}

export interface HintStep {
  technique: TechniqueName;
  difficulty: DifficultyLevel;
  placement: Placement | null;
  eliminations: Elimination[];
  highlightCells: HighlightCell[];
  learnMoreSlug: string;
}

// Puzzle result from generator
export interface PuzzleResult {
  puzzle: Board;
  solution: Board;
  oddEvenMarkers?: OddEvenMarkers | null;
  kropkiDots?: KropkiDots | null;
  killerCages?: KillerCage[] | null;
  littleKillerClues?: LittleKillerClue[] | null;
  greaterThanSigns?: GreaterThanSigns | null;
  thermos?: Thermo[] | null;
  sandwichClues?: SandwichClues | null;
}

// Snapshot for undo/redo history
export interface BoardSnapshot {
  board: Board;
  notes: Map<string, Set<number>>;
}

// Game state
export interface GameState {
  board: Board;
  initialBoard: Board;
  solution: Board;
  selectedCell: CellPosition | null;
  difficulty: DifficultyLevel;
  sudokuType: SudokuTypeId;
  gameStatus: GameStatus;
  elapsedTime: number;
  hintsUsed: number;
  errors: Set<string>;
  // Monotonic counter of wrong-vs-solution placements for the current
  // game. Resets to 0 on NEW_GAME. Not affected by undo/redo so the stat
  // remains honest for the future stats dashboard.
  mistakeCount: number;
  // Per-cell record of wrong digits the player has placed at that cell
  // during this game. Each NEW wrong digit counts as a mistake; the same
  // wrong digit re-tried at the same cell does NOT count again — the
  // player already learned that placement is wrong, double-counting was
  // punitive on muscle-memory typos and accidental fat-finger retries.
  // Decision D2 from the research-round interview. Key is "row,col";
  // value is the Set of wrong digits attempted at that cell.
  wrongAttempts: Map<string, Set<number>>;
  notesMode: boolean;
  notes: Map<string, Set<number>>;
  activeHint: HintStep | null;
  oddEvenMarkers: OddEvenMarkers | null;
  kropkiDots: KropkiDots | null;
  killerCages: KillerCage[] | null;
  littleKillerClues: LittleKillerClue[] | null;
  greaterThanSigns: GreaterThanSigns | null;
  thermos: Thermo[] | null;
  sandwichClues: SandwichClues | null;
  history: BoardSnapshot[];
  historyIndex: number;
}

// Game actions
export interface GameActions {
  newGame: (difficulty?: DifficultyLevel, sudokuType?: SudokuTypeId, seed?: number) => void;
  // mistakeLimit: pass null when the "limit mistakes" preference is off,
  // otherwise the per-difficulty limit. The reducer treats null as
  // "track mistakes but never trigger lost state".
  setCellValue: (row: number, col: number, value: CellValue, mistakeLimit?: number | null) => void;
  selectCell: (row: number, col: number) => void;
  checkSolution: () => void;
  getHint: () => void;
  applyHint: () => void;
  dismissHint: () => void;
  toggleNotesMode: () => void;
  setNote: (row: number, col: number, number: number) => void;
  undo: () => void;
  redo: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  updateTime: () => void;
}

export interface GameContextValue {
  state: GameState;
  actions: GameActions;
}
