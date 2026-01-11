/**
 * Wallet Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createWallet, loadWallet, type WalletData } from '@/src/services/wallet-service';

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
 * Create new wallet
 */
export const createWalletThunk = createAsyncThunk(
  'wallet/create',
  async () => {
    const walletData = await createWallet();
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
      // Create wallet
      .addCase(createWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createWalletThunk.fulfilled, (state, action) => {
        state.address = action.payload.address;
        state.mnemonic = action.payload.mnemonic;
        state.status = 'succeeded';
        state.isInitialized = true;
      })
      .addCase(createWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create wallet';
      });
  },
});

export const { setWallet, clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
