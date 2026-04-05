import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  label: string;
  flag: string;
}

/**
 * Language switcher component
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages: Language[] = [
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
  ];

  const handleLanguageChange = (langCode: string): void => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`
            px-3 min-h-[44px] flex items-center rounded-lg font-medium transition-colors text-sm
            ${
              i18n.language === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
