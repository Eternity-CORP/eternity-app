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
import { createLogger } from '@/src/utils/logger';

const log = createLogger('AutoScheduledPayments');

const CHECK_INTERVAL = 60000; // Check every 60 seconds

export function useAutoScheduledPayments() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executePayment = useCallback(async (payment: ScheduledPayment): Promise<boolean> => {
    try {
      const walletData = await loadWallet();
      if (!walletData?.mnemonic) {
        log.error('Cannot execute scheduled payment: wallet not found');
        return false;
      }

      const accountIndex = currentAccount?.accountIndex ?? 0;
      const signerWallet = getWalletFromMnemonic(walletData.mnemonic, accountIndex);

      const txHash = await sendTransaction({
        wallet: signerWallet,
        to: payment.recipient,
        amount: payment.amount,
        token: payment.tokenSymbol,
      });

      await dispatch(markPaymentExecutedThunk({
        id: payment.id,
        txHash,
        walletAddress: currentAccount?.address || '',
      })).unwrap();

      log.info('Scheduled payment executed', { id: payment.id, txHash });
      return true;
    } catch (error) {
      log.error('Failed to execute scheduled payment', { id: payment.id, error });
      return false;
    }
  }, [currentAccount?.accountIndex, currentAccount?.address, dispatch]);

  const processOverduePayments = useCallback(async () => {
    if (!currentAccount?.address || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      const overduePayments = await getOverduePayments(currentAccount.address);

      if (overduePayments.length === 0) {
        return;
      }

      log.info('Processing overdue payments', { count: overduePayments.length });

      for (const payment of overduePayments) {
        await executePayment(payment);
      }

      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
    } catch (error) {
      log.error('Error processing overdue payments', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [currentAccount?.address, executePayment, dispatch]);

  useEffect(() => {
    processOverduePayments();

    intervalRef.current = setInterval(processOverduePayments, CHECK_INTERVAL);

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
