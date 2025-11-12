/**
 * React Hook for Incoming Transactions
 * 
 * Usage:
 * ```typescript
 * const { transactions, newTransaction, startMonitoring, stopMonitoring } = useIncomingTransactions();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IncomingTransactionMonitor,
  getMonitor,
  type IncomingTransaction,
  type MonitorConfig,
} from '../wallet/incoming';

export interface UseIncomingTransactionsResult {
  transactions: IncomingTransaction[];
  pendingTransactions: IncomingTransaction[];
  confirmedTransactions: IncomingTransaction[];
  newTransaction: IncomingTransaction | null;
  isMonitoring: boolean;
  startMonitoring: (config: MonitorConfig) => Promise<void>;
  stopMonitoring: () => void;
  clearNewTransaction: () => void;
}

export function useIncomingTransactions(): UseIncomingTransactionsResult {
  const [transactions, setTransactions] = useState<IncomingTransaction[]>([]);
  const [newTransaction, setNewTransaction] = useState<IncomingTransaction | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitorRef = useRef<IncomingTransactionMonitor | null>(null);

  // Start monitoring
  const startMonitoring = useCallback(async (config: MonitorConfig) => {
    if (monitorRef.current) {
      console.warn('Monitor already running');
      return;
    }

    const monitor = getMonitor(config);
    monitorRef.current = monitor;

    // Load existing transactions
    setTransactions(monitor.getTransactions());

    // Listen for new transactions
    const emitter = monitor.getEmitter();
    
    emitter.on('new-transaction', (tx: IncomingTransaction) => {
      console.log('🔔 New incoming transaction:', tx);
      setNewTransaction(tx);
      setTransactions(monitor.getTransactions());
    });

    emitter.on('transaction-confirmed', (tx: IncomingTransaction) => {
      console.log('✅ Transaction confirmed:', tx);
      setTransactions(monitor.getTransactions());
    });

    emitter.on('error', (error: Error) => {
      console.error('Monitor error:', error);
    });

    // Start monitoring
    await monitor.start();
    setIsMonitoring(true);
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.stop();
      monitorRef.current = null;
      setIsMonitoring(false);
    }
  }, []);

  // Clear new transaction notification
  const clearNewTransaction = useCallback(() => {
    setNewTransaction(null);
  }, []);

  // Get pending and confirmed transactions
  const pendingTransactions = transactions.filter(tx => !tx.isStable);
  const confirmedTransactions = transactions.filter(tx => tx.isStable);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    transactions,
    pendingTransactions,
    confirmedTransactions,
    newTransaction,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearNewTransaction,
  };
}
