/**
 * i18n Configuration
 * [EYP-M1-L10N-001] Localization RU/UA/EN
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ru from './locales/ru.json';
import ua from './locales/ua.json';
import pseudo from './locales/pseudo.json';

import { DEFAULT_LANGUAGE, SupportedLanguage } from './types';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Language detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Try to get saved language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device language
      const locales = Localization.getLocales();
      const deviceLocale = locales[0]?.languageCode || 'en';
      const deviceLanguage = deviceLocale.split('-')[0]; // 'en-US' -> 'en'

      // Map device language to supported language
      const supportedLanguages: SupportedLanguage[] = ['en', 'ru', 'ua'];
      const language = supportedLanguages.includes(deviceLanguage as SupportedLanguage)
        ? deviceLanguage
        : DEFAULT_LANGUAGE;

      callback(language);
    } catch (error) {
      console.error('Language detection failed:', error);
      callback(DEFAULT_LANGUAGE);
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to cache language:', error);
    }
  },
};

// Initialize i18next
(i18n as any)
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      ua: { translation: ua },
      pseudo: { translation: pseudo },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
