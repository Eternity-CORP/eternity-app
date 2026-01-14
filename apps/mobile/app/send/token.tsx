/**
 * Send Screen 1: Token Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSelectedToken, setStep, resetSend } from '@/src/store/slices/send-slice';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function TokenSelectionScreen() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector((state) => state.balance);
  const send = useAppSelector((state) => state.send);
  const [iconErrors, setIconErrors] = useState<{ [key: string]: boolean }>({});

  const handleIconError = (tokenKey: string) => {
    setIconErrors((prev) => ({ ...prev, [tokenKey]: true }));
  };

  // Reset send state when starting new send flow
  useEffect(() => {
    dispatch(resetSend());
  }, [dispatch]);

  const handleTokenSelect = (token: string) => {
    dispatch(setSelectedToken(token));
    dispatch(setStep('recipient'));
    router.push('/send/recipient');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <FontAwesome name="arrow-left" size={16} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.title, theme.typography.title]}>Send</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={[styles.subtitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
        Select token to send
      </Text>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {balance.balances.map((token) => (
          <TouchableOpacity
            key={token.token}
            style={styles.tokenItem}
            onPress={() => handleTokenSelect(token.symbol)}
          >
            <View style={styles.tokenIcon}>
              {token.iconUrl && !iconErrors[token.token] ? (
                <Image
                  source={{ uri: token.iconUrl }}
                  style={styles.tokenIconImage}
                  onError={() => handleIconError(token.token)}
                />
              ) : (
                <View style={styles.tokenIconFallback}>
                  <Text style={[styles.tokenIconText, theme.typography.heading]}>
                    {token.symbol.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.tokenInfo}>
              <Text style={[styles.tokenName, theme.typography.heading]}>
                {token.name || token.symbol}
              </Text>
              <Text style={[styles.tokenSymbol, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                {token.symbol}
              </Text>
            </View>
            <View style={styles.tokenBalance}>
              <Text style={[styles.balance, theme.typography.heading]}>
                {parseFloat(token.balance).toFixed(6)}
              </Text>
              <Text style={[styles.balanceUsd, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                {token.usdValue ? `$${token.usdValue.toFixed(2)}` : '$0.00'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 14,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  tokenSymbol: {
    // Styled inline
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  balance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  balanceUsd: {
    // Styled inline
  },
});
