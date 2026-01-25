# Bridge Execution Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement actual bridge execution so cross-network transfers work end-to-end.

**Architecture:** Extend bridge-service with executeBridge(), add bridge-slice for state, create progress UI, integrate into send flow via executeSmartSendThunk.

**Tech Stack:** LI.FI REST API, ethers.js v6, Redux Toolkit, React Native

---

## Decisions Made

| Decision | Choice |
|----------|--------|
| Automation Level | Fully automatic (no extra confirmation) |
| Error Handling | Retry 2x + Rollback (show error with options) |
| Consolidation | Parallel bridges from multiple networks |
| Token Approval | Unlimited (MaxUint256) - one-time per token |
| Progress UI | Step-by-step progress screen |

---

## Architecture

### Data Flow

```
confirm.tsx
    │
    ├─ route.type === 'direct'
    │   └─ sendTransactionThunk() — existing flow
    │
    ├─ route.type === 'bridge'
    │   └─ executeBridgeSendThunk()
    │       ├─ 1. checkAllowance() + approve() if needed
    │       ├─ 2. executeBridgeWithRetry()
    │       └─ 3. Wait for completion + final send
    │
    └─ route.type === 'consolidation'
        └─ executeConsolidationSendThunk()
            ├─ 1. Parallel: approve + bridge from each network
            ├─ 2. Wait for all bridges
            └─ 3. Final send to recipient
```

### New Files

```
apps/mobile/
├── src/store/slices/bridge-slice.ts     # Bridge state management
├── src/components/BridgeProgressSteps.tsx # Progress UI component
├── app/send/bridging.tsx                 # Progress screen
└── src/services/__tests__/bridge-execution.test.ts
```

### Modified Files

```
apps/mobile/
├── src/services/bridge-service.ts       # Add execute functions
├── src/store/slices/send-slice.ts       # Add smart send thunks
├── src/store/index.ts                   # Add bridge reducer
└── app/send/confirm.tsx                 # Use executeSmartSendThunk
```

---

## Bridge Service Extensions

### New Functions

```typescript
// Get quote WITH transaction request (for execution)
export async function getBridgeQuoteWithTx(
  fromNetwork: NetworkId,
  toNetwork: NetworkId,
  fromToken: string,
  toToken: string,
  amount: string,
  fromAddress: string,
  toAddress?: string
): Promise<BridgeQuoteWithTx | null>

// Execute bridge transaction
export async function executeBridge(
  quote: BridgeQuoteWithTx,
  signer: ethers.Signer
): Promise<{ txHash: string; txResponse: TransactionResponse }>

// Retry wrapper with fresh quote on retry
export async function executeBridgeWithRetry(
  quoteParams: BridgeQuoteParams,
  signer: ethers.Signer,
  maxRetries?: number // default: 2
): Promise<BridgeExecutionResult>

// Poll bridge status via LI.FI API
export async function waitForBridgeCompletion(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  timeoutMs?: number // default: 15 minutes
): Promise<BridgeCompletionResult>
```

### Types

```typescript
interface BridgeQuoteWithTx extends BridgeQuote {
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
}

interface BridgeExecutionResult {
  success: boolean;
  txHash: string;
  receivingTxHash?: string; // TX on destination chain
}

type BridgeStatus = 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND';
```

---

## Bridge Slice

```typescript
interface BridgeStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
}

interface BridgeState {
  status: 'idle' | 'processing' | 'success' | 'failed';
  steps: BridgeStep[];
  currentStepIndex: number;
  progress: number; // 0-100

  approveTxHash?: string;
  bridgeTxHashes: string[];
  finalTxHash?: string;

  error?: string;
  errorCode?: BridgeErrorCode;
  retryCount: number;
  canRetry: boolean;
  canSendAlternative: boolean;

  startedAt?: number;
  estimatedTimeSeconds: number;
}

// Actions
- resetBridge()
- setStatus(status)
- setSteps(steps)
- updateStep({ index, status })
- setProgress(percent)
- setApproveTxHash(hash)
- addBridgeTxHash(hash)
- setFinalTxHash(hash)
- setError({ code, message, canRetry, canSendAlternative })
- incrementRetry()
```

---

## Send Slice Extensions

### New Thunks

```typescript
// Main entry point - routes to correct flow
export const executeSmartSendThunk = createAsyncThunk(
  'send/executeSmartSend',
  async (params: SmartSendParams, { dispatch }) => {
    const { wallet, route, recipient, amount, token } = params;

    if (!route || route.type === 'direct') {
      return dispatch(sendTransactionThunk({ wallet, to: recipient, amount, token }));
    }

    if (route.type === 'bridge') {
      return dispatch(executeBridgeSendThunk({ wallet, route, recipient }));
    }

    if (route.type === 'consolidation') {
      return dispatch(executeConsolidationSendThunk({ wallet, route, recipient }));
    }
  }
);

// Single bridge flow
export const executeBridgeSendThunk = createAsyncThunk(
  'send/executeBridgeSend',
  async (params, { dispatch }) => {
    // 1. Set up steps
    // 2. Approve if needed
    // 3. Execute bridge with retry
    // 4. Wait for completion
    // 5. Send to recipient on target chain
  }
);

// Consolidation flow (parallel bridges)
export const executeConsolidationSendThunk = createAsyncThunk(
  'send/executeConsolidationSend',
  async (params, { dispatch }) => {
    // 1. Approve all tokens in parallel
    // 2. Execute all bridges in parallel
    // 3. Wait for ALL to complete
    // 4. Send to recipient
  }
);
```

---

## Error Handling

### Error Types

```typescript
type BridgeErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'BRIDGE_TIMEOUT'
  | 'APPROVAL_REJECTED'
  | 'BRIDGE_TX_REJECTED'
  | 'BRIDGE_TX_FAILED'
  | 'NETWORK_ERROR'
  | 'PARTIAL_CONSOLIDATION'
  | 'UNKNOWN';
```

### Retry Strategy

| Error | Retry? | User Action |
|-------|--------|-------------|
| INSUFFICIENT_LIQUIDITY | No | Suggest alternative |
| SLIPPAGE_EXCEEDED | Yes (fresh quote) | Auto |
| BRIDGE_TIMEOUT | Yes | Auto |
| APPROVAL_REJECTED | No | Show "Cancelled" |
| BRIDGE_TX_REJECTED | No | Show "Cancelled" |
| BRIDGE_TX_FAILED | Yes (fresh quote) | Auto |
| NETWORK_ERROR | Yes | Auto |
| PARTIAL_CONSOLIDATION | No | Ask user |

---

## UI: Progress Screen

### Layout (app/send/bridging.tsx)

```
┌─────────────────────────────────────┐
│         Sending 100 USDC            │
│                                     │
│    ┌─────────────────────────┐      │
│    │    [Progress Circle]    │      │
│    │         67%             │      │
│    └─────────────────────────┘      │
│                                     │
│  ✓ Approved USDC                    │
│  ● Bridging from Base to Polygon... │
│  ○ Waiting for confirmation         │
│  ○ Sending to recipient             │
│                                     │
│  ─────────────────────────────────  │
│  Estimated time: ~3 min             │
│  Bridge fee: $0.45                  │
│                                     │
│  ⓘ You can minimize the app.        │
│    We'll notify you when done.      │
└─────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────┐
│         Bridge Failed               │
│                                     │
│    ⚠️ Couldn't complete bridge      │
│                                     │
│  "Insufficient liquidity"           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Try Again            │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Send on Base instead       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Your funds are safe.               │
└─────────────────────────────────────┘
```

---

## Testing

### Unit Tests

```typescript
describe('executeBridge', () => {
  it('executes bridge with valid quote');
  it('throws on user rejection');
});

describe('executeBridgeWithRetry', () => {
  it('retries on SLIPPAGE_EXCEEDED with fresh quote');
  it('does NOT retry on APPROVAL_REJECTED');
  it('respects maxRetries limit');
});

describe('waitForBridgeCompletion', () => {
  it('returns success when bridge completes');
  it('throws on timeout');
});

describe('Consolidation', () => {
  it('executes parallel bridges');
  it('handles partial failure');
});
```

### Integration Scenarios

1. Direct Send — works as before
2. Single Bridge — Base → Polygon → recipient
3. Bridge with Approval — first time needs approve
4. Bridge Retry — slippage → retry → success
5. Bridge Failure — show error with options
6. Consolidation — 2 networks → target → recipient
7. Partial Consolidation Failure — one bridge fails
