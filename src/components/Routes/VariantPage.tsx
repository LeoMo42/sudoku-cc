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
import { VariantLanding } from './VariantLanding';

/**
 * `/{lang}/{slug}` — the SEO landing page for one variant. The slug
 * resolves to a SudokuTypeId; GameContainer auto-starts that variant
 * (overriding any persisted variant in localStorage — see
 * useAutoStartIdle's forcedVariant). Unknown slugs or unsupported
 * languages bounce to the language home.
 *
 * Renders three React components in head/body order:
 *   - `<LandingMeta>` — per-variant title/description/canonical/hreflang
 *   - `<VariantLanding>` — visible per-variant intro + rules, passed
 *     into GameContainer's landingContent slot so it sits between the
 *     streak banner and the game grid
 *   - `<GameContainer>` — game itself, with `headingTitle` so the
 *     masthead `<h1>` matches the variant SEO topic
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
        landingContent={<VariantLanding variant={variant} />}
      />
    </>
  );
}
