import type { SudokuTypeId, DifficultyLevel } from '../types/index';

const DAILY_STORAGE_KEY = 'sudoku-daily';
const DAILY_STORE_VERSION = 1;

// Ordered list of variant types used in daily rotation.
const DAILY_TYPES: SudokuTypeId[] = [
  'CLASSIC',
  'DIAGONAL',
  'ANTI_KNIGHT',
  'WINDOKU',
  'ODD_EVEN',
  'KILLER',
  'ANTI_KING',
  'NON_CONSECUTIVE',
  'THERMO',
  'KROPKI',
  'SANDWICH',
  'GREATER_THAN',
  'LITTLE_KILLER',
];

// Difficulty by day-of-week (0=Sun…6=Sat): increases toward weekend.
const DOW_DIFFICULTY: DifficultyLevel[] = [
  'MEDIUM', // Sun
  'EASY',   // Mon
  'EASY',   // Tue
  'MEDIUM', // Wed
  'HARD',   // Thu
  'HARD',   // Fri
  'EXPERT', // Sat
];

// UTC epoch for stable day-number calculation regardless of local timezone.
const EPOCH_UTC = Date.UTC(2000, 0, 1);

export interface DailyInfo {
  date: string;       // YYYY-MM-DD
  dayNumber: number;  // days since 2000-01-01 (used as puzzle #N)
  seed: number;
  type: SudokuTypeId;
  difficulty: DifficultyLevel;
}

export interface DailyStore {
  version: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  completedDates: string[];
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDayNumber(date: Date): number {
  const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((utcMs - EPOCH_UTC) / 86_400_000);
}

export function getDailyInfo(date = new Date()): DailyInfo {
  const dayNumber = toDayNumber(date);
  // Mix the day number with a constant to spread seeds away from 0.
  const seed = (((dayNumber * 1_664_525) >>> 0) + 1_013_904_223) >>> 0;
  const typeIdx = ((dayNumber % DAILY_TYPES.length) + DAILY_TYPES.length) % DAILY_TYPES.length;
  const type = DAILY_TYPES[typeIdx];
  const difficulty = DOW_DIFFICULTY[date.getDay()];
  return { date: toDateString(date), dayNumber, seed, type, difficulty };
}

function emptyStore(): DailyStore {
  return {
    version: DAILY_STORE_VERSION,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    completedDates: [],
  };
}

export function loadDailyStore(): DailyStore {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== DAILY_STORE_VERSION) return emptyStore();
    // Validate required fields to guard against corrupt/partial data.
    if (
      typeof parsed.currentStreak !== 'number' ||
      typeof parsed.bestStreak !== 'number' ||
      !Array.isArray(parsed.completedDates)
    ) {
      return emptyStore();
    }
    return {
      version: DAILY_STORE_VERSION,
      currentStreak: parsed.currentStreak,
      bestStreak: parsed.bestStreak,
      lastCompletedDate: typeof parsed.lastCompletedDate === 'string'
        ? parsed.lastCompletedDate
        : null,
      completedDates: (parsed.completedDates as unknown[]).filter(
        (d): d is string => typeof d === 'string',
      ),
    };
  } catch {
    return emptyStore();
  }
}

function saveDailyStore(store: DailyStore): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (e.g. private browsing quota exceeded)
  }
}

export function isDailyCompleted(date = new Date()): boolean {
  const store = loadDailyStore();
  return store.completedDates.includes(toDateString(date));
}

export function recordDailyCompletion(date = new Date()): DailyStore {
  const dateStr = toDateString(date);
  const store = loadDailyStore();

  if (store.completedDates.includes(dateStr)) return store;

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const newStreak = store.lastCompletedDate === toDateString(yesterday)
    ? store.currentStreak + 1
    : 1;

  const updated: DailyStore = {
    ...store,
    currentStreak: newStreak,
    bestStreak: Math.max(store.bestStreak, newStreak),
    lastCompletedDate: dateStr,
    completedDates: [...store.completedDates, dateStr],
  };

  saveDailyStore(updated);
  return updated;
}

export function getDailyStreak(): { current: number; best: number } {
  const store = loadDailyStore();
  const today = new Date();
  const todayStr = toDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const streakActive =
    store.lastCompletedDate === todayStr ||
    store.lastCompletedDate === toDateString(yesterday);
  return {
    current: streakActive ? store.currentStreak : 0,
    best: store.bestStreak,
  };
}
