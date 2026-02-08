/**
 * Send Redux Slice
 * Manages send transaction flow state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ethers, isAddress } from 'ethers';
import { NATIVE_TOKEN_ADDRESS } from '@e-y/shared';
import { sendTransaction, estimateGas, validateAddress, type GasEstimate } from '@/src/services/send-service';
import { switchAccount } from './wallet-slice';
import { SUPPORTED_NETWORKS, getRpcUrl, type NetworkId } from '@/src/constants/networks';
import { getAddressPreferencesWithRetry } from '@/src/services/preferences-service';
import { lookupUsername } from '@/src/services/username-service';
import {
  getBridgeQuoteWithTx,
  executeBridgeWithRetry,
  waitForBridgeCompletion,
  checkBridgeAllowance,
  approveBridgeToken,
  NETWORK_TO_CHAIN_ID,
  type BridgeQuoteParams,
  type BridgeError,
} from '@/src/services/bridge-service';
import {
  startBridge,
  updateStep,
  setProgress,
  setApproveTxHash,
  addBridgeTxHash,
  setFinalTxHash,
  bridgeSuccess,
  bridgeError,
  type BridgeStep,
} from './bridge-slice';
import type { TransferRoute } from '@/src/services/routing-service';
import type { HDNodeWallet } from 'ethers';

/**
 * Create bridge progress steps based on route type
 */
function createBridgeSteps(route: TransferRoute, needsApproval: boolean): BridgeStep[] {
  const steps: BridgeStep[] = [];

  if (needsApproval) {
    steps.push({ id: 'approve', label: 'Approving token...', status: 'pending' });
  }

  if (route.type === 'bridge') {
    steps.push({ id: 'bridge', label: `Bridging to ${route.toNetwork}...`, status: 'pending' });
    steps.push({ id: 'wait', label: 'Waiting for confirmation...', status: 'pending' });
  } else if (route.type === 'consolidation' && route.sources) {
    route.sources.forEach((source, i) => {
      if (source.bridgeQuote) {
        steps.push({ id: `bridge-${i}`, label: `Bridging from ${source.network}...`, status: 'pending' });
      }
    });
    steps.push({ id: 'wait', label: 'Waiting for confirmations...', status: 'pending' });
  }

  steps.push({ id: 'send', label: 'Sending to recipient...', status: 'pending' });

  return steps;
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
  gasEstimateError: string | null;

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
  gasEstimateError: null,
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
      const result = await lookupUsername(recipient);
      if (!result) {
        throw new Error('Username not found');
      }
      address = result.address;
    } else if (!isAddress(recipient)) {
      throw new Error('Invalid address');
    }

    // Fetch preferences with retry
    const preferences = await getAddressPreferencesWithRetry(address);
    return preferences;
  }
);

/**
 * Smart send params interface
 */
interface SmartSendParams {
  wallet: HDNodeWallet;
  route: TransferRoute | null;
  recipient: string;
  amount: string;
  token: string;
}

/**
 * Execute smart send - routes to correct flow based on route type
 */
export const executeSmartSendThunk = createAsyncThunk(
  'send/executeSmartSend',
  async (params: SmartSendParams, { dispatch }) => {
    const { wallet, route, recipient, amount, token } = params;

    // No route or direct send - use existing flow
    if (!route || route.type === 'direct') {
      return dispatch(sendTransactionThunk({
        wallet,
        to: recipient,
        amount,
        token,
      })).unwrap();
    }

    // Bridge - use bridge flow
    if (route.type === 'bridge') {
      return dispatch(executeBridgeSendThunk({
        wallet,
        route,
        recipient,
        amount,
        token,
      })).unwrap();
    }

    // Consolidation - use consolidation flow
    if (route.type === 'consolidation') {
      return dispatch(executeConsolidationSendThunk({
        wallet,
        route,
        recipient,
        amount,
        token,
      })).unwrap();
    }

    throw new Error('Unknown route type');
  }
);

/**
 * Bridge send params interface
 */
interface BridgeSendParams {
  wallet: HDNodeWallet;
  route: TransferRoute;
  recipient: string;
  amount: string;
  token: string;
}

/**
 * Execute bridge send - single bridge flow with approval
 */
export const executeBridgeSendThunk = createAsyncThunk(
  'send/executeBridgeSend',
  async (params: BridgeSendParams, { dispatch }) => {
    const { wallet, route, recipient, token } = params;

    if (!route.bridgeQuote) {
      throw new Error('Bridge quote not available');
    }

    const rpcUrl = getRpcUrl(route.fromNetwork);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = wallet.connect(provider);

    // Check if approval needed (for ERC-20 tokens, not native ETH)
    const isNativeToken = token === 'ETH' ||
      token === NATIVE_TOKEN_ADDRESS ||
      token.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    let needsApproval = false;
    if (!isNativeToken) {
      const allowance = await checkBridgeAllowance(token, wallet.address, provider);
      const amountBigInt = BigInt(route.bridgeQuote.fromAmount);
      needsApproval = allowance < amountBigInt;
    }

    // Initialize bridge state
    const steps = createBridgeSteps(route, needsApproval);
    dispatch(startBridge({
      steps,
      estimatedTime: route.bridgeQuote.estimatedTime,
    }));

    let stepIndex = 0;

    try {
      // Step 1: Approve if needed
      if (needsApproval) {
        dispatch(updateStep({ index: stepIndex, status: 'active' }));
        dispatch(setProgress(10));

        const approveTx = await approveBridgeToken(token, signer);
        dispatch(setApproveTxHash(approveTx.hash));
        await approveTx.wait();

        dispatch(updateStep({ index: stepIndex, status: 'done' }));
        stepIndex++;
      }

      // Step 2: Execute bridge
      dispatch(updateStep({ index: stepIndex, status: 'active' }));
      dispatch(setProgress(30));

      const bridgeParams: BridgeQuoteParams = {
        fromNetwork: route.fromNetwork,
        toNetwork: route.toNetwork,
        fromToken: token,
        toToken: token,
        amount: route.bridgeQuote.fromAmount,
        fromAddress: wallet.address,
        toAddress: recipient,
      };

      const bridgeResult = await executeBridgeWithRetry(bridgeParams, signer);
      dispatch(addBridgeTxHash(bridgeResult.txHash));
      dispatch(updateStep({ index: stepIndex, status: 'done' }));
      stepIndex++;

      // Step 3: Wait for bridge completion
      dispatch(updateStep({ index: stepIndex, status: 'active' }));
      dispatch(setProgress(50));

      const fromChainId = NETWORK_TO_CHAIN_ID[route.fromNetwork];
      const toChainId = NETWORK_TO_CHAIN_ID[route.toNetwork];

      const completion = await waitForBridgeCompletion(
        bridgeResult.txHash,
        fromChainId,
        toChainId
      );

      if (completion.status === 'FAILED') {
        const error = new Error(completion.message || 'Bridge failed') as BridgeError;
        error.code = 'BRIDGE_TX_FAILED';
        error.canRetry = true;
        error.canSendAlternative = true;
        throw error;
      }

      dispatch(updateStep({ index: stepIndex, status: 'done' }));
      dispatch(setProgress(100));
      stepIndex++;

      // Bridge sends directly to recipient, so we're done
      dispatch(setFinalTxHash(completion.receivingTxHash || bridgeResult.txHash));
      dispatch(bridgeSuccess());

      return {
        success: true,
        txHash: completion.receivingTxHash || bridgeResult.txHash,
      };

    } catch (error) {
      const bridgeErr = error as BridgeError;
      dispatch(bridgeError({
        message: bridgeErr.message || 'Bridge failed',
        code: bridgeErr.code || 'UNKNOWN',
        canRetry: bridgeErr.canRetry ?? false,
        canSendAlternative: bridgeErr.canSendAlternative ?? true,
      }));
      throw error;
    }
  }
);

/**
 * Execute consolidation send - parallel bridges from multiple networks
 */
export const executeConsolidationSendThunk = createAsyncThunk(
  'send/executeConsolidationSend',
  async (params: BridgeSendParams, { dispatch, getState }) => {
    const { wallet, route, recipient, token } = params;

    if (!route.sources || route.sources.length === 0) {
      throw new Error('No sources for consolidation');
    }

    // For MVP: execute bridges sequentially to simplify
    // Can optimize to parallel later
    const steps = createBridgeSteps(route, false);
    const totalEstimatedTime = route.sources.reduce(
      (sum, s) => sum + (s.bridgeQuote?.estimatedTime || 0),
      0
    );

    dispatch(startBridge({
      steps,
      estimatedTime: totalEstimatedTime,
    }));

    let stepIndex = 0;
    const bridgeTxHashes: string[] = [];

    try {
      // Execute each bridge
      for (const source of route.sources) {
        if (!source.bridgeQuote) continue;

        dispatch(updateStep({ index: stepIndex, status: 'active' }));
        const progressPerBridge = 60 / route.sources.length;
        dispatch(setProgress(10 + stepIndex * progressPerBridge));

        const rpcUrl = getRpcUrl(source.network);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = wallet.connect(provider);

        const bridgeParams: BridgeQuoteParams = {
          fromNetwork: source.network,
          toNetwork: route.toNetwork,
          fromToken: token,
          toToken: token,
          amount: source.bridgeQuote.fromAmount,
          fromAddress: wallet.address,
          toAddress: recipient,
        };

        const bridgeResult = await executeBridgeWithRetry(bridgeParams, signer);
        bridgeTxHashes.push(bridgeResult.txHash);
        dispatch(addBridgeTxHash(bridgeResult.txHash));
        dispatch(updateStep({ index: stepIndex, status: 'done' }));
        stepIndex++;
      }

      // Wait for all bridges
      dispatch(updateStep({ index: stepIndex, status: 'active' }));
      dispatch(setProgress(70));

      // Wait for last bridge (simplified - in production would wait for all)
      const lastSource = route.sources[route.sources.length - 1];
      const lastTxHash = bridgeTxHashes[bridgeTxHashes.length - 1];

      if (lastTxHash && lastSource) {
        await waitForBridgeCompletion(
          lastTxHash,
          NETWORK_TO_CHAIN_ID[lastSource.network],
          NETWORK_TO_CHAIN_ID[route.toNetwork]
        );
      }

      dispatch(updateStep({ index: stepIndex, status: 'done' }));
      dispatch(setProgress(100));
      dispatch(setFinalTxHash(lastTxHash || ''));
      dispatch(bridgeSuccess());

      return { success: true, txHash: lastTxHash };

    } catch (error) {
      const bridgeErr = error as BridgeError;
      dispatch(bridgeError({
        message: bridgeErr.message || 'Consolidation failed',
        code: bridgeErr.code || 'UNKNOWN',
        canRetry: bridgeErr.canRetry ?? false,
        canSendAlternative: bridgeErr.canSendAlternative ?? true,
      }));
      throw error;
    }
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
        state.gasEstimateError = null;
      })
      .addCase(estimateGasThunk.fulfilled, (state, action) => {
        state.gasEstimateStatus = 'succeeded';
        state.gasEstimate = action.payload;
        state.gasEstimateError = null;
      })
      .addCase(estimateGasThunk.rejected, (state, action) => {
        state.gasEstimateStatus = 'failed';
        state.gasEstimateError = action.error.message || 'Failed to estimate gas';
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
      })

      // Reset send state when account switches
      .addCase(switchAccount, () => initialState);
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
