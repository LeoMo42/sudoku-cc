import type { SudokuTypeId, DifficultyLevel } from '../types/index';

// Exported so consumers (useDaily) can listen for cross-tab `storage`
// events and filter by this exact key — avoids drift if we ever rename.
export const DAILY_STORAGE_KEY = 'sudoku-daily';
const DAILY_STORE_VERSION = 2;

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

// Anchor for day-number arithmetic. Using Date.UTC keeps the constant
// timezone-independent so the same dayNumber math works regardless of the
// runtime locale.
const EPOCH_UTC = Date.UTC(2000, 0, 1);

export interface DailyInfo {
  date: string;       // YYYY-MM-DD (local calendar day)
  dayNumber: number;  // days since 2000-01-01 (used as puzzle #N)
  seed: number;
  type: SudokuTypeId;
  difficulty: DifficultyLevel;
}

interface DailyStore {
  version: number;
  currentStreak: number;
  bestStreak: number;
  // Day-number form. null = no completion ever recorded.
  lastCompletedDayNumber: number | null;
}

// Date helpers — IMPORTANT: both functions are rooted in the user's LOCAL
// calendar day. We deliberately call getFullYear/getMonth/getDate (local
// accessors) and pass them into Date.UTC. The Date.UTC call is just a
// convenient way to produce a timezone-stable integer for "midnight on the
// local Y/M/D"; it does NOT mean we're operating in UTC. Both functions
// always agree for the same input Date — they describe the same local day.
//
// Trade-off: streaks are tracked against the user's local calendar day, so
// they survive DST (Date arithmetic on local days is DST-safe) but a user
// who travels across the international date line in the same wall-clock
// instant can see their streak reset. That's a documented limitation —
// fixing it requires server-side time, which this static SPA does not have.
export function toDateString(date: Date): string {
  // YYYY-MM-DD for the user's LOCAL calendar day.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toDayNumber(date: Date): number {
  // Stable integer ID for the user's LOCAL calendar day.
  // We feed local Y/M/D into Date.UTC so the result is independent of the
  // user's timezone offset — Apr 25 in PT and Apr 25 in ET produce the
  // same integer, even though the underlying Date timestamps differ.
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
    lastCompletedDayNumber: null,
  };
}

// Migrate a v1 store (which used `lastCompletedDate: string` and a
// `completedDates: string[]` array) into v2 form. We preserve currentStreak
// and bestStreak exactly, and convert the date string into a dayNumber.
// The `completedDates` array is dropped — it was only ever used for
// idempotency on duplicate completions, which lastCompletedDayNumber now
// handles in O(1).
function migrateFromV1(raw: Record<string, unknown>): DailyStore {
  let lastDayNumber: number | null = null;
  if (typeof raw.lastCompletedDate === 'string') {
    const m = raw.lastCompletedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mo, d] = m;
      // The v1 string was produced by toDateString (local calendar day).
      // Round-trip via Date.UTC to get the same integer toDayNumber would.
      lastDayNumber = Math.floor(
        (Date.UTC(Number(y), Number(mo) - 1, Number(d)) - EPOCH_UTC) / 86_400_000,
      );
    }
  }
  return {
    version: DAILY_STORE_VERSION,
    currentStreak: typeof raw.currentStreak === 'number' ? raw.currentStreak : 0,
    bestStreak: typeof raw.bestStreak === 'number' ? raw.bestStreak : 0,
    lastCompletedDayNumber: lastDayNumber,
  };
}

export function loadDailyStore(): DailyStore {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // v1 → v2 migration. v1 had `lastCompletedDate: string` + `completedDates: string[]`.
    if (parsed.version === 1) {
      const migrated = migrateFromV1(parsed);
      saveDailyStore(migrated);
      return migrated;
    }

    if (parsed.version !== DAILY_STORE_VERSION) return emptyStore();
    // Validate required fields to guard against corrupt/partial data.
    if (
      typeof parsed.currentStreak !== 'number' ||
      typeof parsed.bestStreak !== 'number'
    ) {
      return emptyStore();
    }
    return {
      version: DAILY_STORE_VERSION,
      currentStreak: parsed.currentStreak,
      bestStreak: parsed.bestStreak,
      lastCompletedDayNumber:
        typeof parsed.lastCompletedDayNumber === 'number'
          ? parsed.lastCompletedDayNumber
          : null,
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

// Only the most recent completion is stored (since v2 — see migrateFromV1).
// This is NOT a full-history lookup. If you ever need "did the user ever
// complete day N?", you'll need a different storage shape — don't reach
// for lastCompletedDayNumber and silently get the wrong answer.
export function isDailyCompleted(date = new Date()): boolean {
  const store = loadDailyStore();
  return store.lastCompletedDayNumber === toDayNumber(date);
}

export function recordDailyCompletion(date = new Date()): DailyStore {
  const today = toDayNumber(date);
  const store = loadDailyStore();

  // Future-date guard (D3 from research-round interview): if the stored
  // "last completed" is in the future relative to the system clock, the
  // user's wall clock skewed forward at some point — NTP correction
  // after a long offline window, dead RTC battery, travel across the
  // dateline, DST edge case.
  //
  // The previous v2 code reset currentStreak to 1 on this branch, which
  // wiped a months-long streak from one honest correction. The first
  // D3 implementation clamped lastCompletedDayNumber to today and
  // preserved currentStreak — but Codex caught (PR #238 review) that
  // clamp + the consecutive-day extension path opens a bounce-farming
  // hole: clock back → solve → clock forward (to original day) → solve
  // bumps the streak again even though no genuinely-new calendar day
  // was completed.
  //
  // Final design: do not move lastCompletedDayNumber backward. Treat
  // the call as a no-op for the store. The streak survives because
  // getDailyStreak below also accepts last > today as "active". When
  // the wall clock catches up to or surpasses the stored mark,
  // recordDailyCompletion resumes normal extension semantics. The
  // bounce-farming exploit is closed: a cheater swinging clock back
  // then forward sees idempotent returns, no streak inflation.
  if (store.lastCompletedDayNumber !== null && store.lastCompletedDayNumber > today) {
    return store;
  }

  // Idempotent: re-recording the same day is a no-op (e.g. user solves the
  // puzzle twice in the same session, or a duplicate event fires).
  if (store.lastCompletedDayNumber === today) return store;

  // Streak math: consecutive day = today - 1 in dayNumber arithmetic.
  // Anything else (gap, never-completed) resets to 1.
  const newStreak =
    store.lastCompletedDayNumber === today - 1
      ? store.currentStreak + 1
      : 1;

  const updated: DailyStore = {
    ...store,
    currentStreak: newStreak,
    bestStreak: Math.max(store.bestStreak, newStreak),
    lastCompletedDayNumber: today,
  };

  saveDailyStore(updated);
  return updated;
}

export function getDailyStreak(): { current: number; best: number } {
  const store = loadDailyStore();
  const today = toDayNumber(new Date());
  // A streak is "active" if the last completion was today, yesterday,
  // OR in the future (clock-skew episode — see recordDailyCompletion's
  // future-date guard for full rationale, D3). Without the future-
  // -date case, an honest NTP correction backward would silently zero
  // out the displayed streak even though the stored streak survives
  // — visible regression equivalent to a reset.
  const last = store.lastCompletedDayNumber;
  const streakActive = last !== null && (
    last === today || last === today - 1 || last > today
  );
  return {
    current: streakActive ? store.currentStreak : 0,
    best: store.bestStreak,
  };
}
