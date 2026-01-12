/**
 * Wallet Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { generateWallet, saveWallet, importWallet, loadWallet, loadAccounts, createNewAccount, saveAccounts, type WalletData } from '@/src/services/wallet-service';
import { getAddressFromMnemonic } from '@e-y/crypto';

export interface Account {
  id: string; // accountIndex as string for easy comparison
  address: string;
  accountIndex: number;
  label?: string; // Optional user-defined label
}

interface WalletState {
  mnemonic: string | null;
  accounts: Account[];
  currentAccountIndex: number; // Index in accounts array
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  isInitialized: boolean;
}

// Helper to get current account
export const getCurrentAccount = (state: WalletState): Account | null => {
  if (state.accounts.length === 0 || state.currentAccountIndex < 0 || state.currentAccountIndex >= state.accounts.length) {
    return null;
  }
  return state.accounts[state.currentAccountIndex];
};

const initialState: WalletState = {
  mnemonic: null,
  accounts: [],
  currentAccountIndex: 0,
  status: 'idle',
  error: null,
  isInitialized: false,
};

/**
 * Load wallet from storage
 */
export const loadWalletThunk = createAsyncThunk(
  'wallet/load',
  async () => {
    const walletData = await loadWallet();
    return walletData;
  }
);

/**
 * Generate new wallet (does NOT save to storage)
 * @param wordCount - Number of words: 12 or 24 (default: 12)
 */
export const generateWalletThunk = createAsyncThunk(
  'wallet/generate',
  async (wordCount: 12 | 24 = 12) => {
    const walletData = await generateWallet(wordCount);
    return walletData;
  }
);

/**
 * Save wallet to storage (call after verification)
 */
export const saveWalletThunk = createAsyncThunk(
  'wallet/save',
  async (mnemonic: string) => {
    const walletData = await saveWallet(mnemonic);
    return walletData;
  }
);

/**
 * Import wallet from mnemonic phrase
 */
export const importWalletThunk = createAsyncThunk(
  'wallet/import',
  async (mnemonic: string) => {
    const walletData = await importWallet(mnemonic);
    return walletData;
  }
);

/**
 * Load accounts from storage
 */
export const loadAccountsThunk = createAsyncThunk(
  'wallet/loadAccounts',
  async () => {
    const accounts = await loadAccounts();
    return accounts;
  }
);

/**
 * Add new account
 */
export const addAccountThunk = createAsyncThunk(
  'wallet/addAccount',
  async (_, { getState }) => {
    const state = getState() as { wallet: WalletState };
    if (!state.wallet.mnemonic) {
      throw new Error('No mnemonic available. Please create or import a wallet first.');
    }
    const newAccount = await createNewAccount(state.wallet.mnemonic, state.wallet.accounts);
    return newAccount;
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWallet: (state, action: PayloadAction<WalletData>) => {
      // Legacy support: convert single wallet to account
      if (state.accounts.length === 0) {
        state.accounts.push({
          id: '0',
          address: action.payload.address,
          accountIndex: 0,
        });
        state.currentAccountIndex = 0;
      }
      state.mnemonic = action.payload.mnemonic;
      state.status = 'succeeded';
      state.isInitialized = true;
    },
    addAccount: (state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload);
      // Switch to the new account
      state.currentAccountIndex = state.accounts.length - 1;
    },
    switchAccount: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.accounts.length) {
        state.currentAccountIndex = index;
      }
    },
    updateAccountLabel: (state, action: PayloadAction<{ accountIndex: number; label: string | undefined }>) => {
      const account = state.accounts.find((acc) => acc.accountIndex === action.payload.accountIndex);
      if (account) {
        account.label = action.payload.label;
      }
    },
    clearWallet: (state) => {
      state.mnemonic = null;
      state.accounts = [];
      state.currentAccountIndex = 0;
      state.status = 'idle';
      state.isInitialized = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load wallet
      .addCase(loadWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadWalletThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.mnemonic = action.payload.mnemonic;
          // Create temporary default account (will be replaced by loadAccountsThunk)
          // This ensures UI has something to display while accounts load
          if (state.accounts.length === 0) {
            state.accounts.push({
              id: '0',
              address: action.payload.address,
              accountIndex: 0,
            });
            state.currentAccountIndex = 0;
          }
          state.status = 'succeeded';
          state.isInitialized = true;
        } else {
          state.status = 'idle';
          state.isInitialized = false;
        }
      })
      // Load accounts
      .addCase(loadAccountsThunk.fulfilled, (state, action) => {
        // Replace temporary accounts with loaded ones
        if (action.payload.length > 0) {
          state.accounts = action.payload;
          // Ensure currentAccountIndex is valid
          if (state.currentAccountIndex >= state.accounts.length) {
            state.currentAccountIndex = 0;
          }
        } else if (state.accounts.length === 0 && state.mnemonic) {
          // If no accounts stored but wallet exists, create default account
          // This handles migration from old wallet format
          state.accounts.push({
            id: '0',
            address: getAddressFromMnemonic(state.mnemonic, 0),
            accountIndex: 0,
          });
          state.currentAccountIndex = 0;
        }
      })
      // Add account
      .addCase(addAccountThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addAccountThunk.fulfilled, (state, action) => {
        state.accounts.push(action.payload);
        state.currentAccountIndex = state.accounts.length - 1;
        state.status = 'succeeded';
      })
      .addCase(addAccountThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to add account';
      })
      .addCase(loadWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load wallet';
      })
      // Generate wallet
      .addCase(generateWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(generateWalletThunk.fulfilled, (state, action) => {
        // Store mnemonic temporarily (not saved to storage yet)
        state.mnemonic = action.payload.mnemonic;
        // Create temporary account for display
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
          });
          state.currentAccountIndex = 0;
        }
        state.status = 'succeeded';
        // Don't set isInitialized = true until saved
      })
      .addCase(generateWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to generate wallet';
      })
      // Save wallet
      .addCase(saveWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveWalletThunk.fulfilled, (state, action) => {
        state.mnemonic = action.payload.mnemonic;
        // Ensure default account exists
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
          });
          state.currentAccountIndex = 0;
        } else {
          // Update first account address if it changed
          state.accounts[0].address = action.payload.address;
        }
        state.status = 'succeeded';
        state.isInitialized = true;
      })
      .addCase(saveWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to save wallet';
      })
      // Import wallet
      .addCase(importWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(importWalletThunk.fulfilled, (state, action) => {
        state.mnemonic = action.payload.mnemonic;
        // Ensure default account exists
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
          });
          state.currentAccountIndex = 0;
        } else {
          // Update first account address if it changed
          state.accounts[0].address = action.payload.address;
        }
        state.status = 'succeeded';
        state.isInitialized = true;
      })
      .addCase(importWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to import wallet';
      });
  },
});

export const { addAccount, switchAccount, updateAccountLabel, clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
