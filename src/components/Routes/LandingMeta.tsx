import { useTranslation } from 'react-i18next';
import { canonicalUrl, hreflangAlternates } from '../../utils/seoUrls';
import type { SudokuTypeId } from '../../types/index';

interface Props {
  variant: SudokuTypeId;
  lang: string;
  slug: string;
}

/**
 * Renders per-variant `<title>`, `<meta>`, and `<link>` tags into
 * `<head>` using React 19's native document-metadata hoisting. No
 * react-helmet-async — React 19 picks up these tags from anywhere in
 * the tree and moves them into the document head, including dedup +
 * priority handling.
 *
 * Reuses existing i18n keys (`sudokuTypes.{X}.name|description`) so
 * this PR ships zero new strings; PR4 will add per-variant landing
 * copy (intro paragraph, rules) on top.
 *
 * `<link rel="alternate" hreflang>` includes the page's own language
 * AND every other supported language — Google's recommendation for
 * full bidirectional coverage. The `x-default` alternate points at the
 * English version since that's our primary search audience.
 */
export function LandingMeta({ variant, lang, slug }: Props) {
  const { t } = useTranslation();
  const variantName = t(`sudokuTypes.${variant}.name`);
  const description = t(`sudokuTypes.${variant}.description`);
  const title = `${variantName} — Sudoku Sensei`;
  const canonical = canonicalUrl(lang, slug);
  const alternates = hreflangAlternates(slug);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {alternates.map((alt) => (
        <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl('en', slug)} />
      {/* Open Graph — same title/description, useful for shares too. */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
    </>
  );
}
