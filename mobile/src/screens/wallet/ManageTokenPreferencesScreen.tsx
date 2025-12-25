import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../context/ThemeContext';
import { MainStackParamList } from '../../navigation/MainNavigator';
import Card from '../../components/common/Card';
import { useTokenChainPreferences } from '../../hooks/useTokenChainPreferences';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { SUPPORTED_TOKENS } from '../../constants/tokens';

type Props = NativeStackScreenProps<MainStackParamList, 'ManageTokenPreferences'>;

export default function ManageTokenPreferencesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    preferences,
    loading: prefsLoading,
    setPreference,
    removePreference,
    getPreferenceForToken
  } = useTokenChainPreferences();
  const { activeWallets, loading: walletsLoading } = useWalletPreferences();

  const [savingToken, setSavingToken] = useState<string | null>(null);

  const handleSetPreference = async (tokenSymbol: string, chainId: string) => {
    if (!chainId || chainId === 'none') {
      // Remove preference
      const pref = preferences.find(p => p.tokenSymbol === tokenSymbol);
      if (pref) {
        try {
          setSavingToken(tokenSymbol);
          await removePreference(pref.id);
        } catch (err: any) {
          Alert.alert(
            'Ошибка / Error',
            err.message || 'Failed to remove preference / Не удалось удалить preference'
          );
        } finally {
          setSavingToken(null);
        }
      }
      return;
    }

    try {
      setSavingToken(tokenSymbol);
      await setPreference(tokenSymbol, chainId);
    } catch (err: any) {
      Alert.alert(
        'Ошибка / Error',
        err.message || 'Failed to set preference / Не удалось установить preference'
      );
    } finally {
      setSavingToken(null);
    }
  };

  const availableChains = activeWallets.map(w => w.chainId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Предпочтения токенов{'\n'}Token Preferences
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {prefsLoading || walletsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <Card style={styles.infoCard}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Установите предпочтительные сети для каждого токена. Это помогает автоматически направлять платежи на правильную сеть.{'\n\n'}
                Set preferred networks for each token. This helps route payments to the right chain automatically.
              </Text>
            </View>
          </Card>

          {/* Tokens List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Предпочтения токенов / Token Preferences
            </Text>

            {SUPPORTED_TOKENS.map((token, index) => {
              const currentPref = getPreferenceForToken(token.symbol);
              const isSaving = savingToken === token.symbol;

              return (
                <Card key={token.symbol} style={[styles.tokenCard, index === 0 && styles.firstCard]}>
                  <View style={styles.tokenRow}>
                    <View style={styles.tokenLeft}>
                      <View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.surface }]}>
                        {token.logoUri ? (
                          <Text style={styles.tokenIconText}>{token.symbol.substring(0, 2)}</Text>
                        ) : (
                          <Text style={styles.tokenIconText}>{token.symbol.substring(0, 2)}</Text>
                        )}
                      </View>
                      <View style={styles.tokenInfo}>
                        <Text style={[styles.tokenName, { color: theme.colors.text }]}>{token.name}</Text>
                        <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]}>{token.symbol}</Text>
                      </View>
                    </View>

                    {isSaving ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <View style={[
                        styles.pickerContainer,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border
                        }
                      ]}>
                        <Picker
                          selectedValue={currentPref || 'none'}
                          onValueChange={(value) => handleSetPreference(token.symbol, value)}
                          style={[styles.picker, { color: theme.colors.text }]}
                          dropdownIconColor={theme.colors.text}
                        >
                          <Picker.Item label="Авто / Auto" value="none" />
                          {availableChains.map(chainId => (
                            <Picker.Item key={chainId} label={chainId} value={chainId} />
                          ))}
                        </Picker>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  infoCard: { marginHorizontal: 16, marginBottom: 16, padding: 16 },
  infoBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  tokenCard: { marginBottom: 8, padding: 16 },
  firstCard: { marginTop: 0 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tokenIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tokenIconText: { fontSize: 18, fontWeight: '700' },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  tokenSymbol: { fontSize: 13 },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
    minWidth: 140,
    height: 40,
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 40 : 50,
    width: Platform.OS === 'ios' ? 130 : 140,
  },
  spacer: { height: 40 },
});
