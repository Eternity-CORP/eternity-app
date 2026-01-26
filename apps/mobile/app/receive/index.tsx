/**
 * Receive Screen
 * Shows address and QR code options
 */

import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { getUsernameByAddress } from '@/src/services/username-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

type Tab = 'address' | 'qr';

export default function ReceiveScreen() {
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const [activeTab, setActiveTab] = useState<Tab>('address');
  const [username, setUsername] = useState<string | null>(null);

  // Load username on mount
  useEffect(() => {
    async function loadUsername() {
      if (currentAccount?.address) {
        const name = await getUsernameByAddress(currentAccount.address);
        setUsername(name);
      }
    }
    loadUsername();
  }, [currentAccount?.address]);

  const handleCopyAddress = async () => {
    if (!currentAccount?.address) return;

    try {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Address copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleCopyUsername = async () => {
    if (!username) return;

    try {
      await Clipboard.setStringAsync(`@${username}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Username copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy username');
    }
  };

  const address = currentAccount?.address || '';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Receive" />

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: dynamicTheme.colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'address' && [styles.tabActive, { borderBottomColor: dynamicTheme.colors.buttonPrimary }]]}
          onPress={() => setActiveTab('address')}
        >
          <FontAwesome
            name="address-card"
            size={16}
            color={activeTab === 'address' ? dynamicTheme.colors.buttonPrimary : dynamicTheme.colors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              theme.typography.caption,
              { color: activeTab === 'address' ? dynamicTheme.colors.buttonPrimary : dynamicTheme.colors.textTertiary },
            ]}
          >
            Address
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'qr' && [styles.tabActive, { borderBottomColor: dynamicTheme.colors.buttonPrimary }]]}
          onPress={() => setActiveTab('qr')}
        >
          <FontAwesome
            name="qrcode"
            size={16}
            color={activeTab === 'qr' ? dynamicTheme.colors.buttonPrimary : dynamicTheme.colors.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              theme.typography.caption,
              { color: activeTab === 'qr' ? dynamicTheme.colors.buttonPrimary : dynamicTheme.colors.textTertiary },
            ]}
          >
            QR Code
          </Text>
        </TouchableOpacity>

      </View>

      <View style={styles.container}>
        {/* Address Tab */}
        {activeTab === 'address' && (
          <View style={styles.content}>
            {username && (
              <View style={[styles.usernameCard, { backgroundColor: dynamicTheme.colors.surface }]}>
                <Text style={[styles.usernameLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Your Username
                </Text>
                <TouchableOpacity style={styles.usernameRow} onPress={handleCopyUsername}>
                  <Text style={[styles.usernameValue, theme.typography.title, { color: dynamicTheme.colors.success }]}>
                    @{username}
                  </Text>
                  <FontAwesome name="copy" size={16} color={dynamicTheme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.addressCard, { backgroundColor: dynamicTheme.colors.surface }]}>
              <Text style={[styles.addressLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Your Wallet Address
              </Text>
              <Text style={[styles.addressValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} selectable>
                {address}
              </Text>
              <TouchableOpacity style={[styles.copyButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]} onPress={handleCopyAddress}>
                <FontAwesome name="copy" size={16} color={dynamicTheme.colors.buttonPrimaryText} />
                <Text style={[styles.copyButtonText, theme.typography.body, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                  Copy Address
                </Text>
              </TouchableOpacity>
            </View>

            {!username && (
              <TouchableOpacity
                style={[styles.claimUsernameButton, { borderColor: dynamicTheme.colors.buttonPrimary }]}
                onPress={() => router.push('/profile/username')}
              >
                <FontAwesome name="at" size={16} color={dynamicTheme.colors.buttonPrimary} />
                <Text style={[styles.claimUsernameText, theme.typography.body, { color: dynamicTheme.colors.buttonPrimary }]}>
                  Claim your @username
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <View style={styles.content}>
            <View style={[styles.qrCard, { backgroundColor: dynamicTheme.colors.surface }]}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={address}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
              <Text style={[styles.qrHint, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Scan this QR code to send tokens to this address
              </Text>
            </View>

            <View style={styles.addressPreview}>
              <Text style={[styles.addressPreviewText, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                {truncateAddress(address, 12, 12)}
              </Text>
            </View>

            <TouchableOpacity style={[styles.shareButton, { backgroundColor: dynamicTheme.colors.surface }]} onPress={handleCopyAddress}>
              <FontAwesome name="share" size={16} color={dynamicTheme.colors.textPrimary} />
              <Text style={[styles.shareButtonText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                Share Address
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.buttonPrimary,
  },
  tabText: {
    // Styled inline
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  // Address Tab
  usernameCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  usernameLabel: {
    marginBottom: theme.spacing.xs,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usernameValue: {
    // Styled inline
  },
  addressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  addressLabel: {
    marginBottom: theme.spacing.sm,
  },
  addressValue: {
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  copyButtonText: {
    // Styled inline
  },
  claimUsernameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.md,
    borderStyle: 'dashed',
  },
  claimUsernameText: {
    // Styled inline
  },
  // QR Tab
  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  qrContainer: {
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  qrHint: {
    textAlign: 'center',
  },
  addressPreview: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  addressPreviewText: {
    fontFamily: 'monospace',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  shareButtonText: {
    color: theme.colors.textPrimary,
  },
});
