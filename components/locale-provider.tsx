'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { localeCookie, locales, resolveLocale, type Locale } from '@/lib/locale';

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: 'en', setLocale: () => {} });

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setCurrent] = useState(initial);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  function setLocale(next: Locale) {
    document.cookie = `${localeCookie}=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setCurrent(next);
  }

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

const names = { en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文' };
const labels = { en: 'Language', 'zh-CN': '语言', 'zh-TW': '語言' };

export function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  return (
    <span className="locale-picker">
      <select value={locale} aria-label={labels[locale]} onChange={event => setLocale(resolveLocale(event.target.value))}>
        {locales.map(tag => <option key={tag} value={tag} lang={tag}>{names[tag]}</option>)}
      </select>
    </span>
  );
}
