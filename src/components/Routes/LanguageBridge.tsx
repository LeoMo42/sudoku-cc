import { useLanguageSync } from '../../hooks/useLanguageSync';

/**
 * Tiny adapter that mirrors the URL `:lang` segment into i18next on
 * mount + whenever it changes. Render-null component instead of an
 * inline hook call so route components stay declarative — every route
 * pattern that owns a `:lang` param renders one of these and forgets.
 *
 * Lives as its own file (vs. a named export from useLanguageSync.ts)
 * to match the project convention of one component per file in
 * `components/Routes/`.
 */
export function LanguageBridge({ lang }: { lang: string }) {
  useLanguageSync(lang);
  return null;
}
