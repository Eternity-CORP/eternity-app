/**
 * Send Redux Slice
 * Manages send transaction flow state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { sendTransaction, estimateGas, validateAddress, type GasEstimate } from '@/src/services/send-service';
import type { HDNodeWallet } from 'ethers';
import { isAddress } from 'ethers';
import type { NetworkId } from '@/src/constants/networks';
import { getAddressPreferencesWithRetry } from '@/src/services/preferences-service';
import { lookupUsername } from '@/src/services/username-service';

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

  // Split bill payment context
  splitBillId: string | null;
  splitParticipantAddress: string | null;

  // Scheduled payment context
  scheduledPaymentId: string | null;

  // Recipient's network preferences
  recipientPreferences: {
    defaultNetwork: NetworkId | null;
    tokenOverrides: Record<string, NetworkId>;
  } | null;
  recipientPreferencesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  recipientPreferencesError: string | null;
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
  splitBillId: null,
  splitParticipantAddress: null,
  scheduledPaymentId: null,
  recipientPreferences: null,
  recipientPreferencesStatus: 'idle',
  recipientPreferencesError: null,
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

/**
 * Fetch recipient's network preferences
 */
export const fetchRecipientPreferencesThunk = createAsyncThunk(
  'send/fetchRecipientPreferences',
  async (recipient: string) => {
    // Resolve address if username
    let address = recipient;

    if (recipient.startsWith('@')) {
      const resolved = await lookupUsername(recipient);
      if (!resolved) {
        throw new Error('Username not found');
      }
      address = resolved;
    } else if (!isAddress(recipient)) {
      throw new Error('Invalid address');
    }

    // Fetch preferences with retry
    const preferences = await getAddressPreferencesWithRetry(address);
    return preferences;
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
    setSplitBillContext: (state, action: PayloadAction<{ splitBillId: string; participantAddress: string }>) => {
      state.splitBillId = action.payload.splitBillId;
      state.splitParticipantAddress = action.payload.participantAddress;
    },
    setScheduledPaymentContext: (state, action: PayloadAction<string>) => {
      state.scheduledPaymentId = action.payload;
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
    clearRecipientPreferences: (state) => {
      state.recipientPreferences = null;
      state.recipientPreferencesStatus = 'idle';
      state.recipientPreferencesError = null;
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

    // Fetch recipient preferences
    builder
      .addCase(fetchRecipientPreferencesThunk.pending, (state) => {
        state.recipientPreferencesStatus = 'loading';
        state.recipientPreferencesError = null;
      })
      .addCase(fetchRecipientPreferencesThunk.fulfilled, (state, action) => {
        state.recipientPreferences = action.payload;
        state.recipientPreferencesStatus = 'succeeded';
        state.recipientPreferencesError = null;
      })
      .addCase(fetchRecipientPreferencesThunk.rejected, (state, action) => {
        state.recipientPreferences = null;
        state.recipientPreferencesStatus = 'failed';
        state.recipientPreferencesError = action.error.message || 'Failed to fetch preferences';
      });
  },
});

export const {
  setStep,
  setSelectedToken,
  setRecipient,
  setAmount,
  resetSend,
  setSplitBillContext,
  setScheduledPaymentContext,
  validateRecipient,
  clearRecipientPreferences,
} = sendSlice.actions;

export default sendSlice.reducer;
