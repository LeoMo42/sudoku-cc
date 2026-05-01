import type { SudokuTypeId } from '../types/index';

/**
 * Stable URL slugs for each variant. Used by the SEO landing pages
 * (#23) — `/{lang}/{slug}` resolves to a variant id and pre-starts that
 * puzzle. Keep these immutable: changing a slug breaks any external
 * link to a landing page and resets that page's accumulated SEO equity.
 *
 * Slugs follow the long-tail "X sudoku" / "X-sudoku" pattern that
 * matches actual search intent ("killer sudoku online", "thermo
 * sudoku free"). For variants whose name is already a recognizable
 * standalone word ("Windoku", "Kropki") we don't suffix — adding
 * "-sudoku" would feel redundant and reduce match rate for the
 * primary keyword.
 */
export const VARIANT_SLUGS: Record<SudokuTypeId, string> = {
  CLASSIC: 'classic-sudoku',
  DIAGONAL: 'diagonal-sudoku',
  WINDOKU: 'windoku',
  ANTI_KNIGHT: 'anti-knight-sudoku',
  ODD_EVEN: 'odd-even-sudoku',
  ANTI_KING: 'anti-king-sudoku',
  NON_CONSECUTIVE: 'non-consecutive-sudoku',
  KROPKI: 'kropki',
  KILLER: 'killer-sudoku',
  LITTLE_KILLER: 'little-killer-sudoku',
  GREATER_THAN: 'greater-than-sudoku',
  THERMO: 'thermo-sudoku',
  SANDWICH: 'sandwich-sudoku',
};

const SLUG_TO_VARIANT: Record<string, SudokuTypeId> = Object.fromEntries(
  Object.entries(VARIANT_SLUGS).map(([id, slug]) => [slug, id as SudokuTypeId]),
);

export function variantFromSlug(slug: string | undefined): SudokuTypeId | null {
  if (!slug) return null;
  return SLUG_TO_VARIANT[slug] ?? null;
}

export function slugFromVariant(id: SudokuTypeId): string {
  return VARIANT_SLUGS[id];
}

/**
 * Supported UI languages. Order matters — first entry is the default
 * fallback when the URL language is unrecognized.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string | undefined): lang is SupportedLanguage {
  return !!lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Resolve the user's preferred language: localStorage > browser hint > 'en'.
 * Used by the root `/` redirect to pick which `/{lang}` to go to.
 */
export function detectPreferredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage?.getItem('i18nextLng');
  if (isSupportedLanguage(stored ?? undefined)) return stored as SupportedLanguage;
  const navLang = navigator.language?.slice(0, 2);
  if (isSupportedLanguage(navLang)) return navLang;
  return 'en';
}
