/**
 * Transaction Redux Slice
 * Manages transaction history and details
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchTransactionHistory,
  fetchTransactionDetails,
  type Transaction,
  type TransactionDetails,
} from '@/src/services/transaction-service';

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
 * Fetch transaction history for an address
 */
export const fetchTransactionsThunk = createAsyncThunk(
  'transaction/fetchHistory',
  async (address: string) => {
    const transactions = await fetchTransactionHistory(address, 20);
    return transactions;
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
  },
  extraReducers: (builder) => {
    builder
      // Fetch transaction history
      .addCase(fetchTransactionsThunk.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentAddress = action.meta.arg; // Store address being fetched
      })
      .addCase(fetchTransactionsThunk.fulfilled, (state, action) => {
        const address = action.meta.arg;
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

export const { clearTransactions, clearSelectedTransaction, clearTransactionsForAddress } = transactionSlice.actions;

// Selector helper to get transactions for current address
export const selectTransactionsForAddress = (state: { transaction: TransactionState }, address: string | null): Transaction[] => {
  if (!address) return [];
  return state.transaction.transactionsByAddress[address] || [];
};
export default transactionSlice.reducer;
