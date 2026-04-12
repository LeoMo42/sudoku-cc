import type { SudokuTypeId, DifficultyLevel } from '../types/index';

export const STATS_KEY = 'sudoku-stats';
export const STATS_VERSION = 1;

export interface GameRecord {
  bestTime: number | null;   // seconds; null = never completed
  totalTime: number;         // sum of all completion times
  gamesStarted: number;
  gamesCompleted: number;
  totalMistakes: number;
}

export interface StatsStore {
  version: number;
  records: Record<string, GameRecord>; // key: statsKey(type, difficulty)
}

const EMPTY_RECORD: GameRecord = {
  bestTime: null,
  totalTime: 0,
  gamesStarted: 0,
  gamesCompleted: 0,
  totalMistakes: 0,
};

export function statsKey(type: SudokuTypeId, difficulty: DifficultyLevel): string {
  return `${type}:${difficulty}`;
}

export function loadStats(): StatsStore {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { version: STATS_VERSION, records: {} };
    const parsed = JSON.parse(raw) as Partial<StatsStore>;
    // Version mismatch → reset to empty (future migrations can be added here)
    if (parsed.version !== STATS_VERSION) return { version: STATS_VERSION, records: {} };
    return { version: STATS_VERSION, records: parsed.records ?? {} };
  } catch {
    return { version: STATS_VERSION, records: {} };
  }
}

export function saveStats(store: StatsStore): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(store));
  } catch { /* private browsing or quota */ }
}

/** Call when a new game is started to increment the games-started counter. */
export function recordGameStart(type: SudokuTypeId, difficulty: DifficultyLevel): void {
  const store = loadStats();
  const key = statsKey(type, difficulty);
  const rec = store.records[key] ?? { ...EMPTY_RECORD };
  store.records[key] = { ...rec, gamesStarted: rec.gamesStarted + 1 };
  saveStats(store);
}

/** Call when a game is completed (puzzle solved). */
export function recordGameComplete(
  type: SudokuTypeId,
  difficulty: DifficultyLevel,
  elapsedTime: number,
  mistakes: number,
): void {
  const store = loadStats();
  const key = statsKey(type, difficulty);
  const rec = store.records[key] ?? { ...EMPTY_RECORD };
  const newBest =
    rec.bestTime === null || elapsedTime < rec.bestTime ? elapsedTime : rec.bestTime;
  store.records[key] = {
    ...rec,
    bestTime: newBest,
    totalTime: rec.totalTime + elapsedTime,
    gamesCompleted: rec.gamesCompleted + 1,
    totalMistakes: rec.totalMistakes + mistakes,
  };
  saveStats(store);
}

export function resetStats(): void {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch { /* private browsing */ }
}
