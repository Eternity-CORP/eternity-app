/**
 * Deposit Screen — Fiat On-Ramp
 * Opens Onramper in the system browser via expo-linking.
 * expo-web-browser is not installed; expo-linking covers this use case.
 */

import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { buildOnramperUrl } from '@e-y/shared';

const ONRAMPER_API_KEY = 'pk_prod_01JFGCX6TRMG3CXE5FE43130GG';

export default function DepositScreen() {
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);

  const address = currentAccount?.address ?? '';

  const handleOpenOnramper = async () => {
    const url = buildOnramperUrl(address, ONRAMPER_API_KEY);
    if (!url) {
      Alert.alert('Error', 'Could not build payment URL.');
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Error', 'Cannot open browser. Please check your device settings.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Buy Crypto" />

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: dynamicTheme.colors.buttonPrimary + '20' }]}>
          <FontAwesome name="credit-card" size={48} color={dynamicTheme.colors.buttonPrimary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>
          Buy Crypto
        </Text>

        <Text style={[styles.subtitle, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
          Purchase ETH and other tokens directly with your bank card or bank transfer via Onramper.
        </Text>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          {FEATURES.map((feature) => (
            <View key={feature.label} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: dynamicTheme.colors.success + '20' }]}>
                <FontAwesome name={feature.icon as 'check'} size={14} color={dynamicTheme.colors.success} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureLabel, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {feature.label}
                </Text>
                <Text style={[styles.featureDesc, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Destination address */}
        {address ? (
          <View style={[styles.addressCard, { backgroundColor: dynamicTheme.colors.surface }]}>
            <Text style={[styles.addressLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Funds will be sent to
            </Text>
            <Text style={[styles.addressValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {address.slice(0, 8)}...{address.slice(-6)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* CTA */}
      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.buyButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
          onPress={handleOpenOnramper}
          activeOpacity={0.8}
        >
          <FontAwesome name="external-link" size={16} color={dynamicTheme.colors.buttonPrimaryText} style={styles.buyButtonIcon} />
          <Text style={[styles.buyButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
            Continue to Onramper
          </Text>
        </TouchableOpacity>
        <Text style={[styles.disclaimer, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
          You will be redirected to Onramper's secure payment page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const FEATURES: { label: string; desc: string; icon: string }[] = [
  { label: 'Bank card', desc: 'Visa & Mastercard accepted', icon: 'check' },
  { label: 'Bank transfer', desc: 'SEPA and local transfers', icon: 'check' },
  { label: 'Multiple currencies', desc: 'USD, EUR, GBP and more', icon: 'check' },
  { label: 'Direct to wallet', desc: 'Funds sent to your address', icon: 'check' },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  featureCard: {
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    color: theme.colors.textPrimary,
  },
  featureDesc: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addressCard: {
    width: '100%',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  addressLabel: {
    marginBottom: theme.spacing.xs,
  },
  addressValue: {
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
    gap: theme.spacing.sm,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  buyButtonIcon: {
    marginRight: 4,
  },
  buyButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  disclaimer: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
  },
});
