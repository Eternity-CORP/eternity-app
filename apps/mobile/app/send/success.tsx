/**
 * Send Screen 5: Transaction Status
 * Shows transaction status (pending/confirmed/failed) and auto-redirects to home
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { resetSend } from '@/src/store/slices/send-slice';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { markPaidThunk } from '@/src/store/slices/split-slice';
import { markPaymentExecutedThunk } from '@/src/store/slices/scheduled-slice';
import { getProvider } from '@/src/services/balance-service';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function SuccessScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const send = useAppSelector((state) => state.send);
  const currentAccount = getCurrentAccount(wallet);
  const [txStatus, setTxStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check transaction status
  useEffect(() => {
    if (!send.txHash || !currentAccount?.address) return;

    const checkStatus = async () => {
      try {
        const provider = getProvider();
        const receipt = await provider.getTransactionReceipt(send.txHash!);

        if (receipt) {
          const status = receipt.status === 1 ? 'confirmed' : 'failed';
          setTxStatus(status);
          setCheckingStatus(false);

          // If this was a split bill payment and transaction confirmed, mark as paid
          if (status === 'confirmed' && send.splitBillId && send.splitParticipantAddress) {
            dispatch(markPaidThunk({
              splitId: send.splitBillId,
              participantAddress: send.splitParticipantAddress,
              txHash: send.txHash!,
            }));
          }

          // If this was a scheduled payment and transaction confirmed, mark as executed
          if (status === 'confirmed' && send.scheduledPaymentId) {
            dispatch(markPaymentExecutedThunk({
              id: send.scheduledPaymentId,
              txHash: send.txHash!,
              walletAddress: currentAccount?.address || '',
            }));
          }

          // User will manually press Done button to navigate away
        } else {
          // Transaction still pending
          setTxStatus('pending');
          setCheckingStatus(false);

          // Check again after 2 seconds
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
        setCheckingStatus(false);
        // If error, assume pending
        setTxStatus('pending');
      }
    };

    checkStatus();
  }, [send.txHash, send.splitBillId, send.splitParticipantAddress, send.scheduledPaymentId, currentAccount?.address, dispatch]);

  const handleDone = () => {
    dispatch(resetSend());
    router.replace('/(tabs)/home');
  };

  const getStatusConfig = () => {
    switch (txStatus) {
      case 'confirmed':
        return {
          icon: 'check-circle',
          color: dynamicTheme.colors.success,
          text: 'Transaction Successful',
          subtext: 'Your transaction has been confirmed',
        };
      case 'failed':
        return {
          icon: 'times-circle',
          color: dynamicTheme.colors.error,
          text: 'Transaction Failed',
          subtext: 'Your transaction could not be completed',
        };
      default:
        return {
          icon: 'clock-o',
          color: dynamicTheme.colors.warning,
          text: 'Transaction Pending',
          subtext: 'Waiting for confirmation...',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.statusIcon}>
          <View style={[styles.statusCircle, { backgroundColor: statusConfig.color + '20' }]}>
            <FontAwesome name={statusConfig.icon as any} size={48} color={statusConfig.color} />
          </View>
        </View>

        <Text style={[styles.statusText, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          {statusConfig.text}
        </Text>

        <Text style={[styles.statusSubtext, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
          {statusConfig.subtext}
        </Text>

        {send.txHash && (
          <View style={[styles.txHashContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
            <Text style={[styles.txHashLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Transaction Hash
            </Text>
            <Text style={[styles.txHash, theme.typography.caption, { color: dynamicTheme.colors.textPrimary }]}>
              {send.txHash.slice(0, 10)}...{send.txHash.slice(-8)}
            </Text>
          </View>
        )}

        {txStatus === 'pending' && checkingStatus && (
          <Text style={[styles.checkingText, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
            Checking status...
          </Text>
        )}

        <TouchableOpacity style={[styles.doneButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]} onPress={handleDone}>
          <Text style={[styles.doneButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  statusIcon: {
    marginBottom: theme.spacing.xl,
  },
  statusCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  statusSubtext: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  txHashContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    minWidth: 200,
  },
  txHashLabel: {
    marginBottom: theme.spacing.xs,
  },
  txHash: {
    fontFamily: 'monospace',
  },
  checkingText: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
