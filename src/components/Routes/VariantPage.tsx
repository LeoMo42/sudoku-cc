import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GameContainer } from '../Game/GameContainer';
import {
  isSupportedLanguage,
  variantFromSlug,
  detectPreferredLanguage,
} from '../../utils/variantSlugs';
import { LanguageBridge } from './LanguageBridge';
import { LandingMeta } from './LandingMeta';

/**
 * `/{lang}/{slug}` — the SEO landing page for one variant. The slug
 * resolves to a SudokuTypeId; GameContainer auto-starts that variant
 * (overriding any persisted variant in localStorage — see
 * useAutoStartIdle's forcedVariant). Unknown slugs or unsupported
 * languages bounce to the language home.
 *
 * Renders `<LandingMeta>` for per-variant `<title>` / `<meta description>`
 * / canonical / hreflang and passes the variant name into GameContainer
 * as `headingTitle` so the page's `<h1>` matches the SEO topic instead
 * of the generic "Sudoku" brand wordmark — single h1 per page.
 *
 * PR4 will add a per-variant intro paragraph + rules block above the
 * game (variant-specific landing copy).
 */
export function VariantPage() {
  const { lang, slug } = useParams();
  const { t } = useTranslation();

  if (!isSupportedLanguage(lang)) {
    return <Navigate to={`/${detectPreferredLanguage()}`} replace />;
  }

  const variant = variantFromSlug(slug);
  if (!variant) {
    return <Navigate to={`/${lang}`} replace />;
  }

  return (
    <>
      <LandingMeta variant={variant} lang={lang} slug={slug!} />
      <LanguageBridge lang={lang} />
      <GameContainer
        forcedVariant={variant}
        headingTitle={t(`sudokuTypes.${variant}.name`)}
      />
    </>
  );
}
