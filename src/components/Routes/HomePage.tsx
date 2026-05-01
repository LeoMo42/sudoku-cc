import { useParams, Navigate } from 'react-router-dom';
import { GameContainer } from '../Game/GameContainer';
import { isSupportedLanguage, detectPreferredLanguage } from '../../utils/variantSlugs';
import { LanguageBridge } from './LanguageBridge';

/**
 * `/{lang}` — the no-variant home page. Renders the existing
 * GameContainer with no forced variant; whatever's persisted in
 * localStorage (or the reducer default) wins. Unsupported language
 * codes redirect to the user's preferred language.
 */
export function HomePage() {
  const { lang } = useParams();

  if (!isSupportedLanguage(lang)) {
    return <Navigate to={`/${detectPreferredLanguage()}`} replace />;
  }

  return (
    <>
      <LanguageBridge lang={lang} />
      <GameContainer />
    </>
  );
}
