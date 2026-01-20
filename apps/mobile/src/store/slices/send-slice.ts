/**
 * Send Redux Slice
 * Manages send transaction flow state with multi-network routing
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { sendTransaction, estimateGas, validateAddress, type GasEstimate } from '@/src/services/send-service';
import type { HDNodeWallet } from 'ethers';
import type { NetworkId } from '@/src/constants/networks';

/**
 * Transfer route types (mirrored from routing-service for loose coupling)
 */
export type RouteType = 'direct' | 'bridge' | 'consolidate' | 'insufficient';

export type RouteWarning =
  | 'expensive_bridge'
  | 'slow_bridge'
  | 'consolidation_needed'
  | 'preference_mismatch';

export interface TransferStep {
  type: 'send' | 'bridge';
  sourceNetwork: NetworkId;
  targetNetwork: NetworkId;
  amount: string;
  estimatedGasFee: number;
  estimatedBridgeFee: number;
  estimatedTime: number;
}

export interface TransferRoute {
  type: RouteType;
  steps: TransferStep[];
  amount: string;
  symbol: string;
  totalGasFee: number;
  totalBridgeFee: number;
  totalFee: number;
  recipientPreference: NetworkId | null;
  finalNetwork: NetworkId;
  estimatedTime: number;
  warnings: RouteWarning[];
}

export interface AlternativeRoute {
  route: TransferRoute;
  description: string;
  savings: number;
}

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

  // Network routing
  recipientPreference: NetworkId | null;
  transferRoute: TransferRoute | null;
  alternativeRoutes: AlternativeRoute[];
  selectedAlternativeIndex: number | null; // null = use primary route
  routeStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  routeError: string | null;

  // Transaction sending
  txHash: string | null;
  sendStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  sendError: string | null;

  // Split bill payment context
  splitBillId: string | null;
  splitParticipantAddress: string | null;

  // Scheduled payment context
  scheduledPaymentId: string | null;
}

const initialState: SendState = {
  step: 'token',
  selectedToken: 'ETH',
  recipient: '',
  amount: '',
  gasEstimate: null,
  gasEstimateStatus: 'idle',
  recipientPreference: null,
  transferRoute: null,
  alternativeRoutes: [],
  selectedAlternativeIndex: null,
  routeStatus: 'idle',
  routeError: null,
  txHash: null,
  sendStatus: 'idle',
  sendError: null,
  splitBillId: null,
  splitParticipantAddress: null,
  scheduledPaymentId: null,
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
 * Calculate transfer route
 * This is called when navigating to confirm screen
 */
export const calculateRouteThunk = createAsyncThunk(
  'send/calculateRoute',
  async (
    {
      symbol,
      amount,
      recipientPreference,
      amountUsdValue,
    }: {
      symbol: string;
      amount: number;
      recipientPreference: NetworkId | null;
      amountUsdValue: number;
    },
    { getState }
  ) => {
    // Import dynamically to avoid circular deps and allow lazy loading
    const { calculateOptimalRoute } = await import('@/src/services/routing-service');
    const state = getState() as { balance: { aggregatedBalances: unknown[] } };

    // Access aggregated balances from balance slice
    const aggregatedBalances = state.balance.aggregatedBalances || [];

    const result = calculateOptimalRoute(
      symbol,
      amount,
      aggregatedBalances as Parameters<typeof calculateOptimalRoute>[2],
      recipientPreference,
      amountUsdValue
    );

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to calculate route');
    }

    return {
      primaryRoute: result.primaryRoute,
      alternatives: result.alternatives,
      recipientPreference,
    };
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
    setRecipientPreference: (state, action: PayloadAction<NetworkId | null>) => {
      state.recipientPreference = action.payload;
      // Clear route when preference changes
      state.transferRoute = null;
      state.alternativeRoutes = [];
      state.routeStatus = 'idle';
    },
    selectAlternativeRoute: (state, action: PayloadAction<number | null>) => {
      state.selectedAlternativeIndex = action.payload;
    },
    clearRoute: (state) => {
      state.transferRoute = null;
      state.alternativeRoutes = [];
      state.selectedAlternativeIndex = null;
      state.routeStatus = 'idle';
      state.routeError = null;
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

    // Calculate route
    builder
      .addCase(calculateRouteThunk.pending, (state) => {
        state.routeStatus = 'loading';
        state.routeError = null;
      })
      .addCase(calculateRouteThunk.fulfilled, (state, action) => {
        state.routeStatus = 'succeeded';
        state.transferRoute = action.payload.primaryRoute;
        state.alternativeRoutes = action.payload.alternatives;
        state.recipientPreference = action.payload.recipientPreference;
        state.selectedAlternativeIndex = null;
      })
      .addCase(calculateRouteThunk.rejected, (state, action) => {
        state.routeStatus = 'failed';
        state.routeError = action.error.message || 'Failed to calculate route';
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
  setRecipientPreference,
  selectAlternativeRoute,
  clearRoute,
} = sendSlice.actions;

export default sendSlice.reducer;
