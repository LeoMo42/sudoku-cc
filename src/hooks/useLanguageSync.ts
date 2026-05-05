import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupportedLanguage } from '../utils/variantSlugs';

/**
 * URL `:lang` is the source of truth for the active i18n language.
 * Whenever the route segment changes (browser nav, programmatic
 * navigate, deep-link), call i18next.changeLanguage to match AND
 * mirror the language onto `<html lang>`. The effect runs only when
 * the lang string changes and gates on isSupportedLanguage so an
 * unrecognized URL segment can't poison the i18n store — route guards
 * already redirect those to a valid language before this hook would
 * see them, but we keep the guard as belt + suspenders.
 *
 * The `<html lang>` mirror exists for #223 bug 2: index.html ships
 * `<html lang="en">` hardcoded, so without this side-effect every
 * prerendered RU page (`/ru/*`, all 14 of them) would snapshot
 * `lang="en"`. That's a real SEO + accessibility regression: Google
 * de-ranks pages with mismatched lang, and screen readers use the
 * wrong pronunciation rules for RU content. Setting it here means the
 * Playwright prerender pass picks up the correct attribute when it
 * snapshots the rendered DOM.
 */
export function useLanguageSync(lang: string): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isSupportedLanguage(lang)) return;
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    document.documentElement.lang = lang;
  }, [lang, i18n]);
}
