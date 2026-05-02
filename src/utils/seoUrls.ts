import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './variantSlugs';

/**
 * Canonical origin + base path for the deployed site. Hardcoded rather
 * than read from `import.meta.env.BASE_URL` because the canonical URL
 * is what crawlers index — it has to point at the production deploy
 * regardless of where this code is currently running (dev, preview,
 * prerender). When the site moves to a custom domain, change this in
 * one place.
 */
const CANONICAL_BASE = 'https://leomo42.github.io/sudoku-cc';

/** Build a canonical URL for `/{lang}` (slug omitted) or `/{lang}/{slug}`. */
export function canonicalUrl(lang: string, slug?: string): string {
  const path = slug ? `/${lang}/${slug}` : `/${lang}`;
  return `${CANONICAL_BASE}${path}`;
}

/**
 * Build the full hreflang alternate set for one path. Includes ALL
 * supported languages (each variant page exists in every language) so
 * Google can serve the right one based on the user's Accept-Language.
 * Per Google docs, every page should also list itself in its own
 * alternates — the `current` flag tells the renderer to mark which
 * one is the page emitting the tags.
 */
export function hreflangAlternates(slug?: string): { lang: SupportedLanguage; href: string }[] {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang, href: canonicalUrl(lang, slug) }));
}
