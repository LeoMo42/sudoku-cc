import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Regression #271, found by codex review.
//
// main.tsx imports './i18n/config' BEFORE './App'. This module reads
// localStorage at top level, so in a browser where storage throws
// (Safari private mode, blocked site data, enterprise policy) the throw
// happened during module evaluation — before React rendered anything and
// before <ErrorBoundary> existed to catch it. The user got a blank page,
// and no downstream guard could have helped: this is the app's earliest
// storage access.
//
// These tests import the module fresh under a hostile storage so the
// module-level line actually re-executes.

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

describe('i18n bootstrap under hostile storage (#271)', () => {
  let originalStorage: Storage;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    originalStorage = window.localStorage;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
      writable: true,
    });
    warnSpy.mockRestore();
    vi.resetModules();
  });

  it('module evaluation does not throw when localStorage throws', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });

    await expect(import('./config')).resolves.toBeDefined();
  });

  it('falls back to the default language rather than dying', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });

    await import('./config');
    const { default: i18n } = await import('i18next');
    expect(i18n.language).toBe('ru');
  });

  it('honours a stored language when storage works', async () => {
    localStorage.clear();
    localStorage.setItem('language', 'en');

    await import('./config');
    const { default: i18n } = await import('i18next');
    expect(i18n.language).toBe('en');
    localStorage.clear();
  });

  it('a languageChanged write does not throw when storage throws', async () => {
    await import('./config');
    const { default: i18n } = await import('i18next');

    Object.defineProperty(window, 'localStorage', {
      value: mockThrowingStorage(),
      configurable: true,
      writable: true,
    });

    await expect(i18n.changeLanguage('en')).resolves.toBeDefined();
  });
});
