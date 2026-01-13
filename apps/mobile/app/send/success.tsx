/**
 * Send Screen 5: Transaction Success
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { resetSend } from '@/src/store/slices/send-slice';
import { fetchTransactionsThunk } from '@/src/store/slices/transaction-slice';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function SuccessScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const send = useAppSelector((state) => state.send);
  const currentAccount = getCurrentAccount(wallet);

  useEffect(() => {
    // Refresh transactions after successful send
    if (currentAccount?.address && send.txHash) {
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [send.txHash, currentAccount?.address, dispatch]);

  const handleDone = () => {
    dispatch(resetSend());
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.successIcon}>
          <View style={styles.successCircle}>
            <FontAwesome name="check" size={48} color={theme.colors.success} />
          </View>
        </View>

        <Text style={[styles.successText, theme.typography.heading]}>
          Send processing
        </Text>

        {send.txHash && (
          <Text style={[styles.txHash, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {send.txHash.slice(0, 10)}...{send.txHash.slice(-8)}
          </Text>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={[styles.doneButtonText, theme.typography.heading]}>Done</Text>
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
  successIcon: {
    marginBottom: theme.spacing.xl,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  txHash: {
    marginBottom: theme.spacing.xxl,
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
