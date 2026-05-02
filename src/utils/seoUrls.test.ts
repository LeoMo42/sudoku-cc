import { describe, it, expect } from 'vitest';
import { canonicalUrl, hreflangAlternates } from './seoUrls';
import { SUPPORTED_LANGUAGES } from './variantSlugs';

describe('canonicalUrl', () => {
  it('builds /{lang} URL when slug omitted', () => {
    expect(canonicalUrl('en')).toBe('https://leomo42.github.io/sudoku-cc/en');
    expect(canonicalUrl('ru')).toBe('https://leomo42.github.io/sudoku-cc/ru');
  });

  it('builds /{lang}/{slug} URL when slug provided', () => {
    expect(canonicalUrl('en', 'killer-sudoku')).toBe(
      'https://leomo42.github.io/sudoku-cc/en/killer-sudoku',
    );
    expect(canonicalUrl('ru', 'windoku')).toBe(
      'https://leomo42.github.io/sudoku-cc/ru/windoku',
    );
  });
});

describe('hreflangAlternates', () => {
  it('returns one entry per supported language with the same slug', () => {
    const alternates = hreflangAlternates('classic-sudoku');
    expect(alternates).toHaveLength(SUPPORTED_LANGUAGES.length);
    for (const lang of SUPPORTED_LANGUAGES) {
      const match = alternates.find((a) => a.lang === lang);
      expect(match?.href).toBe(`https://leomo42.github.io/sudoku-cc/${lang}/classic-sudoku`);
    }
  });

  it('works without a slug for the language home page', () => {
    const alternates = hreflangAlternates();
    expect(alternates.find((a) => a.lang === 'en')?.href).toBe(
      'https://leomo42.github.io/sudoku-cc/en',
    );
  });
});
