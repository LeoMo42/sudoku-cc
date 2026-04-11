import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBestTime, updateBestTime } from './bestTime';

describe('bestTime', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no best time stored', () => {
    expect(getBestTime('EASY')).toBeNull();
  });

  it('updateBestTime saves first completion and returns true', () => {
    expect(updateBestTime('EASY', 120)).toBe(true);
    expect(getBestTime('EASY')).toBe(120);
  });

  it('updateBestTime returns true and updates when new time is faster', () => {
    updateBestTime('MEDIUM', 200);
    expect(updateBestTime('MEDIUM', 150)).toBe(true);
    expect(getBestTime('MEDIUM')).toBe(150);
  });

  it('updateBestTime returns false and keeps old time when new time is slower', () => {
    updateBestTime('HARD', 100);
    expect(updateBestTime('HARD', 200)).toBe(false);
    expect(getBestTime('HARD')).toBe(100);
  });

  it('updateBestTime returns false when new time equals the best', () => {
    updateBestTime('EXPERT', 300);
    expect(updateBestTime('EXPERT', 300)).toBe(false);
  });

  it('stores times independently per difficulty', () => {
    updateBestTime('EASY', 90);
    updateBestTime('HARD', 400);
    expect(getBestTime('EASY')).toBe(90);
    expect(getBestTime('MEDIUM')).toBeNull();
    expect(getBestTime('HARD')).toBe(400);
  });

  it('getBestTime returns null when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked');
    });
    expect(getBestTime('EASY')).toBeNull();
  });

  it('updateBestTime returns true and does not throw when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    expect(() => updateBestTime('EASY', 100)).not.toThrow();
    expect(updateBestTime('EASY', 100)).toBe(true);
  });
});
