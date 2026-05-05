import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VARIANT_SLUGS,
  variantFromSlug,
  slugFromVariant,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  detectPreferredLanguage,
} from './variantSlugs';
import { SUDOKU_TYPES } from './constants';
import type { SudokuTypeId } from '../types/index';

describe('VARIANT_SLUGS', () => {
  it('covers every SudokuTypeId', () => {
    const ids = Object.keys(SUDOKU_TYPES) as SudokuTypeId[];
    for (const id of ids) {
      expect(VARIANT_SLUGS[id]).toBeTruthy();
    }
  });

  it('slugs are unique', () => {
    const slugs = Object.values(VARIANT_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('slugs are URL-safe (lowercase + hyphens, no spaces or special chars)', () => {
    for (const slug of Object.values(VARIANT_SLUGS)) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
    }
  });
});

describe('variantFromSlug', () => {
  it('round-trips for every variant', () => {
    const ids = Object.keys(SUDOKU_TYPES) as SudokuTypeId[];
    for (const id of ids) {
      expect(variantFromSlug(slugFromVariant(id))).toBe(id);
    }
  });

  it('returns null for unknown slugs', () => {
    expect(variantFromSlug('not-a-real-variant')).toBeNull();
    expect(variantFromSlug('')).toBeNull();
    expect(variantFromSlug(undefined)).toBeNull();
  });
});

describe('isSupportedLanguage', () => {
  it('accepts supported languages', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(isSupportedLanguage(lang)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    expect(isSupportedLanguage('de')).toBe(false);
    expect(isSupportedLanguage('en-US')).toBe(false);
    expect(isSupportedLanguage('')).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });
});

// Regression #226 bug 1 — detectPreferredLanguage was reading
// `i18nextLng` (the i18next library default), but src/i18n/config.js
// writes the user's saved preference to `language`. The two never
// agreed, so RU users on EN-default browsers landed on /en every
// visit. This test pins the storage key to the one i18n actually
// writes.
describe('detectPreferredLanguage', () => {
  const origNavigator = window.navigator;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: origNavigator,
      configurable: true,
    });
  });

  function setNavigatorLanguage(lang: string) {
    Object.defineProperty(window, 'navigator', {
      value: { language: lang },
      configurable: true,
    });
  }

  it('reads localStorage["language"] (NOT "i18nextLng")', () => {
    localStorage.setItem('language', 'ru');
    localStorage.setItem('i18nextLng', 'en'); // stale value from a prior reader
    setNavigatorLanguage('en-US');
    expect(detectPreferredLanguage()).toBe('ru');
  });

  it('falls back to navigator.language when localStorage["language"] is unset', () => {
    setNavigatorLanguage('ru-RU');
    expect(detectPreferredLanguage()).toBe('ru');
  });

  it('returns "en" when neither storage nor navigator yields a supported language', () => {
    setNavigatorLanguage('de-DE');
    expect(detectPreferredLanguage()).toBe('en');
  });

  it('rejects unsupported localStorage values and falls through to navigator', () => {
    localStorage.setItem('language', 'zz');
    setNavigatorLanguage('ru-RU');
    expect(detectPreferredLanguage()).toBe('ru');
  });
});

describe('drift between variantSlugs.ts and scripts/prerender.mjs', () => {
  it('VARIANT_SLUGS values match the prerender script\'s hardcoded list', async () => {
    // The prerender script duplicates the slug list because Node-running
    // .mjs can't import .ts. This test fails if the two ever diverge —
    // adding a slug here without updating the .mjs would silently miss
    // that page in the production prerender.
    // .mjs has no .d.ts; this import is for runtime drift detection,
    // not for type-checking the prerender script.
    const mod = (await import(
      // @ts-expect-error — no type declarations for the .mjs script
      '../../scripts/prerender.mjs'
    )) as { VARIANT_SLUGS: string[]; LANGS: string[] };
    const { VARIANT_SLUGS: PRERENDER_SLUGS, LANGS: PRERENDER_LANGS } = mod;
    expect([...PRERENDER_SLUGS].sort()).toEqual([...Object.values(VARIANT_SLUGS)].sort());
    expect([...PRERENDER_LANGS].sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });
});
