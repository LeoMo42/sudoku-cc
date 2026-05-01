import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupportedLanguage } from '../utils/variantSlugs';

/**
 * URL `:lang` is the source of truth for the active i18n language.
 * Whenever the route segment changes (browser nav, programmatic
 * navigate, deep-link), call i18next.changeLanguage to match. The
 * effect runs only when the lang string changes and gates on
 * isSupportedLanguage so an unrecognized URL segment can't poison the
 * i18n store — route guards already redirect those to a valid language
 * before this hook would see them, but we keep the guard as belt +
 * suspenders.
 */
export function useLanguageSync(lang: string): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isSupportedLanguage(lang)) return;
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
}
