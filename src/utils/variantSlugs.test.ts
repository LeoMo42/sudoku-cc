import { describe, it, expect } from 'vitest';
import {
  VARIANT_SLUGS,
  variantFromSlug,
  slugFromVariant,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
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
