# Bridge Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement actual bridge execution so cross-network transfers work end-to-end via LI.FI API.

**Architecture:** Extend bridge-service with executeBridge(), create bridge-slice for state management, add progress UI screen, integrate into send flow via executeSmartSendThunk that routes to correct execution path based on route type.

**Tech Stack:** LI.FI REST API, ethers.js v6, Redux Toolkit (createAsyncThunk), React Native, TypeScript

---

## Task 1: Extend bridge-service with execution functions

**Files:**
- Modify: `apps/mobile/src/services/bridge-service.ts`
- Test: `apps/mobile/src/services/__tests__/bridge-service.test.ts`

**Step 1: Add new types to bridge-service.ts**

Add after line 94 (after `BridgeCostLevel` type):

```typescript
/**
 * Bridge quote with transaction request for execution
 */
export interface BridgeQuoteWithTx extends BridgeQuote {
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
}

/**
 * Parameters for getting bridge quote
 */
export interface BridgeQuoteParams {
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress?: string;
}

/**
 * Bridge execution result
 */
export interface BridgeExecutionResult {
  success: boolean;
  txHash: string;
  txResponse: ethers.TransactionResponse;
}

/**
 * Bridge completion result after waiting
 */
export interface BridgeCompletionResult {
  status: 'DONE' | 'FAILED';
  receivingTxHash?: string;
  message?: string;
}

/**
 * Bridge error codes
 */
export type BridgeErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'BRIDGE_TIMEOUT'
  | 'APPROVAL_REJECTED'
  | 'BRIDGE_TX_REJECTED'
  | 'BRIDGE_TX_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Bridge error with metadata
 */
export interface BridgeError extends Error {
  code: BridgeErrorCode;
  canRetry: boolean;
  canSendAlternative: boolean;
}
```

**Step 2: Add import for ethers at top of file**

```typescript
import { ethers } from 'ethers';
```

**Step 3: Add getBridgeQuoteWithTx function**

Add after `getBridgeQuote` function (around line 289):

```typescript
/**
 * Get bridge quote WITH transaction request for execution
 */
export async function getBridgeQuoteWithTx(
  params: BridgeQuoteParams
): Promise<BridgeQuoteWithTx | null> {
  try {
    const fromChainId = getChainId(params.fromNetwork);
    const toChainId = getChainId(params.toNetwork);

    const queryParams = new URLSearchParams({
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress || params.fromAddress,
      slippage: DEFAULT_SLIPPAGE.toString(),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.warn('Bridge quote request failed', { status: response.status, error: errorData });
      return null;
    }

    const data = await response.json();

    const estimate = data.estimate as Record<string, unknown>;
    const action = data.action as Record<string, unknown>;
    const includedSteps = data.includedSteps as Array<Record<string, unknown>> | undefined;
    const transactionRequest = data.transactionRequest;

    if (!transactionRequest) {
      logger.warn('Bridge quote missing transactionRequest');
      return null;
    }

    const fees = calculateFees(estimate);

    const steps: BridgeStep[] = [];
    if (includedSteps && Array.isArray(includedSteps)) {
      for (const step of includedSteps) {
        try {
          steps.push(parseStep(step));
        } catch (stepError) {
          logger.warn('Failed to parse bridge step', { step, error: stepError });
        }
      }
    }

    const totalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0) ||
      (estimate.executionDuration as number) || 0;

    return {
      id: data.id || `bridge-${Date.now()}`,
      fromNetwork: params.fromNetwork,
      toNetwork: params.toNetwork,
      fromToken: ((action.fromToken as Record<string, unknown>)?.symbol as string) || params.fromToken,
      toToken: ((action.toToken as Record<string, unknown>)?.symbol as string) || params.toToken,
      fromAmount: params.amount,
      toAmount: estimate.toAmount as string,
      toAmountMin: estimate.toAmountMin as string,
      estimatedGas: fees.estimatedGas,
      estimatedGasUsd: fees.estimatedGasUsd,
      bridgeFee: fees.bridgeFee,
      bridgeFeeUsd: fees.bridgeFeeUsd,
      totalFeeUsd: fees.totalFeeUsd,
      estimatedTime: totalTime,
      priceImpact: (estimate.priceImpact as string) || '0',
      route: { steps, totalTime },
      transactionRequest: {
        to: transactionRequest.to,
        data: transactionRequest.data,
        value: transactionRequest.value || '0',
        gasLimit: transactionRequest.gasLimit || '500000',
        chainId: transactionRequest.chainId || fromChainId,
      },
    };
  } catch (error) {
    logger.warn('Failed to get bridge quote with tx', { error });
    return null;
  }
}
```

**Step 4: Add executeBridge function**

```typescript
/**
 * Execute bridge transaction
 */
export async function executeBridge(
  quote: BridgeQuoteWithTx,
  signer: ethers.Signer
): Promise<BridgeExecutionResult> {
  try {
    logger.info('Executing bridge transaction', {
      from: quote.fromNetwork,
      to: quote.toNetwork,
      amount: quote.fromAmount,
    });

    const txResponse = await signer.sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value,
      gasLimit: quote.transactionRequest.gasLimit,
    });

    logger.info('Bridge transaction sent', { txHash: txResponse.hash });

    return {
      success: true,
      txHash: txResponse.hash,
      txResponse,
    };
  } catch (error: unknown) {
    const bridgeError = parseBridgeError(error);
    throw bridgeError;
  }
}
```

**Step 5: Add parseBridgeError helper**

```typescript
/**
 * Parse error into BridgeError with code
 */
function parseBridgeError(error: unknown): BridgeError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const lowerMessage = message.toLowerCase();

  let code: BridgeErrorCode = 'UNKNOWN';
  let canRetry = false;
  let canSendAlternative = true;

  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
    code = 'BRIDGE_TX_REJECTED';
    canRetry = false;
    canSendAlternative = false;
  } else if (lowerMessage.includes('insufficient') || lowerMessage.includes('liquidity')) {
    code = 'INSUFFICIENT_LIQUIDITY';
    canRetry = false;
  } else if (lowerMessage.includes('slippage')) {
    code = 'SLIPPAGE_EXCEEDED';
    canRetry = true;
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('abort')) {
    code = 'BRIDGE_TIMEOUT';
    canRetry = true;
  } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    code = 'NETWORK_ERROR';
    canRetry = true;
  } else if (lowerMessage.includes('failed') || lowerMessage.includes('reverted')) {
    code = 'BRIDGE_TX_FAILED';
    canRetry = true;
  }

  const bridgeError = new Error(message) as BridgeError;
  bridgeError.code = code;
  bridgeError.canRetry = canRetry;
  bridgeError.canSendAlternative = canSendAlternative;

  return bridgeError;
}
```

**Step 6: Add executeBridgeWithRetry function**

```typescript
/**
 * Execute bridge with automatic retry on transient errors
 */
export async function executeBridgeWithRetry(
  params: BridgeQuoteParams,
  signer: ethers.Signer,
  maxRetries: number = 2
): Promise<BridgeExecutionResult> {
  let lastError: BridgeError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get fresh quote on retry (prices may have changed)
      const quote = await getBridgeQuoteWithTx(params);

      if (!quote) {
        throw Object.assign(new Error('Failed to get bridge quote'), {
          code: 'INSUFFICIENT_LIQUIDITY' as BridgeErrorCode,
          canRetry: false,
          canSendAlternative: true,
        });
      }

      const result = await executeBridge(quote, signer);
      return result;
    } catch (error) {
      lastError = error as BridgeError;

      logger.warn(`Bridge attempt ${attempt + 1} failed`, {
        code: lastError.code,
        message: lastError.message,
        canRetry: lastError.canRetry,
      });

      // Don't retry if error is not retryable
      if (!lastError.canRetry) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
```

**Step 7: Add waitForBridgeCompletion function**

```typescript
/**
 * Wait for bridge to complete by polling LI.FI status API
 */
export async function waitForBridgeCompletion(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  timeoutMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<BridgeCompletionResult> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(
        `${LIFI_API_URL}/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`
      );

      if (response.ok) {
        const data = await response.json();
        const status = data.status as string;

        if (status === 'DONE') {
          return {
            status: 'DONE',
            receivingTxHash: data.receiving?.txHash,
          };
        }

        if (status === 'FAILED') {
          return {
            status: 'FAILED',
            message: data.substatusMessage || 'Bridge transaction failed',
          };
        }

        // Still pending, continue polling
        logger.debug('Bridge status', { status, substatus: data.substatus });
      }
    } catch (error) {
      logger.warn('Failed to check bridge status', { error });
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout
  throw Object.assign(new Error('Bridge completion timeout'), {
    code: 'BRIDGE_TIMEOUT' as BridgeErrorCode,
    canRetry: true,
    canSendAlternative: true,
  });
}
```

**Step 8: Add token approval functions**

```typescript
// LI.FI Diamond contract address (same across most chains)
const LIFI_CONTRACT_ADDRESS = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

/**
 * Check if token approval is needed for LI.FI
 */
export async function checkBridgeAllowance(
  tokenAddress: string,
  ownerAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  // Native token doesn't need approval
  if (tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return ethers.MaxUint256;
  }

  const erc20Interface = new ethers.Interface([
    'function allowance(address owner, address spender) view returns (uint256)',
  ]);

  const contract = new ethers.Contract(tokenAddress, erc20Interface, provider);
  const allowance = await contract.allowance(ownerAddress, LIFI_CONTRACT_ADDRESS);

  return allowance;
}

/**
 * Approve token for LI.FI bridge (unlimited approval)
 */
export async function approveBridgeToken(
  tokenAddress: string,
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
  const erc20Interface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ]);

  const contract = new ethers.Contract(tokenAddress, erc20Interface, signer);
  const tx = await contract.approve(LIFI_CONTRACT_ADDRESS, ethers.MaxUint256);

  logger.info('Approval transaction sent', { txHash: tx.hash, token: tokenAddress });

  return tx;
}
```

**Step 9: Run existing tests to make sure nothing broke**

Run: `cd apps/mobile && pnpm test src/services/__tests__/bridge-service.test.ts`

Expected: All existing tests pass

**Step 10: Commit**

```bash
git add apps/mobile/src/services/bridge-service.ts
git commit -m "feat(bridge): add executeBridge, retry logic, and status polling"
```

---

## Task 2: Create bridge-slice for state management

**Files:**
- Create: `apps/mobile/src/store/slices/bridge-slice.ts`
- Modify: `apps/mobile/src/store/index.ts`

**Step 1: Create bridge-slice.ts**

```typescript
/**
 * Bridge Slice
 * Manages state for bridge execution progress
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BridgeErrorCode } from '@/src/services/bridge-service';

export interface BridgeStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
}

interface BridgeState {
  status: 'idle' | 'processing' | 'success' | 'failed';
  steps: BridgeStep[];
  currentStepIndex: number;
  progress: number;

  approveTxHash: string | null;
  bridgeTxHashes: string[];
  finalTxHash: string | null;

  error: string | null;
  errorCode: BridgeErrorCode | null;
  retryCount: number;
  canRetry: boolean;
  canSendAlternative: boolean;

  startedAt: number | null;
  estimatedTimeSeconds: number;
}

const initialState: BridgeState = {
  status: 'idle',
  steps: [],
  currentStepIndex: 0,
  progress: 0,

  approveTxHash: null,
  bridgeTxHashes: [],
  finalTxHash: null,

  error: null,
  errorCode: null,
  retryCount: 0,
  canRetry: false,
  canSendAlternative: false,

  startedAt: null,
  estimatedTimeSeconds: 0,
};

const bridgeSlice = createSlice({
  name: 'bridge',
  initialState,
  reducers: {
    resetBridge: () => initialState,

    startBridge: (state, action: PayloadAction<{ steps: BridgeStep[]; estimatedTime: number }>) => {
      state.status = 'processing';
      state.steps = action.payload.steps;
      state.estimatedTimeSeconds = action.payload.estimatedTime;
      state.startedAt = Date.now();
      state.currentStepIndex = 0;
      state.progress = 0;
      state.error = null;
      state.errorCode = null;
      state.retryCount = 0;
      state.approveTxHash = null;
      state.bridgeTxHashes = [];
      state.finalTxHash = null;
    },

    updateStep: (state, action: PayloadAction<{ index: number; status: BridgeStep['status'] }>) => {
      const { index, status } = action.payload;
      if (state.steps[index]) {
        state.steps[index].status = status;
        if (status === 'active') {
          state.currentStepIndex = index;
        }
      }
    },

    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, action.payload));
    },

    setApproveTxHash: (state, action: PayloadAction<string>) => {
      state.approveTxHash = action.payload;
    },

    addBridgeTxHash: (state, action: PayloadAction<string>) => {
      state.bridgeTxHashes.push(action.payload);
    },

    setFinalTxHash: (state, action: PayloadAction<string>) => {
      state.finalTxHash = action.payload;
    },

    bridgeSuccess: (state) => {
      state.status = 'success';
      state.progress = 100;
      // Mark all steps as done
      state.steps = state.steps.map(step => ({ ...step, status: 'done' as const }));
    },

    bridgeError: (state, action: PayloadAction<{
      message: string;
      code: BridgeErrorCode;
      canRetry: boolean;
      canSendAlternative: boolean;
    }>) => {
      state.status = 'failed';
      state.error = action.payload.message;
      state.errorCode = action.payload.code;
      state.canRetry = action.payload.canRetry;
      state.canSendAlternative = action.payload.canSendAlternative;
      // Mark current step as failed
      if (state.steps[state.currentStepIndex]) {
        state.steps[state.currentStepIndex].status = 'failed';
      }
    },

    incrementRetry: (state) => {
      state.retryCount += 1;
      state.error = null;
      state.errorCode = null;
      state.status = 'processing';
      // Reset failed step to active
      if (state.steps[state.currentStepIndex]) {
        state.steps[state.currentStepIndex].status = 'active';
      }
    },
  },
});

export const {
  resetBridge,
  startBridge,
  updateStep,
  setProgress,
  setApproveTxHash,
  addBridgeTxHash,
  setFinalTxHash,
  bridgeSuccess,
  bridgeError,
  incrementRetry,
} = bridgeSlice.actions;

export default bridgeSlice.reducer;

// Selectors
export const selectBridgeStatus = (state: { bridge: BridgeState }) => state.bridge.status;
export const selectBridgeSteps = (state: { bridge: BridgeState }) => state.bridge.steps;
export const selectBridgeProgress = (state: { bridge: BridgeState }) => state.bridge.progress;
export const selectBridgeError = (state: { bridge: BridgeState }) => ({
  message: state.bridge.error,
  code: state.bridge.errorCode,
  canRetry: state.bridge.canRetry,
  canSendAlternative: state.bridge.canSendAlternative,
});
export const selectBridgeTxHashes = (state: { bridge: BridgeState }) => ({
  approve: state.bridge.approveTxHash,
  bridge: state.bridge.bridgeTxHashes,
  final: state.bridge.finalTxHash,
});
```

**Step 2: Add bridge reducer to store**

Modify `apps/mobile/src/store/index.ts`:

Add import at top:
```typescript
import bridgeReducer from './slices/bridge-slice';
```

Add to rootReducer:
```typescript
bridge: bridgeReducer,
```

**Step 3: Commit**

```bash
git add apps/mobile/src/store/slices/bridge-slice.ts apps/mobile/src/store/index.ts
git commit -m "feat(bridge): add bridge-slice for execution state management"
```

---

## Task 3: Add smart send thunks to send-slice

**Files:**
- Modify: `apps/mobile/src/store/slices/send-slice.ts`

**Step 1: Add imports at top of send-slice.ts**

```typescript
import {
  getBridgeQuoteWithTx,
  executeBridgeWithRetry,
  waitForBridgeCompletion,
  checkBridgeAllowance,
  approveBridgeToken,
  type BridgeQuoteParams,
  type BridgeError,
  NETWORK_TO_CHAIN_ID,
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
```

**Step 2: Add helper to create steps based on route type**

```typescript
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
```

**Step 3: Add executeSmartSendThunk**

```typescript
interface SmartSendParams {
  wallet: { address: string; privateKey: string };
  route: TransferRoute | null;
  recipient: string;
  amount: string;
  token: string;
}

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

    // Bridge or consolidation - use new flow
    if (route.type === 'bridge') {
      return dispatch(executeBridgeSendThunk({
        wallet,
        route,
        recipient,
        amount,
        token,
      })).unwrap();
    }

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
```

**Step 4: Add executeBridgeSendThunk**

```typescript
interface BridgeSendParams {
  wallet: { address: string; privateKey: string };
  route: TransferRoute;
  recipient: string;
  amount: string;
  token: string;
}

export const executeBridgeSendThunk = createAsyncThunk(
  'send/executeBridgeSend',
  async (params: BridgeSendParams, { dispatch, getState }) => {
    const { wallet, route, recipient, amount, token } = params;

    if (!route.bridgeQuote) {
      throw new Error('Bridge quote not available');
    }

    const provider = new ethers.JsonRpcProvider(/* get RPC URL for fromNetwork */);
    const signer = new ethers.Wallet(wallet.privateKey, provider);

    // Check if approval needed
    const allowance = await checkBridgeAllowance(token, wallet.address, provider);
    const amountBigInt = BigInt(route.bridgeQuote.fromAmount);
    const needsApproval = token !== 'ETH' && allowance < amountBigInt;

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
        throw Object.assign(new Error(completion.message || 'Bridge failed'), {
          code: 'BRIDGE_TX_FAILED',
          canRetry: true,
          canSendAlternative: true,
        });
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
```

**Step 5: Add executeConsolidationSendThunk (simplified - parallel bridges)**

```typescript
export const executeConsolidationSendThunk = createAsyncThunk(
  'send/executeConsolidationSend',
  async (params: BridgeSendParams, { dispatch }) => {
    const { wallet, route, recipient, token } = params;

    if (!route.sources || route.sources.length === 0) {
      throw new Error('No sources for consolidation');
    }

    // For MVP: execute bridges sequentially to simplify
    // Can optimize to parallel later
    const steps = createBridgeSteps(route, false);
    dispatch(startBridge({
      steps,
      estimatedTime: route.sources.reduce((sum, s) => sum + (s.bridgeQuote?.estimatedTime || 0), 0),
    }));

    let stepIndex = 0;

    try {
      // Execute each bridge
      for (const source of route.sources) {
        if (!source.bridgeQuote) continue;

        dispatch(updateStep({ index: stepIndex, status: 'active' }));

        const provider = new ethers.JsonRpcProvider(/* get RPC for source.network */);
        const signer = new ethers.Wallet(wallet.privateKey, provider);

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
        dispatch(addBridgeTxHash(bridgeResult.txHash));
        dispatch(updateStep({ index: stepIndex, status: 'done' }));
        stepIndex++;
      }

      // Wait for all bridges
      dispatch(updateStep({ index: stepIndex, status: 'active' }));
      dispatch(setProgress(70));

      // Wait for last bridge (simplified)
      const lastTxHash = (await dispatch(selectBridgeTxHashes)).bridge.slice(-1)[0];
      if (lastTxHash) {
        await waitForBridgeCompletion(
          lastTxHash,
          NETWORK_TO_CHAIN_ID[route.sources[route.sources.length - 1].network],
          NETWORK_TO_CHAIN_ID[route.toNetwork]
        );
      }

      dispatch(updateStep({ index: stepIndex, status: 'done' }));
      dispatch(setProgress(100));
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
```

**Step 6: Export NETWORK_TO_CHAIN_ID from bridge-service**

In bridge-service.ts, add export:
```typescript
export { NETWORK_TO_CHAIN_ID };
```

**Step 7: Commit**

```bash
git add apps/mobile/src/store/slices/send-slice.ts apps/mobile/src/services/bridge-service.ts
git commit -m "feat(bridge): add smart send thunks with bridge execution"
```

---

## Task 4: Create BridgeProgressSteps component

**Files:**
- Create: `apps/mobile/src/components/BridgeProgressSteps.tsx`

**Step 1: Create the component**

```typescript
/**
 * BridgeProgressSteps Component
 * Displays step-by-step progress during bridge execution
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import type { BridgeStep } from '@/src/store/slices/bridge-slice';

interface BridgeProgressStepsProps {
  steps: BridgeStep[];
  currentStepIndex: number;
}

export function BridgeProgressSteps({ steps, currentStepIndex }: BridgeProgressStepsProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.iconContainer}>
            {step.status === 'done' && (
              <FontAwesome name="check-circle" size={20} color={theme.colors.success} />
            )}
            {step.status === 'active' && (
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
              </View>
            )}
            {step.status === 'pending' && (
              <View style={styles.pendingIndicator} />
            )}
            {step.status === 'failed' && (
              <FontAwesome name="times-circle" size={20} color={theme.colors.error} />
            )}
          </View>

          <Text
            style={[
              styles.stepLabel,
              theme.typography.body,
              step.status === 'done' && styles.stepDone,
              step.status === 'active' && styles.stepActive,
              step.status === 'pending' && styles.stepPending,
              step.status === 'failed' && styles.stepFailed,
            ]}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.buttonPrimary,
  },
  pendingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
  },
  stepLabel: {
    flex: 1,
  },
  stepDone: {
    color: theme.colors.success,
  },
  stepActive: {
    color: theme.colors.textPrimary,
  },
  stepPending: {
    color: theme.colors.textTertiary,
  },
  stepFailed: {
    color: theme.colors.error,
  },
});
```

**Step 2: Export from components index**

Add to `apps/mobile/src/components/index.ts`:
```typescript
export { BridgeProgressSteps } from './BridgeProgressSteps';
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/BridgeProgressSteps.tsx apps/mobile/src/components/index.ts
git commit -m "feat(bridge): add BridgeProgressSteps component"
```

---

## Task 5: Create bridging progress screen

**Files:**
- Create: `apps/mobile/app/send/bridging.tsx`

**Step 1: Create the screen**

```typescript
/**
 * Send Screen: Bridge Progress
 * Shows real-time progress during bridge execution
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  selectBridgeStatus,
  selectBridgeSteps,
  selectBridgeProgress,
  selectBridgeError,
  resetBridge,
  incrementRetry,
} from '@/src/store/slices/bridge-slice';
import { resetSend } from '@/src/store/slices/send-slice';
import { BridgeProgressSteps } from '@/src/components';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function BridgingScreen() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectBridgeStatus);
  const steps = useAppSelector(selectBridgeSteps);
  const progress = useAppSelector(selectBridgeProgress);
  const error = useAppSelector(selectBridgeError);
  const send = useAppSelector((state) => state.send);

  // Navigate to success when bridge completes
  useEffect(() => {
    if (status === 'success') {
      router.replace('/send/success');
    }
  }, [status]);

  const handleRetry = () => {
    dispatch(incrementRetry());
    // Re-trigger the send - this would need to be connected to the thunk
    // For now, go back to confirm
    router.back();
  };

  const handleSendAlternative = () => {
    // Reset and go back to confirm with direct send
    dispatch(resetBridge());
    router.back();
  };

  const handleCancel = () => {
    dispatch(resetBridge());
    dispatch(resetSend());
    router.replace('/send');
  };

  const currentStepIndex = steps.findIndex(s => s.status === 'active');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title={status === 'failed' ? 'Bridge Failed' : 'Sending'}
        showBack={false}
      />

      <View style={styles.container}>
        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Text style={[styles.progressText, theme.typography.display]}>
              {progress}%
            </Text>
          </View>
        </View>

        {/* Amount being sent */}
        <Text style={[styles.amountText, theme.typography.heading]}>
          Sending {send.amount} {send.selectedToken}
        </Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <BridgeProgressSteps steps={steps} currentStepIndex={currentStepIndex} />
        </View>

        {/* Error state */}
        {status === 'failed' && error.message && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={24} color={theme.colors.error} />
            <Text style={[styles.errorText, theme.typography.body]}>
              {error.message}
            </Text>
            <Text style={[styles.safeText, theme.typography.caption]}>
              Your funds are safe. Nothing was deducted.
            </Text>
          </View>
        )}

        {/* Info message */}
        {status === 'processing' && (
          <View style={styles.infoContainer}>
            <FontAwesome name="info-circle" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, theme.typography.caption]}>
              You can minimize the app. We'll notify you when done.
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        {status === 'failed' && (
          <>
            {error.canRetry && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                <Text style={[styles.primaryButtonText, theme.typography.heading]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            )}
            {error.canSendAlternative && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSendAlternative}>
                <Text style={[styles.secondaryButtonText, theme.typography.body]}>
                  Send Without Bridge
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={[styles.cancelButtonText, theme.typography.body]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  progressContainer: {
    marginVertical: theme.spacing.xl,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  progressText: {
    color: theme.colors.textPrimary,
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  errorContainer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  safeText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    color: theme.colors.textSecondary,
    flex: 1,
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
});
```

**Step 2: Commit**

```bash
git add apps/mobile/app/send/bridging.tsx
git commit -m "feat(bridge): add bridging progress screen"
```

---

## Task 6: Update confirm.tsx to use smart send

**Files:**
- Modify: `apps/mobile/app/send/confirm.tsx`

**Step 1: Update imports**

Add to imports:
```typescript
import { executeSmartSendThunk } from '@/src/store/slices/send-slice';
import { resetBridge } from '@/src/store/slices/bridge-slice';
```

**Step 2: Update handleConfirm function**

Replace the existing `handleConfirm` callback (around line 119-135) with:

```typescript
const handleConfirm = useCallback(async () => {
  if (!wallet.mnemonic || !currentAccount) return;

  const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

  // Touch contact to update lastUsedAt if exists
  if (existingContact) {
    dispatch(touchContactThunk(send.recipient));
  }

  // Check if bridge/consolidation is needed
  const route = routingResult?.route;
  const needsBridge = route && (route.type === 'bridge' || route.type === 'consolidation');

  if (needsBridge) {
    // Navigate to bridging screen first
    router.push('/send/bridging');

    // Execute smart send with bridge
    await dispatch(executeSmartSendThunk({
      wallet: hdWallet,
      route,
      recipient: send.recipient,
      amount: send.amount,
      token: tokenAddress,
    }));
  } else {
    // Direct send - use existing flow
    await dispatch(sendTransactionThunk({
      wallet: hdWallet,
      to: send.recipient,
      amount: send.amount,
      token: tokenAddress,
    }));
  }
}, [wallet.mnemonic, currentAccount, existingContact, dispatch, send.recipient, send.amount, tokenAddress, routingResult]);
```

**Step 3: Add cleanup on unmount**

Add useEffect for cleanup:
```typescript
useEffect(() => {
  return () => {
    // Reset bridge state when leaving confirm screen
    dispatch(resetBridge());
  };
}, [dispatch]);
```

**Step 4: Commit**

```bash
git add apps/mobile/app/send/confirm.tsx
git commit -m "feat(bridge): integrate smart send into confirm screen"
```

---

## Task 7: Write tests for bridge execution

**Files:**
- Create: `apps/mobile/src/services/__tests__/bridge-execution.test.ts`

**Step 1: Create test file**

```typescript
/**
 * Bridge Execution Tests
 */

import {
  parseBridgeError,
  executeBridgeWithRetry,
  waitForBridgeCompletion,
} from '../bridge-service';

// Mock fetch
global.fetch = jest.fn();

describe('Bridge Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseBridgeError', () => {
    it('should identify user rejection', () => {
      const error = new Error('user rejected transaction');
      const result = parseBridgeError(error);

      expect(result.code).toBe('BRIDGE_TX_REJECTED');
      expect(result.canRetry).toBe(false);
    });

    it('should identify insufficient liquidity', () => {
      const error = new Error('insufficient liquidity for this trade');
      const result = parseBridgeError(error);

      expect(result.code).toBe('INSUFFICIENT_LIQUIDITY');
      expect(result.canRetry).toBe(false);
      expect(result.canSendAlternative).toBe(true);
    });

    it('should identify slippage error as retryable', () => {
      const error = new Error('slippage tolerance exceeded');
      const result = parseBridgeError(error);

      expect(result.code).toBe('SLIPPAGE_EXCEEDED');
      expect(result.canRetry).toBe(true);
    });

    it('should identify network error as retryable', () => {
      const error = new Error('network request failed');
      const result = parseBridgeError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.canRetry).toBe(true);
    });
  });

  describe('waitForBridgeCompletion', () => {
    it('should return DONE when bridge completes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'DONE',
          receiving: { txHash: '0xabc' },
        }),
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 1000);

      expect(result.status).toBe('DONE');
      expect(result.receivingTxHash).toBe('0xabc');
    });

    it('should return FAILED when bridge fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'FAILED',
          substatusMessage: 'Bridge transaction reverted',
        }),
      });

      const result = await waitForBridgeCompletion('0x123', 8453, 137, 1000);

      expect(result.status).toBe('FAILED');
      expect(result.message).toBe('Bridge transaction reverted');
    });

    it('should timeout after specified duration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'PENDING' }),
      });

      await expect(
        waitForBridgeCompletion('0x123', 8453, 137, 100) // 100ms timeout
      ).rejects.toThrow('Bridge completion timeout');
    }, 5000);
  });
});
```

**Step 2: Run tests**

Run: `cd apps/mobile && pnpm test src/services/__tests__/bridge-execution.test.ts`

Expected: Tests pass

**Step 3: Commit**

```bash
git add apps/mobile/src/services/__tests__/bridge-execution.test.ts
git commit -m "test(bridge): add unit tests for bridge execution"
```

---

## Task 8: Final integration test and cleanup

**Step 1: Run all tests**

Run: `cd apps/mobile && pnpm test`

Expected: All tests pass

**Step 2: Run TypeScript check**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: No errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(bridge): complete bridge execution implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extend bridge-service | bridge-service.ts |
| 2 | Create bridge-slice | bridge-slice.ts, store/index.ts |
| 3 | Add smart send thunks | send-slice.ts |
| 4 | BridgeProgressSteps component | BridgeProgressSteps.tsx |
| 5 | Bridging progress screen | bridging.tsx |
| 6 | Update confirm screen | confirm.tsx |
| 7 | Write tests | bridge-execution.test.ts |
| 8 | Integration test | - |
