/**
 * Swap Slice
 * Redux state management for token swaps
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  SwapToken,
  SwapQuote,
  getSwapQuote,
  getPopularTokens,
  getNativeToken,
  SwapParams,
} from '@/src/services/swap-service';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';

export type SwapStatus = 'idle' | 'loading' | 'quoting' | 'approving' | 'swapping' | 'succeeded' | 'failed';

interface SwapState {
  // Selected network and tokens
  fromNetworkId: NetworkId;
  toNetworkId: NetworkId;
  fromToken: SwapToken | null;
  toToken: SwapToken | null;

  // Input amounts
  fromAmount: string;
  toAmount: string;

  // Quote
  quote: SwapQuote | null;
  quoteError: string | null;

  // Available tokens
  availableFromTokens: SwapToken[];
  availableToTokens: SwapToken[];
  tokensLoading: boolean;

  // Settings
  slippage: number; // Percentage (0.5 = 0.5%)

  // Transaction state
  status: SwapStatus;
  error: string | null;
  txHash: string | null;

  // Approval state
  needsApproval: boolean;
  approvalTxHash: string | null;
}

const initialState: SwapState = {
  fromNetworkId: 'base',
  toNetworkId: 'base',
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
  quote: null,
  quoteError: null,
  availableFromTokens: [],
  availableToTokens: [],
  tokensLoading: false,
  slippage: 0.5,
  status: 'idle',
  error: null,
  txHash: null,
  needsApproval: false,
  approvalTxHash: null,
};

// Thunks
export const fetchTokensThunk = createAsyncThunk(
  'swap/fetchTokens',
  async ({ networkId, side }: { networkId: NetworkId; side: 'from' | 'to' }) => {
    const network = SUPPORTED_NETWORKS[networkId];
    const tokens = await getPopularTokens(network.chainId);

    // Add native token at the beginning
    const nativeToken = getNativeToken(networkId);
    const allTokens = [nativeToken, ...tokens.filter((t) => t.address !== nativeToken.address)];

    return { tokens: allTokens, side };
  }
);

export const fetchQuoteThunk = createAsyncThunk(
  'swap/fetchQuote',
  async (params: SwapParams, { rejectWithValue }) => {
    try {
      const quote = await getSwapQuote(params);
      return quote;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get quote');
    }
  }
);

const swapSlice = createSlice({
  name: 'swap',
  initialState,
  reducers: {
    setFromNetwork: (state, action: PayloadAction<NetworkId>) => {
      state.fromNetworkId = action.payload;
      state.fromToken = null;
      state.quote = null;
      state.quoteError = null;
    },

    setToNetwork: (state, action: PayloadAction<NetworkId>) => {
      state.toNetworkId = action.payload;
      state.toToken = null;
      state.quote = null;
      state.quoteError = null;
    },

    setFromToken: (state, action: PayloadAction<SwapToken | null>) => {
      state.fromToken = action.payload;
      state.quote = null;
      state.quoteError = null;
    },

    setToToken: (state, action: PayloadAction<SwapToken | null>) => {
      state.toToken = action.payload;
      state.quote = null;
      state.quoteError = null;
    },

    setFromAmount: (state, action: PayloadAction<string>) => {
      state.fromAmount = action.payload;
      state.quote = null;
      state.quoteError = null;
    },

    setToAmount: (state, action: PayloadAction<string>) => {
      state.toAmount = action.payload;
    },

    setSlippage: (state, action: PayloadAction<number>) => {
      state.slippage = action.payload;
      state.quote = null;
    },

    swapTokens: (state) => {
      // Swap from/to tokens and networks
      const tempNetwork = state.fromNetworkId;
      const tempToken = state.fromToken;
      const tempAmount = state.fromAmount;

      state.fromNetworkId = state.toNetworkId;
      state.toNetworkId = tempNetwork;
      state.fromToken = state.toToken;
      state.toToken = tempToken;
      state.fromAmount = state.toAmount;
      state.toAmount = tempAmount;

      // Swap available tokens
      const tempTokens = state.availableFromTokens;
      state.availableFromTokens = state.availableToTokens;
      state.availableToTokens = tempTokens;

      state.quote = null;
      state.quoteError = null;
    },

    setNeedsApproval: (state, action: PayloadAction<boolean>) => {
      state.needsApproval = action.payload;
    },

    setApprovalTxHash: (state, action: PayloadAction<string | null>) => {
      state.approvalTxHash = action.payload;
    },

    setSwapStatus: (state, action: PayloadAction<SwapStatus>) => {
      state.status = action.payload;
    },

    setSwapTxHash: (state, action: PayloadAction<string | null>) => {
      state.txHash = action.payload;
    },

    setSwapError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'failed';
      }
    },

    resetSwap: (state) => {
      state.fromAmount = '';
      state.toAmount = '';
      state.quote = null;
      state.quoteError = null;
      state.status = 'idle';
      state.error = null;
      state.txHash = null;
      state.needsApproval = false;
      state.approvalTxHash = null;
    },

    resetSwapState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch tokens
      .addCase(fetchTokensThunk.pending, (state) => {
        state.tokensLoading = true;
      })
      .addCase(fetchTokensThunk.fulfilled, (state, action) => {
        state.tokensLoading = false;
        if (action.payload.side === 'from') {
          state.availableFromTokens = action.payload.tokens;
          // Auto-select native token if none selected
          if (!state.fromToken && action.payload.tokens.length > 0) {
            state.fromToken = action.payload.tokens[0];
          }
        } else {
          state.availableToTokens = action.payload.tokens;
        }
      })
      .addCase(fetchTokensThunk.rejected, (state) => {
        state.tokensLoading = false;
      })

      // Fetch quote
      .addCase(fetchQuoteThunk.pending, (state) => {
        state.status = 'quoting';
        state.quoteError = null;
      })
      .addCase(fetchQuoteThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.quote = action.payload;
        state.toAmount = action.payload.toAmount;
        state.quoteError = null;
      })
      .addCase(fetchQuoteThunk.rejected, (state, action) => {
        state.status = 'idle';
        state.quote = null;
        state.quoteError = action.payload as string;
      });
  },
});

export const {
  setFromNetwork,
  setToNetwork,
  setFromToken,
  setToToken,
  setFromAmount,
  setToAmount,
  setSlippage,
  swapTokens,
  setNeedsApproval,
  setApprovalTxHash,
  setSwapStatus,
  setSwapTxHash,
  setSwapError,
  resetSwap,
  resetSwapState,
} = swapSlice.actions;

export default swapSlice.reducer;
