/**
 * Transaction Redux Slice
 * Manages transaction history and details
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchTransactionHistory,
  fetchMultiChainHistory,
  fetchTransactionDetails,
  type Transaction,
  type TransactionDetails,
  type TransactionStatus,
} from '@/src/services/transaction-service';
import { transactionSocket, type TransactionStatusUpdate } from '@/src/services/transaction-socket';
import type { AccountType } from '@e-y/shared';

interface TransactionState {
  // Store transactions per address
  transactionsByAddress: Record<string, Transaction[]>;
  selectedTransaction: TransactionDetails | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastUpdated: number | null;
  currentAddress: string | null; // Track which address transactions are displayed for
}

const initialState: TransactionState = {
  transactionsByAddress: {},
  selectedTransaction: null,
  status: 'idle',
  error: null,
  lastUpdated: null,
  currentAddress: null,
};

/**
 * Fetch transaction history for an address.
 * Real accounts use multi-chain (all 5 networks); test/business use single-chain.
 */
export const fetchTransactionsThunk = createAsyncThunk(
  'transaction/fetchHistory',
  async ({ address, accountType }: { address: string; accountType?: AccountType }) => {
    if (accountType === 'real') {
      return await fetchMultiChainHistory(address, 20);
    }
    return await fetchTransactionHistory(address, 20);
  }
);

/**
 * Fetch detailed transaction information
 */
export const fetchTransactionDetailsThunk = createAsyncThunk(
  'transaction/fetchDetails',
  async ({ txHash, userAddress }: { txHash: string; userAddress: string }) => {
    const details = await fetchTransactionDetails(txHash, userAddress);
    return details;
  }
);

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    clearTransactions: (state) => {
      if (state.currentAddress) {
        state.transactionsByAddress[state.currentAddress] = [];
      }
      state.selectedTransaction = null;
      state.status = 'idle';
      state.error = null;
      state.lastUpdated = null;
    },
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = null;
    },
    clearTransactionsForAddress: (state, action: PayloadAction<string>) => {
      delete state.transactionsByAddress[action.payload];
      if (state.currentAddress === action.payload) {
        state.currentAddress = null;
      }
    },
    updateTransactionStatus: (
      state,
      action: PayloadAction<{ txHash: string; status: TransactionStatus; gasUsed?: string }>
    ) => {
      const { txHash, status, gasUsed } = action.payload;
      // Update in all address lists
      for (const address of Object.keys(state.transactionsByAddress)) {
        const txList = state.transactionsByAddress[address];
        const txIndex = txList.findIndex((tx) => tx.hash === txHash);
        if (txIndex !== -1) {
          txList[txIndex].status = status;
          if (gasUsed) {
            txList[txIndex].gasUsed = gasUsed;
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transaction history
      .addCase(fetchTransactionsThunk.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentAddress = action.meta.arg.address; // Store address being fetched
      })
      .addCase(fetchTransactionsThunk.fulfilled, (state, action) => {
        const address = action.meta.arg.address;
        state.transactionsByAddress[address] = action.payload;
        state.currentAddress = address;
        state.status = 'succeeded';
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(fetchTransactionsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch transactions';
      })
      // Fetch transaction details
      .addCase(fetchTransactionDetailsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTransactionDetailsThunk.fulfilled, (state, action) => {
        state.selectedTransaction = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchTransactionDetailsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch transaction details';
      });
  },
});

export const { clearTransactions, clearSelectedTransaction, clearTransactionsForAddress, updateTransactionStatus } = transactionSlice.actions;

/**
 * Subscribe to real-time updates for pending transactions
 */
export const subscribeToPendingTransactions = (
  transactions: Transaction[],
  userAddress: string,
  dispatch: (action: ReturnType<typeof updateTransactionStatus>) => void
) => {
  const pendingTxs = transactions.filter((tx) => tx.status === 'pending');

  for (const tx of pendingTxs) {
    transactionSocket.subscribe(tx.hash, userAddress, (update: TransactionStatusUpdate) => {
      if (update.status !== 'pending' && update.status !== 'timeout') {
        dispatch(updateTransactionStatus({
          txHash: update.txHash,
          status: update.status,
          gasUsed: update.gasUsed,
        }));
      }
    });
  }
};

/**
 * Cleanup WebSocket subscriptions
 */
export const unsubscribeFromAllTransactions = () => {
  transactionSocket.disconnect();
};

// Memoized selector to get transactions for current address
const EMPTY_TRANSACTIONS: Transaction[] = [];

const selectTransactionsByAddress = (state: { transaction: TransactionState }) => state.transaction.transactionsByAddress;

export const selectTransactionsForAddress = createSelector(
  [selectTransactionsByAddress, (_state: { transaction: TransactionState }, address: string | null) => address],
  (transactionsByAddress, address): Transaction[] => {
    if (!address) return EMPTY_TRANSACTIONS;
    return transactionsByAddress[address] || EMPTY_TRANSACTIONS;
  }
);
export default transactionSlice.reducer;
