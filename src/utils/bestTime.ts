import type { DifficultyLevel, SudokuTypeId } from '../types/index';

const BEST_TIMES_KEY = 'sudoku-best-times';
const BEST_TIMES_VERSION = 2;

// v2 schema: best times are keyed by `${type}-${difficulty}` so a fast
// Classic Easy doesn't overwrite (or hide) the legitimately-slower
// Killer Easy. v1 was keyed by difficulty alone, conflating every
// variant — see #222 for the user-visible bug. We migrate v1 entries
// into v2 by assuming they were all CLASSIC, which is the only safe
// guess (Classic is the default variant and was the only one most
// users completed before variant gameplay shipped).
type StoreV2 = {
  version: 2;
  times: Record<string, number>;
};

function statsKey(type: SudokuTypeId, difficulty: DifficultyLevel): string {
  return `${type}-${difficulty}`;
}

function emptyStore(): StoreV2 {
  return { version: BEST_TIMES_VERSION, times: {} };
}

// v1 was the unversioned shape `{ EASY: 142, MEDIUM: 285, ... }` — no
// `version` field, all top-level keys are DifficultyLevel names. We
// detect it by absence of `version` and convert each entry to a
// CLASSIC-prefixed key. The original key set was only the four
// DifficultyLevel values, so the new map has at most 4 entries.
function migrateFromV1(raw: Record<string, unknown>): StoreV2 {
  const times: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      times[`CLASSIC-${k}`] = v;
    }
  }
  return { version: BEST_TIMES_VERSION, times };
}

function loadStore(): StoreV2 {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return emptyStore();
    }
    const obj = parsed as Record<string, unknown>;

    // v1 → v2 migration. v1 had no `version` field; all values were
    // numbers keyed by DifficultyLevel (EASY/MEDIUM/HARD/EXPERT).
    if (!('version' in obj)) {
      const migrated = migrateFromV1(obj);
      saveStore(migrated);
      return migrated;
    }

    if (obj.version !== BEST_TIMES_VERSION) return emptyStore();

    const rawTimes = obj.times;
    if (typeof rawTimes !== 'object' || rawTimes === null || Array.isArray(rawTimes)) {
      return emptyStore();
    }
    // Drop any non-numeric entries defensively (in case a future writer
    // ships malformed data).
    const times: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawTimes)) {
      if (typeof v === 'number' && Number.isFinite(v)) times[k] = v;
    }
    return { version: BEST_TIMES_VERSION, times };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: StoreV2): void {
  try {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (e.g. private browsing quota exceeded)
  }
}

/**
 * Returns the current best completion time (seconds) for a
 * variant+difficulty pair, or null if none.
 */
export function getBestTime(
  type: SudokuTypeId,
  difficulty: DifficultyLevel,
): number | null {
  const store = loadStore();
  const t = store.times[statsKey(type, difficulty)];
  return typeof t === 'number' ? t : null;
}

/**
 * Compares elapsedSeconds to the stored best for variant+difficulty.
 * If it's a new best (or first time), saves it and returns true.
 * Otherwise returns false.
 */
export function updateBestTime(
  type: SudokuTypeId,
  difficulty: DifficultyLevel,
  elapsedSeconds: number,
): boolean {
  const store = loadStore();
  const key = statsKey(type, difficulty);
  const current = store.times[key];
  if (typeof current === 'number' && current <= elapsedSeconds) return false;
  const next: StoreV2 = {
    version: BEST_TIMES_VERSION,
    times: { ...store.times, [key]: elapsedSeconds },
  };
  try {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(next));
    return true;
  } catch {
    // Private browsing or quota: can't record the new best, so don't claim it.
    return false;
  }
}
