import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { isSupportedLanguage } from '../../utils/variantSlugs';

interface Language {
  code: string;
  label: string;
  flag: string;
}

/**
 * Language switcher component. Navigates to the same path under the
 * new language prefix (e.g. `/en/killer-sudoku` ↔ `/ru/killer-sudoku`)
 * so the URL stays the source of truth. useLanguageSync inside the
 * route components picks up the URL change and calls i18n.changeLanguage.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const languages: Language[] = [
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
  ];

  const handleLanguageChange = (langCode: string): void => {
    // Replace the leading /{lang} segment in the current path. If we're
    // on `/en/killer-sudoku`, switching to RU goes to `/ru/killer-sudoku`.
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length > 0 && isSupportedLanguage(segments[0])) {
      segments[0] = langCode;
    } else {
      segments.unshift(langCode);
    }
    navigate(`/${segments.join('/')}${location.search}${location.hash}`);
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`
            px-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg font-medium transition-colors text-sm
            ${
              i18n.language === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
          `}
          aria-label={`Switch to ${lang.label}`}
        >
          <span className="mr-1">{lang.flag}</span>
          {lang.label}
        </button>
      ))}
    </div>
  );
}
