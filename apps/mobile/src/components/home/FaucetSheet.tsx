import { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, ScrollView, StyleSheet, Animated, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FAUCETS, type FaucetInfo } from '@/src/constants/faucets';
import { apiClient, ApiError } from '@/src/services/api-client';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FaucetState = 'idle' | 'loading' | 'success' | 'cooldown' | 'empty' | 'error';

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface FaucetSheetProps {
  visible: boolean;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  address: string;
  onClose: () => void;
  onFaucetPress: (faucet: FaucetInfo) => void;
  onClaimed?: () => void;
}

export function FaucetSheet({ visible, slideAnim, fadeAnim, address, onClose, onFaucetPress, onClaimed }: FaucetSheetProps) {
  const { theme: dynamicTheme, isDark } = useTheme();
  const [state, setState] = useState<FaucetState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  // Check faucet status on mount
  useEffect(() => {
    if (!visible) return;
    apiClient.get<{ balance: string; enabled: boolean }>('/faucet/status')
      .then((res) => {
        if (!res.enabled) setState('empty');
      })
      .catch(() => {
        // If status endpoint fails, still show claim button
      });
  }, [visible]);

  // Reset state when sheet is hidden
  useEffect(() => {
    if (!visible && state !== 'cooldown') {
      setState('idle');
      setTxHash(null);
      setErrorMsg(null);
    }
  }, [visible, state]);

  // Cooldown countdown
  useEffect(() => {
    if (state !== 'cooldown' || cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => {
        if (prev <= 60_000) {
          clearInterval(interval);
          setState('idle');
          return 0;
        }
        return prev - 60_000;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [state, cooldownMs]);

  const handleClaim = useCallback(async () => {
    setState('loading');
    setErrorMsg(null);

    try {
      const res = await apiClient.post<{ txHash: string; amount: string }>('/faucet/claim', { address });
      setTxHash(res.txHash);
      setState('success');
      onClaimed?.();
    } catch (error) {
      if (ApiError.isApiError(error) && error.statusCode === 429) {
        const details = error.details as { remainingMs?: number } | undefined;
        setCooldownMs(details?.remainingMs ?? 24 * 60 * 60 * 1000);
        setState('cooldown');
      } else if (ApiError.isApiError(error) && error.statusCode === 503) {
        setState('empty');
      } else {
        setErrorMsg(ApiError.isApiError(error) ? error.message : 'Something went wrong');
        setState('error');
      }
    }
  }, [address, onClaimed]);

  const handleOpenTx = useCallback(() => {
    if (txHash) {
      Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`);
    }
  }, [txHash]);

  if (!visible) return null;

  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.blurOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.faucetSheet,
          { backgroundColor: dynamicTheme.colors.surface, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: dynamicTheme.colors.borderLight }]} />

        <View style={[styles.faucetSheetHeader, { borderBottomColor: dynamicTheme.colors.border }]}>
          <Text style={[styles.faucetSheetTitle, { color: dynamicTheme.colors.textPrimary }]}>Get Test Tokens</Text>
          <TouchableOpacity
            style={[styles.closeSheetButton, { backgroundColor: dynamicTheme.colors.background }]}
            onPress={onClose}
          >
            <FontAwesome name="times" size={18} color={dynamicTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.faucetList} showsVerticalScrollIndicator={false}>
          {/* Address display */}
          <View style={[styles.addressRow, { backgroundColor: dynamicTheme.colors.background }]}>
            <Text style={[styles.addressLabel, { color: dynamicTheme.colors.textSecondary }]}>Your address:</Text>
            <Text style={[styles.addressValue, { color: dynamicTheme.colors.textPrimary }]}>{truncatedAddress}</Text>
          </View>

          {/* Claim section */}
          {state !== 'empty' && (
            <View style={styles.claimSection}>
              {state === 'idle' && (
                <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
                  <FontAwesome name="gift" size={18} color="#000" />
                  <Text style={styles.claimButtonText}>Claim 0.001 ETH</Text>
                </TouchableOpacity>
              )}

              {state === 'loading' && (
                <View style={[styles.claimButton, styles.claimButtonDisabled]}>
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  <Text style={[styles.claimButtonText, { color: theme.colors.textSecondary }]}>Sending...</Text>
                </View>
              )}

              {state === 'success' && txHash && (
                <TouchableOpacity style={styles.successCard} onPress={handleOpenTx}>
                  <FontAwesome name="check-circle" size={20} color={theme.colors.success} />
                  <View style={styles.successInfo}>
                    <Text style={styles.successTitle}>Claimed 0.001 ETH!</Text>
                    <Text style={styles.successTx}>
                      TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </Text>
                  </View>
                  <FontAwesome name="external-link" size={12} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}

              {state === 'cooldown' && (
                <View style={styles.cooldownCard}>
                  <FontAwesome name="clock-o" size={20} color={theme.colors.textSecondary} />
                  <View style={styles.cooldownInfo}>
                    <Text style={[styles.cooldownLabel, { color: dynamicTheme.colors.textSecondary }]}>Next claim in</Text>
                    <Text style={[styles.cooldownTime, { color: dynamicTheme.colors.textPrimary }]}>{formatTimeRemaining(cooldownMs)}</Text>
                  </View>
                </View>
              )}

              {state === 'error' && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{errorMsg || 'Something went wrong'}</Text>
                  <TouchableOpacity onPress={handleClaim}>
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: dynamicTheme.colors.border }]} />
            <Text style={[styles.dividerText, { color: dynamicTheme.colors.textTertiary }]}>
              {state === 'empty' ? 'Get from external faucets' : 'or external faucets'}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: dynamicTheme.colors.border }]} />
          </View>

          {/* External faucet links */}
          {FAUCETS.map((faucet) => (
            <TouchableOpacity
              key={faucet.networkId}
              style={styles.faucetItem}
              onPress={() => onFaucetPress(faucet)}
            >
              <View style={styles.faucetItemIcon}>
                <FontAwesome name="tint" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.faucetItemInfo}>
                <Text style={styles.faucetItemName}>{faucet.name}</Text>
                <Text style={styles.faucetItemDesc}>{faucet.description}</Text>
              </View>
              <FontAwesome name="external-link" size={14} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  faucetSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  faucetSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  faucetSheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
    marginLeft: 36,
  },
  closeSheetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faucetList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  // Address row
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  addressLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  addressValue: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  // Claim section
  claimSection: {
    marginBottom: theme.spacing.md,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    gap: theme.spacing.sm,
  },
  claimButtonDisabled: {
    backgroundColor: theme.colors.background,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  // Success card
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
    gap: theme.spacing.md,
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...theme.typography.body,
    color: theme.colors.success,
    fontWeight: '600',
    marginBottom: 2,
  },
  successTx: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontFamily: 'monospace',
  },
  // Cooldown card
  cooldownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cooldownInfo: {
    flex: 1,
  },
  cooldownLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cooldownTime: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  // Error card
  errorCard: {
    backgroundColor: '#EF444415',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  errorText: {
    ...theme.typography.caption,
    color: '#EF4444',
    marginBottom: theme.spacing.sm,
  },
  retryText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Faucet items
  faucetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  faucetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faucetItemInfo: {
    flex: 1,
  },
  faucetItemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  faucetItemDesc: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
});
