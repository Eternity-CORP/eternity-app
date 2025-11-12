/**
 * Language Service
 * [EYP-M1-L10N-001] Language management and formatting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../i18n/config';
import { SupportedLanguage, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n/types';

const LANGUAGE_STORAGE_KEY = 'app_language';

/**
 * Get current language
 */
export async function getCurrentLanguage(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (saved as SupportedLanguage) || DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Failed to get current language:', error);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Change language
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
    console.log(`✅ Language changed to: ${language}`);
  } catch (error) {
    console.error('Failed to change language:', error);
    throw error;
  }
}

/**
 * Get device language
 */
export function getDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const deviceLocale = locales[0]?.languageCode || 'en';
  const deviceLanguage = deviceLocale.split('-')[0]; // 'en-US' -> 'en'

  // Map device language to supported language
  const supported: SupportedLanguage[] = ['en', 'ru', 'ua'];
  return supported.includes(deviceLanguage as SupportedLanguage)
    ? (deviceLanguage as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Format date according to current language
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  const language = i18n.language as SupportedLanguage;

  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    ua: 'uk-UA',
    pseudo: 'en-US',
  };

  const locale = localeMap[language];

  if (format === 'short') {
    // Short format: 12/31/2023
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(date);
  } else {
    // Long format: December 31, 2023
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
}

/**
 * Format time according to current language
 */
export function formatTime(date: Date): string {
  const language = i18n.language as SupportedLanguage;

  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    ua: 'uk-UA',
    pseudo: 'en-US',
  };

  const locale = localeMap[language];

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Format number according to current language
 */
export function formatNumber(value: number, decimals: number = 2): string {
  const language = i18n.language as SupportedLanguage;

  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    ua: 'uk-UA',
    pseudo: 'en-US',
  };

  const locale = localeMap[language];

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format currency according to current language
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  const language = i18n.language as SupportedLanguage;

  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    ua: 'uk-UA',
    pseudo: 'en-US',
  };

  const locale = localeMap[language];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Today
  if (diffDays === 0) {
    if (diffMins < 60) {
      return i18n.t('dates.minutesAgo', { count: diffMins });
    } else {
      return i18n.t('dates.hoursAgo', { count: diffHours });
    }
  }

  // Yesterday
  if (diffDays === 1) {
    return i18n.t('dates.yesterday');
  }

  // Days ago
  if (diffDays < 7) {
    return i18n.t('dates.daysAgo', { count: diffDays });
  }

  // Default to date format
  return formatDate(date, 'short');
}

/**
 * Is RTL language (for future RTL support)
 */
export function isRTL(): boolean {
  const language = i18n.language as SupportedLanguage;
  // None of our supported languages are RTL
  return false;
}
