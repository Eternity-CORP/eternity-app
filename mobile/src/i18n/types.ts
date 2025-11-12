/**
 * i18n Type Definitions
 * [EYP-M1-L10N-001] Localization RU/UA/EN
 */

export type SupportedLanguage = 'en' | 'ru' | 'ua' | 'pseudo';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
  },
  ua: {
    code: 'ua',
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
  },
  pseudo: {
    code: 'pseudo',
    name: 'Pseudo (Test)',
    nativeName: '[Þšéûδö]',
    flag: '🔧',
  },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
