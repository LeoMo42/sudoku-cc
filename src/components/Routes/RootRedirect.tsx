import { Navigate } from 'react-router-dom';
import { detectPreferredLanguage } from '../../utils/variantSlugs';

/**
 * Bare `/` lands here. Picks the user's preferred language (localStorage
 * > navigator.language > 'en') and redirects to `/{lang}`. `replace` so
 * the empty-path entry doesn't pollute browser history.
 */
export function RootRedirect() {
  const lang = detectPreferredLanguage();
  return <Navigate to={`/${lang}`} replace />;
}
