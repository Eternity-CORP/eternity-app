/**
 * Send Screen 1: Token Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSelectedToken, setStep } from '@/src/store/slices/send-slice';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function TokenSelectionScreen() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector((state) => state.balance);
  const send = useAppSelector((state) => state.send);

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
            key={token.symbol}
            style={styles.tokenItem}
            onPress={() => handleTokenSelect(token.symbol)}
          >
            <View style={styles.tokenIcon}>
              <FontAwesome name="circle" size={40} color={theme.colors.buttonPrimary} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={[styles.tokenName, theme.typography.heading]}>
                {token.name}
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
                ${token.usdValue.toFixed(2)}
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
