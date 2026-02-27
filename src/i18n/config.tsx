'use client';

import { useState, useCallback, useEffect, useContext, createContext, type ReactNode } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const translations: Record<Locale, Record<string, unknown>> = { en, hi };

// Flatten nested keys: { auth: { login: "Login" } } → { "auth.login": "Login" }
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

// Pre-flatten all translations
const flatTranslations: Record<Locale, Record<string, string>> = {
  en: flattenObject(translations.en),
  hi: flattenObject(translations.hi),
};

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem('lms-locale');
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  return DEFAULT_LOCALE;
}

// Translation function
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return flatTranslations[locale]?.[key] ?? flatTranslations[DEFAULT_LOCALE]?.[key] ?? key;
}

// ─── Context ─────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (_locale: Locale) => void;
  t: (_key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (_key: string) => _key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lms-locale', newLocale);
    }
  }, []);

  const translate = useCallback((key: string) => t(key, locale), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </I18nContext.Provider>
  );
}

// React hook — now reads from Context so all consumers share the same locale
export function useTranslation() {
  return useContext(I18nContext);
}
