/**
 * Send Redux Slice
 * Manages send transaction flow state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { sendTransaction, estimateGas, validateAddress, type GasEstimate } from '@/src/services/send-service';
import type { HDNodeWallet } from 'ethers';

export interface SendState {
  // Flow state
  step: 'token' | 'recipient' | 'amount' | 'confirm' | 'success';
  
  // Transaction data
  selectedToken: string; // 'ETH' or token address
  recipient: string;
  amount: string;
  
  // Gas estimation
  gasEstimate: GasEstimate | null;
  gasEstimateStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  
  // Transaction sending
  txHash: string | null;
  sendStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  sendError: string | null;
}

const initialState: SendState = {
  step: 'token',
  selectedToken: 'ETH',
  recipient: '',
  amount: '',
  gasEstimate: null,
  gasEstimateStatus: 'idle',
  txHash: null,
  sendStatus: 'idle',
  sendError: null,
};

/**
 * Estimate gas for transaction
 */
export const estimateGasThunk = createAsyncThunk(
  'send/estimateGas',
  async ({ from, to, amount, token }: { from: string; to: string; amount: string; token: string }) => {
    return await estimateGas(from, to, amount, token);
  }
);

/**
 * Send transaction
 */
export const sendTransactionThunk = createAsyncThunk(
  'send/transaction',
  async ({ wallet, to, amount, token }: { wallet: HDNodeWallet; to: string; amount: string; token: string }) => {
    const txHash = await sendTransaction({ wallet, to, amount, token });
    return txHash;
  }
);

const sendSlice = createSlice({
  name: 'send',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<SendState['step']>) => {
      state.step = action.payload;
    },
    setSelectedToken: (state, action: PayloadAction<string>) => {
      state.selectedToken = action.payload;
    },
    setRecipient: (state, action: PayloadAction<string>) => {
      state.recipient = action.payload;
      // Clear gas estimate when recipient changes
      state.gasEstimate = null;
      state.gasEstimateStatus = 'idle';
    },
    setAmount: (state, action: PayloadAction<string>) => {
      state.amount = action.payload;
      // Clear gas estimate when amount changes
      state.gasEstimate = null;
      state.gasEstimateStatus = 'idle';
    },
    resetSend: (state) => {
      return initialState;
    },
    validateRecipient: (state) => {
      if (!state.recipient) {
        state.sendError = 'Recipient address is required';
        return;
      }
      if (!validateAddress(state.recipient)) {
        state.sendError = 'Invalid address format';
        return;
      }
      state.sendError = null;
    },
  },
  extraReducers: (builder) => {
    // Gas estimation
    builder
      .addCase(estimateGasThunk.pending, (state) => {
        state.gasEstimateStatus = 'loading';
      })
      .addCase(estimateGasThunk.fulfilled, (state, action) => {
        state.gasEstimateStatus = 'succeeded';
        state.gasEstimate = action.payload;
      })
      .addCase(estimateGasThunk.rejected, (state) => {
        state.gasEstimateStatus = 'failed';
      });
    
    // Send transaction
    builder
      .addCase(sendTransactionThunk.pending, (state) => {
        state.sendStatus = 'loading';
        state.sendError = null;
      })
      .addCase(sendTransactionThunk.fulfilled, (state, action) => {
        state.sendStatus = 'succeeded';
        state.txHash = action.payload;
        state.step = 'success';
      })
      .addCase(sendTransactionThunk.rejected, (state, action) => {
        state.sendStatus = 'failed';
        state.sendError = action.error.message || 'Failed to send transaction';
      });
  },
});

export const {
  setStep,
  setSelectedToken,
  setRecipient,
  setAmount,
  resetSend,
  validateRecipient,
} = sendSlice.actions;

export default sendSlice.reducer;
