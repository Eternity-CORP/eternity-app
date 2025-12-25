import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock i18n config
jest.mock('../../i18n/config', () => ({
  changeLanguage: jest.fn(),
  language: 'en',
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

import {
  getCurrentLanguage,
  changeLanguage,
  getDeviceLanguage,
  getSupportedLanguages,
  formatDate,
} from '../languageService';

describe('languageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentLanguage', () => {
    it('should return saved language from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('ru');
      
      const lang = await getCurrentLanguage();
      
      expect(lang).toBe('ru');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('app_language');
    });

    it('should return default language when nothing saved', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const lang = await getCurrentLanguage();
      
      expect(lang).toBe('en'); // Default
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const lang = await getCurrentLanguage();
      
      expect(lang).toBe('en'); // Fallback to default
    });
  });

  describe('changeLanguage', () => {
    it('should save language to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await changeLanguage('ru');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('app_language', 'ru');
    });
  });

  describe('getDeviceLanguage', () => {
    it('should return device language', () => {
      const lang = getDeviceLanguage();
      expect(lang).toBe('en');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('formatDate', () => {
    it('should format date in short format', () => {
      const date = new Date('2025-12-24');
      const result = formatDate(date, 'short');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date in long format', () => {
      const date = new Date('2025-12-24');
      const result = formatDate(date, 'long');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
