import { Navigate, useLocation } from 'react-router-dom';
import { detectPreferredLanguage } from '../../utils/variantSlugs';

/**
 * Bare `/` lands here. Picks the user's preferred language (localStorage
 * > navigator.language > 'en') and redirects to `/{lang}`. `replace` so
 * the empty-path entry doesn't pollute browser history.
 *
 * Preserves `location.search` so query-param deep-links survive the
 * redirect (#226 bug 2). useAutoStartIdle reads `?type=` and
 * `?difficulty=` to auto-start a specific puzzle; before this fix,
 * `https://leomo42.github.io/sudoku-cc/?type=KILLER&difficulty=EXPERT`
 * landed on default Classic Medium because the search string was
 * dropped at this hop.
 */
export function RootRedirect() {
  const lang = detectPreferredLanguage();
  const { search } = useLocation();
  return <Navigate to={{ pathname: `/${lang}`, search }} replace />;
}
