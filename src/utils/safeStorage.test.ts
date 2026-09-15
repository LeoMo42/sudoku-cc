import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage';

// The failure these guard against is NOT "localStorage is missing". It is
// "localStorage is present and every access throws" — Safari private mode,
// third-party-cookie blocks, enterprise policies (#218, #271). So the mock
// below is a fully-formed Storage whose every method throws, which is what
// `typeof localStorage !== 'undefined'` and `window.localStorage?.` both
// sail straight past.
function mockThrowingStorage(): Storage {
  return {
    length: 0,
    clear: () => { throw new Error('SecurityError'); },
    getItem: () => { throw new Error('SecurityError'); },
    key: () => { throw new Error('SecurityError'); },
    removeItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('SecurityError'); },
  } satisfies Storage;
}

describe('safeStorage — hostile storage (#218, #271)', () => {
  let originalStorage: Storage;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
    warnSpy.mockRestore();
  });

  // Regression #271. This is the one that turned an error boundary's recovery
  // screen into a blank page: ErrorBoundary read localStorage while rendering
  // its fallback, and a throw there is thrown inside the boundary itself.
  it('safeGetItem returns null instead of throwing', () => {
    let result: string | null = 'unset';
    expect(() => { result = safeGetItem('language'); }).not.toThrow();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read from localStorage:',
      expect.any(Error),
    );
  });

  it('safeSetItem swallows SecurityError instead of crashing the caller', () => {
    expect(() => safeSetItem('any-key', 'any-value')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist to localStorage:',
      expect.any(Error),
    );
  });

  it('safeRemoveItem swallows SecurityError silently (cleanup path)', () => {
    expect(() => safeRemoveItem('any-key')).not.toThrow();
    // safeRemoveItem deliberately does NOT log — it's only called from
    // already-failing paths where adding more noise hurts signal.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('safeStorage — storage absent entirely', () => {
  let originalStorage: Storage;

  beforeEach(() => {
    originalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('all three are no-ops when localStorage is undefined', () => {
    expect(() => safeSetItem('k', 'v')).not.toThrow();
    expect(() => safeRemoveItem('k')).not.toThrow();
    expect(safeGetItem('k')).toBeNull();
  });
});

describe('safeStorage — working storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('round-trips a value', () => {
    safeSetItem('k', 'v');
    expect(safeGetItem('k')).toBe('v');
    safeRemoveItem('k');
    expect(safeGetItem('k')).toBeNull();
  });

  it('safeGetItem returns null for an unset key, same as a failed read', () => {
    expect(safeGetItem('never-written')).toBeNull();
  });
});
