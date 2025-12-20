/**
 * Language Settings Screen
 * [EYP-M1-L10N-001] Language selection and regional formats
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import {
  getCurrentLanguage,
  changeLanguage,
  getSupportedLanguages,
  formatDate,
  formatTime,
  formatNumber,
  formatCurrency,
} from '../services/languageService';
import { SupportedLanguage } from '../i18n/types';

type Props = NativeStackScreenProps<MainStackParamList, 'LanguageSettings'>;

export default function LanguageSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const languages = getSupportedLanguages();

  useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    const lang = await getCurrentLanguage();
    setCurrentLang(lang);
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    try {
      await changeLanguage(lang);
      setCurrentLang(lang);

      // Show success message
      Alert.alert(
        t('common.success'),
        t('language.restartMessage'),
        [
          {
            text: t('language.restartLater'),
            style: 'cancel',
          },
          {
            text: t('language.restartNow'),
            onPress: () => {
              // In a real app, you might want to use Updates.reloadAsync() from expo-updates
              // For now, just navigate back
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    }
  };

  // Example data for format previews
  const now = new Date();
  const exampleNumber = 1234567.89;
  const exampleCurrency = 1250.50;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        {/* Header */}
        <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: insets.top + 12, paddingBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
                {t('language.title')}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>
                {t('language.subtitle')}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Language */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                  {t('language.currentLanguage')}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>
                  {languages.find(l => l.code === currentLang)?.nativeName}
                </Text>
              </View>
              <Text style={{ fontSize: 32 }}>
                {languages.find(l => l.code === currentLang)?.flag}
              </Text>
            </View>
          </Card>
        </View>

        {/* Language Selection */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold, marginBottom: theme.spacing.md }}>
              {t('language.changeLanguage')}
            </Text>

            {languages.map((lang, index) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: theme.colors.surface,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                  <View>
                    <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                      {lang.nativeName}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                      {lang.name}
                    </Text>
                  </View>
                </View>

                {currentLang === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Regional Formats Preview */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md }}>
              <Ionicons name="globe-outline" size={20} color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                {t('language.formats')}
              </Text>
            </View>

            {/* Date Format */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                {t('language.dateFormat')}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                {formatDate(now, 'short')}
              </Text>
            </View>

            {/* Time Format */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.surface,
              }}
            >
              <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                {t('language.timeFormat')}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                {formatTime(now)}
              </Text>
            </View>

            {/* Number Format */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.surface,
              }}
            >
              <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                {t('language.numberFormat')}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                {formatNumber(exampleNumber, 2)}
              </Text>
            </View>

            {/* Currency Format */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.surface,
              }}
            >
              <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                {t('language.currencyFormat')}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                {formatCurrency(exampleCurrency, 'USD')}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.primary + '10',
                padding: 12,
                borderRadius: 8,
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: 12, flex: 1 }}>
                Formats are automatically adjusted based on your selected language
              </Text>
            </View>
          </Card>
        </View>

        {/* Pseudo-locale Info (only show if pseudo is selected) */}
        {currentLang === 'pseudo' && (
          <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <Card>
              <View
                style={{
                  backgroundColor: theme.colors.warning + '20',
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <Ionicons name="construct" size={24} color={theme.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.warning, fontWeight: '600', marginBottom: 4 }}>
                    Pseudo-locale Testing Mode
                  </Text>
                  <Text style={{ color: theme.colors.warning, fontSize: 12 }}>
                    This special locale helps identify UI layout issues with longer strings. Look for text overflow, truncation, or layout breaks.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
