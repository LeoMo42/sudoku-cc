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

/**
 * Absolute URL for the social-share preview image. OG/Twitter scrapers
 * don't follow `<base>` and reject relative paths, so this MUST be a
 * fully-qualified URL pointing at the prod deploy.
 */
export const OG_IMAGE_URL = `${CANONICAL_BASE}/icon-512.png`;

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
 * alternates — the rendering component emits a `<link rel="alternate">`
 * for every returned entry, including the page's own language.
 */
export function hreflangAlternates(slug?: string): { lang: SupportedLanguage; href: string }[] {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang, href: canonicalUrl(lang, slug) }));
}
