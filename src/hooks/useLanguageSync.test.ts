import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLanguageSync } from './useLanguageSync';

const changeLanguageMock = vi.fn();

// Mutable mock so individual tests can rotate the "current" i18n
// language between runs without re-importing.
const i18nState = { language: 'en' };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      get language() {
        return i18nState.language;
      },
      changeLanguage: changeLanguageMock,
    },
  }),
}));

describe('useLanguageSync', () => {
  beforeEach(() => {
    changeLanguageMock.mockReset();
    i18nState.language = 'en';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('changes i18n language when route lang differs', () => {
    renderHook(() => useLanguageSync('ru'));
    expect(changeLanguageMock).toHaveBeenCalledWith('ru');
  });

  it('does not change i18n language when route lang matches', () => {
    i18nState.language = 'ru';
    renderHook(() => useLanguageSync('ru'));
    expect(changeLanguageMock).not.toHaveBeenCalled();
  });

  // Regression #223 bug 2 — index.html ships <html lang="en"> hardcoded
  // and the prerender pass snapshots whatever lang attribute is on the
  // root element when the route renders. Without this side-effect, all
  // 14 RU prerendered routes would ship lang="en", which is both an
  // SEO and an a11y regression.
  it('mirrors lang onto <html lang> for RU routes', () => {
    renderHook(() => useLanguageSync('ru'));
    expect(document.documentElement.lang).toBe('ru');
  });

  it('mirrors lang onto <html lang> for EN routes (idempotent set)', () => {
    document.documentElement.lang = 'ru'; // simulate a stale value
    renderHook(() => useLanguageSync('en'));
    expect(document.documentElement.lang).toBe('en');
  });

  it('does NOT touch <html lang> for unsupported languages', () => {
    document.documentElement.lang = 'en';
    renderHook(() => useLanguageSync('zz'));
    expect(document.documentElement.lang).toBe('en');
    expect(changeLanguageMock).not.toHaveBeenCalled();
  });
});
