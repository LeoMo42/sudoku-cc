import { useTranslation } from 'react-i18next';

/**
 * Language switcher component
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
  ];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`
            px-3 py-1.5 rounded-lg font-medium transition-colors text-sm
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
