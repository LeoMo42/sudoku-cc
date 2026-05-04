import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBestTime, updateBestTime } from './bestTime';

const STORAGE_KEY = 'sudoku-best-times';

describe('bestTime', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no best time stored', () => {
    expect(getBestTime('CLASSIC', 'EASY')).toBeNull();
  });

  it('updateBestTime saves first completion and returns true', () => {
    expect(updateBestTime('CLASSIC', 'EASY', 120)).toBe(true);
    expect(getBestTime('CLASSIC', 'EASY')).toBe(120);
  });

  it('updateBestTime returns true and updates when new time is faster', () => {
    updateBestTime('CLASSIC', 'MEDIUM', 200);
    expect(updateBestTime('CLASSIC', 'MEDIUM', 150)).toBe(true);
    expect(getBestTime('CLASSIC', 'MEDIUM')).toBe(150);
  });

  it('updateBestTime returns false and keeps old time when new time is slower', () => {
    updateBestTime('CLASSIC', 'HARD', 100);
    expect(updateBestTime('CLASSIC', 'HARD', 200)).toBe(false);
    expect(getBestTime('CLASSIC', 'HARD')).toBe(100);
  });

  it('updateBestTime returns false when new time equals the best', () => {
    updateBestTime('CLASSIC', 'EXPERT', 300);
    expect(updateBestTime('CLASSIC', 'EXPERT', 300)).toBe(false);
  });

  it('stores times independently per difficulty', () => {
    updateBestTime('CLASSIC', 'EASY', 90);
    updateBestTime('CLASSIC', 'HARD', 400);
    expect(getBestTime('CLASSIC', 'EASY')).toBe(90);
    expect(getBestTime('CLASSIC', 'MEDIUM')).toBeNull();
    expect(getBestTime('CLASSIC', 'HARD')).toBe(400);
  });

  // Regression #222 — same difficulty across variants used to share
  // a single key, so a fast Classic Easy hid (and was hidden by) a
  // slower Killer Easy. The v2 schema separates them.
  it('stores times independently per variant for the same difficulty', () => {
    updateBestTime('CLASSIC', 'EASY', 120);
    updateBestTime('KILLER', 'EASY', 285);
    expect(getBestTime('CLASSIC', 'EASY')).toBe(120);
    expect(getBestTime('KILLER', 'EASY')).toBe(285);
  });

  it('updating one variant does not affect another at the same difficulty', () => {
    updateBestTime('CLASSIC', 'EASY', 120);
    updateBestTime('KILLER', 'EASY', 285);
    // Faster Classic Easy should not move Killer Easy.
    expect(updateBestTime('CLASSIC', 'EASY', 90)).toBe(true);
    expect(getBestTime('CLASSIC', 'EASY')).toBe(90);
    expect(getBestTime('KILLER', 'EASY')).toBe(285);
    // Slower Killer attempt should not displace its existing best.
    expect(updateBestTime('KILLER', 'EASY', 400)).toBe(false);
    expect(getBestTime('KILLER', 'EASY')).toBe(285);
  });

  it('getBestTime returns null when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    expect(getBestTime('CLASSIC', 'EASY')).toBeNull();
  });

  it('updateBestTime returns false and does not throw when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    expect(() => updateBestTime('CLASSIC', 'EASY', 100)).not.toThrow();
    expect(updateBestTime('CLASSIC', 'EASY', 100)).toBe(false);
  });

  describe('v1 → v2 migration', () => {
    it('migrates a v1 store as if every entry were CLASSIC', () => {
      // v1 shape: unversioned, keyed by difficulty alone.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ EASY: 120, MEDIUM: 285, HARD: 410, EXPERT: 600 }),
      );
      expect(getBestTime('CLASSIC', 'EASY')).toBe(120);
      expect(getBestTime('CLASSIC', 'EXPERT')).toBe(600);
      // Other variants must NOT inherit the migrated values — that's
      // the conflation bug we're closing.
      expect(getBestTime('KILLER', 'EASY')).toBeNull();
      expect(getBestTime('THERMO', 'MEDIUM')).toBeNull();
    });

    it('persists the migrated store back to localStorage on the first read', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ EASY: 120 }));
      getBestTime('CLASSIC', 'EASY'); // triggers migration
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as { version: number; times: Record<string, number> };
      expect(parsed.version).toBe(2);
      expect(parsed.times['CLASSIC-EASY']).toBe(120);
      expect(parsed.times['EASY']).toBeUndefined();
    });

    it('drops non-numeric entries during migration', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ EASY: 120, MEDIUM: 'oops', HARD: null }),
      );
      expect(getBestTime('CLASSIC', 'EASY')).toBe(120);
      expect(getBestTime('CLASSIC', 'MEDIUM')).toBeNull();
      expect(getBestTime('CLASSIC', 'HARD')).toBeNull();
    });

    it('drops a future-version store rather than guessing its shape', () => {
      // A future writer has shipped v3 — until we ship code that
      // understands it, treat it as empty rather than corrupting it.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 99, times: { 'CLASSIC-EASY': 120 } }),
      );
      expect(getBestTime('CLASSIC', 'EASY')).toBeNull();
    });

    it('handles malformed JSON without throwing', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      expect(getBestTime('CLASSIC', 'EASY')).toBeNull();
    });
  });
});
