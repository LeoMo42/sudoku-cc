import { useParams, Navigate } from 'react-router-dom';
import { GameContainer } from '../Game/GameContainer';
import {
  isSupportedLanguage,
  variantFromSlug,
  detectPreferredLanguage,
} from '../../utils/variantSlugs';
import { LanguageBridge } from './LanguageBridge';

/**
 * `/{lang}/{slug}` — the SEO landing page for one variant. The slug
 * resolves to a SudokuTypeId; GameContainer auto-starts that variant
 * (overriding any persisted variant in localStorage — see
 * useAutoStartIdle's forcedVariant). Unknown slugs or unsupported
 * languages bounce to the language home.
 *
 * Right now the route just renders GameContainer; PR2 will wrap it in
 * a landing-page layout with variant-specific copy + helmet meta tags.
 */
export function VariantPage() {
  const { lang, slug } = useParams();

  if (!isSupportedLanguage(lang)) {
    return <Navigate to={`/${detectPreferredLanguage()}`} replace />;
  }

  const variant = variantFromSlug(slug);
  if (!variant) {
    return <Navigate to={`/${lang}`} replace />;
  }

  return (
    <>
      <LanguageBridge lang={lang} />
      <GameContainer forcedVariant={variant} />
    </>
  );
}
