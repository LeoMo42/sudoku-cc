import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadStats,
  recordGameStart,
  recordGameComplete,
  resetStats,
  statsKey,
  STATS_VERSION,
  STATS_KEY,
} from './stats';

describe('stats storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadStats returns empty store when nothing saved', () => {
    const store = loadStats();
    expect(store.version).toBe(STATS_VERSION);
    expect(store.records).toEqual({});
  });

  it('loadStats resets when version mismatches', () => {
    localStorage.setItem(STATS_KEY, JSON.stringify({ version: 99, records: { 'CLASSIC:EASY': { bestTime: 60 } } }));
    const store = loadStats();
    expect(store.records).toEqual({});
  });

  it('statsKey produces correct format', () => {
    expect(statsKey('CLASSIC', 'EASY')).toBe('CLASSIC:EASY');
    expect(statsKey('KILLER', 'EXPERT')).toBe('KILLER:EXPERT');
  });

  it('recordGameStart increments gamesStarted', () => {
    recordGameStart('CLASSIC', 'EASY');
    const store = loadStats();
    expect(store.records['CLASSIC:EASY']?.gamesStarted).toBe(1);
    recordGameStart('CLASSIC', 'EASY');
    expect(loadStats().records['CLASSIC:EASY']?.gamesStarted).toBe(2);
  });

  it('recordGameStart preserves existing record data', () => {
    recordGameComplete('CLASSIC', 'EASY', 120, 2);
    recordGameStart('CLASSIC', 'EASY');
    const rec = loadStats().records['CLASSIC:EASY']!;
    expect(rec.gamesCompleted).toBe(1);
    expect(rec.bestTime).toBe(120);
  });

  it('recordGameComplete updates bestTime on first completion', () => {
    recordGameComplete('DIAGONAL', 'MEDIUM', 300, 1);
    const rec = loadStats().records['DIAGONAL:MEDIUM']!;
    expect(rec.bestTime).toBe(300);
    expect(rec.gamesCompleted).toBe(1);
    expect(rec.totalTime).toBe(300);
    expect(rec.totalMistakes).toBe(1);
  });

  it('recordGameComplete updates bestTime when new time is better', () => {
    recordGameComplete('CLASSIC', 'HARD', 200, 0);
    recordGameComplete('CLASSIC', 'HARD', 150, 1);
    expect(loadStats().records['CLASSIC:HARD']?.bestTime).toBe(150);
  });

  it('recordGameComplete does not update bestTime when new time is worse', () => {
    recordGameComplete('CLASSIC', 'HARD', 150, 0);
    recordGameComplete('CLASSIC', 'HARD', 200, 1);
    expect(loadStats().records['CLASSIC:HARD']?.bestTime).toBe(150);
  });

  it('recordGameComplete accumulates totalTime and totalMistakes', () => {
    recordGameComplete('KILLER', 'EXPERT', 400, 3);
    recordGameComplete('KILLER', 'EXPERT', 350, 2);
    const rec = loadStats().records['KILLER:EXPERT']!;
    expect(rec.totalTime).toBe(750);
    expect(rec.totalMistakes).toBe(5);
    expect(rec.gamesCompleted).toBe(2);
  });

  it('recordGameComplete for different type/difficulty creates separate records', () => {
    recordGameComplete('CLASSIC', 'EASY', 100, 0);
    recordGameComplete('CLASSIC', 'HARD', 200, 1);
    const store = loadStats();
    expect(Object.keys(store.records)).toHaveLength(2);
  });

  it('resetStats clears all records', () => {
    recordGameStart('CLASSIC', 'EASY');
    recordGameComplete('CLASSIC', 'EASY', 100, 0);
    resetStats();
    expect(loadStats().records).toEqual({});
  });

  it('loadStats handles corrupted JSON gracefully', () => {
    localStorage.setItem(STATS_KEY, 'not-json');
    expect(() => loadStats()).not.toThrow();
    expect(loadStats().records).toEqual({});
  });
});
