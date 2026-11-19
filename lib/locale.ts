export const locales = ['en', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = 'redwood-locale';

export function resolveLocale(value?: string | null): Locale {
  const tag = value?.trim().toLowerCase().replaceAll('_', '-');
  switch (tag) {
    case 'zh-tw': case 'zh-hant': case 'zh-hk': case 'zh-mo': case 'zh-hant-tw':
      return 'zh-TW';
    case 'zh': case 'zh-cn': case 'zh-hans': case 'zh-sg': case 'zh-hans-cn':
      return 'zh-CN';
    default:
      return 'en';
  }
}
