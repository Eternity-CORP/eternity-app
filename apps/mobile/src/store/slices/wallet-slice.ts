/**
 * Wallet Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { generateWallet, saveWallet, importWallet, loadWallet, type WalletData } from '@/src/services/wallet-service';

interface WalletState {
  address: string | null;
  mnemonic: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  isInitialized: boolean;
}

const initialState: WalletState = {
  address: null,
  mnemonic: null,
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

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWallet: (state, action: PayloadAction<WalletData>) => {
      state.address = action.payload.address;
      state.mnemonic = action.payload.mnemonic;
      state.status = 'succeeded';
      state.isInitialized = true;
    },
    clearWallet: (state) => {
      state.address = null;
      state.mnemonic = null;
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
          state.address = action.payload.address;
          state.mnemonic = action.payload.mnemonic;
          state.status = 'succeeded';
          state.isInitialized = true;
        } else {
          state.status = 'idle';
          state.isInitialized = false;
        }
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
        state.address = action.payload.address;
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
        state.address = action.payload.address;
        state.mnemonic = action.payload.mnemonic;
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
        state.address = action.payload.address;
        state.mnemonic = action.payload.mnemonic;
        state.status = 'succeeded';
        state.isInitialized = true;
      })
      .addCase(importWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to import wallet';
      });
  },
});

export const { setWallet, clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
