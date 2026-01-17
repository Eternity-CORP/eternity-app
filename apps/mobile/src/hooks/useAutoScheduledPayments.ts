/**
 * Hook for automatically executing overdue scheduled payments
 * Runs when the app is opened and periodically while active
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { markPaymentExecutedThunk, loadScheduledPaymentsThunk } from '@/src/store/slices/scheduled-slice';
import { getOverduePayments, type ScheduledPayment } from '@/src/services/scheduled-payment-service';
import { loadWallet, getWalletFromMnemonic } from '@/src/services/wallet-service';
import { sendTransaction } from '@/src/services/send-service';

const CHECK_INTERVAL = 60000; // Check every 60 seconds

export function useAutoScheduledPayments() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executePayment = useCallback(async (payment: ScheduledPayment): Promise<boolean> => {
    try {
      // Load wallet to get mnemonic for signing
      const walletData = await loadWallet();
      if (!walletData?.mnemonic) {
        console.error('Cannot execute scheduled payment: wallet not found');
        return false;
      }

      // Get account index for current account
      const accountIndex = currentAccount?.accountIndex ?? 0;
      const signerWallet = getWalletFromMnemonic(walletData.mnemonic, accountIndex);

      // Execute the transaction
      const txHash = await sendTransaction({
        wallet: signerWallet,
        to: payment.recipient,
        amount: payment.amount,
        token: payment.tokenSymbol,
      });

      // Mark payment as executed
      await dispatch(markPaymentExecutedThunk({
        id: payment.id,
        txHash,
      })).unwrap();

      console.log(`Scheduled payment ${payment.id} executed successfully. TxHash: ${txHash}`);
      return true;
    } catch (error) {
      console.error(`Failed to execute scheduled payment ${payment.id}:`, error);
      return false;
    }
  }, [currentAccount?.accountIndex, dispatch]);

  const processOverduePayments = useCallback(async () => {
    if (!currentAccount?.address || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Get overdue payments
      const overduePayments = await getOverduePayments(currentAccount.address);

      if (overduePayments.length === 0) {
        return;
      }

      console.log(`Found ${overduePayments.length} overdue scheduled payments`);

      // Execute each payment
      for (const payment of overduePayments) {
        await executePayment(payment);
      }

      // Reload payments list to update UI
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
    } catch (error) {
      console.error('Error processing overdue payments:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentAccount?.address, executePayment, dispatch]);

  // Process on mount and when app comes to foreground
  useEffect(() => {
    // Initial check
    processOverduePayments();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(processOverduePayments, CHECK_INTERVAL);

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        processOverduePayments();
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [processOverduePayments]);
}
