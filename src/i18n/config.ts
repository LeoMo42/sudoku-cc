import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

// safeGetItem, not a bare read (#271). This runs at MODULE level, and main.tsx
// imports this file before <App>, so a SecurityError here (Safari private mode,
// blocked site data) aborts module evaluation before React renders anything.
// No <ErrorBoundary> exists yet to catch it — the user gets a blank page, and
// no downstream guard can help. This is the app's earliest storage access and
// therefore the one that has to be safe first.
const savedLanguage = safeGetItem('language') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ru: {
        translation: ru,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  safeSetItem('language', lng);
});

// Imported for side effects in main.tsx (no default export needed)
