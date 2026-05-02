import { useTranslation } from 'react-i18next';
import { canonicalUrl, hreflangAlternates } from '../../utils/seoUrls';

interface Props {
  lang: string;
}

/**
 * Site-wide head metadata for the language-home route (`/{lang}`).
 * Counterpart to `LandingMeta` (used on `/{lang}/{slug}`); they share
 * the canonical/hreflang machinery from utils/seoUrls but ship
 * different title + description.
 *
 * Static strings live in i18n (`meta.home.{title,description}`) so a
 * translator can localize them. PR2 ships `en` + `ru` — see the
 * locale files.
 */
export function HomeMeta({ lang }: Props) {
  const { t } = useTranslation();
  const title = t('meta.home.title');
  const description = t('meta.home.description');
  const canonical = canonicalUrl(lang);
  const alternates = hreflangAlternates();

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {alternates.map((alt) => (
        <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl('en')} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
    </>
  );
}
