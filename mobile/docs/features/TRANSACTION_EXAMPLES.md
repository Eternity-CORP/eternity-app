# Transaction Examples

## Basic Examples

### 1. Simple ETH Transfer

```typescript
import { sendNative } from './transactions';

async function sendEth() {
  try {
    const result = await sendNative({
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      amountEther: "0.001"
    });
    
    console.log(`✅ Transaction sent!`);
    console.log(`Hash: ${result.hash}`);
    console.log(`Nonce: ${result.nonce}`);
    console.log(`Gas Fee: ${result.gasEstimate.totalFeeTH} ETH`);
    
    return result.hash;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  }
}
```

### 2. Send with Different Fee Levels

```typescript
import { sendNative } from './transactions';

// Low fee (slower, cheaper)
const lowFeeResult = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  feeLevel: "low"
});

// Medium fee (balanced)
const mediumFeeResult = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  feeLevel: "medium"
});

// High fee (faster, more expensive)
const highFeeResult = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  feeLevel: "high"
});
```

### 3. Send and Wait for Confirmations

```typescript
import { sendNativeAndWait } from './transactions';

async function sendAndWait() {
  const { result, confirmation } = await sendNativeAndWait({
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    amountEther: "0.001",
    minConfirms: 2,
    timeoutMs: 120000, // 2 minutes
    onStatusUpdate: (status) => {
      console.log(`Status: ${status.status}`);
      console.log(`Confirmations: ${status.confirmations}`);
      console.log(`Block: ${status.blockNumber}`);
    }
  });
  
  console.log(`✅ Confirmed in block ${confirmation.blockNumber}`);
  console.log(`Gas used: ${confirmation.gasUsed}`);
  
  return confirmation;
}
```

### 4. Custom Gas Parameters

```typescript
import { ethers } from 'ethers';
import { sendNative } from './transactions';

async function sendWithCustomGas() {
  const result = await sendNative({
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    amountEther: "0.001",
    gasLimit: ethers.BigNumber.from(25000),
    maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei")
  });
  
  return result;
}
```

## Advanced Examples

### 5. Error Handling

```typescript
import {
  sendNative,
  InsufficientFundsError,
  InvalidAddressError,
  InvalidAmountError,
  TransactionError
} from './transactions';

async function sendWithErrorHandling(to: string, amount: string) {
  try {
    const result = await sendNative({
      to,
      amountEther: amount
    });
    
    return { success: true, hash: result.hash };
    
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return {
        success: false,
        error: 'insufficient_funds',
        message: 'You don\'t have enough ETH for this transaction',
        details: error.details
      };
    }
    
    if (error instanceof InvalidAddressError) {
      return {
        success: false,
        error: 'invalid_address',
        message: 'Please enter a valid Ethereum address',
        details: error.details
      };
    }
    
    if (error instanceof InvalidAmountError) {
      return {
        success: false,
        error: 'invalid_amount',
        message: 'Please enter a valid amount',
        details: error.details
      };
    }
    
    if (error instanceof TransactionError) {
      // Handle specific transaction errors
      if (error.code === 'NONCE_TOO_LOW') {
        return {
          success: false,
          error: 'nonce_too_low',
          message: 'Please wait for previous transaction to confirm'
        };
      }
      
      if (error.code === 'UNDERPRICED') {
        return {
          success: false,
          error: 'underpriced',
          message: 'Gas price too low. Try increasing the fee.'
        };
      }
      
      if (error.code === 'NETWORK_ERROR') {
        return {
          success: false,
          error: 'network_error',
          message: 'Network error. Please check your connection.'
        };
      }
    }
    
    // Unknown error
    return {
      success: false,
      error: 'unknown',
      message: error.message || 'Transaction failed'
    };
  }
}
```

### 6. Progress Tracking

```typescript
import { sendNative, waitForConfirmations, TransactionStatus } from './transactions';

async function sendWithProgress(
  to: string,
  amount: string,
  onProgress: (stage: string, data: any) => void
) {
  // Stage 1: Validating
  onProgress('validating', { to, amount });
  
  // Stage 2: Sending
  onProgress('sending', {});
  
  const result = await sendNative({ to, amountEther: amount });
  
  onProgress('sent', {
    hash: result.hash,
    nonce: result.nonce,
    gasFee: result.gasEstimate.totalFeeTH
  });
  
  // Stage 3: Waiting for confirmations
  onProgress('confirming', { hash: result.hash });
  
  const confirmation = await waitForConfirmations({
    hash: result.hash,
    minConfirms: 2,
    onStatusUpdate: (status) => {
      onProgress('confirmation_update', {
        confirmations: status.confirmations,
        status: status.status,
        blockNumber: status.blockNumber
      });
    }
  });
  
  // Stage 4: Confirmed
  onProgress('confirmed', {
    hash: result.hash,
    blockNumber: confirmation.blockNumber,
    confirmations: confirmation.confirmations,
    gasUsed: confirmation.gasUsed
  });
  
  return confirmation;
}

// Usage
await sendWithProgress(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "0.001",
  (stage, data) => {
    console.log(`[${stage}]`, data);
  }
);
```

### 7. Batch Transactions

```typescript
import { sendNative } from './transactions';

async function sendBatch(recipients: Array<{ to: string; amount: string }>) {
  const results = [];
  
  for (const { to, amount } of recipients) {
    try {
      const result = await sendNative({
        to,
        amountEther: amount,
        feeLevel: 'medium'
      });
      
      results.push({
        success: true,
        to,
        amount,
        hash: result.hash
      });
      
      // Wait a bit between transactions to avoid nonce conflicts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      results.push({
        success: false,
        to,
        amount,
        error: error.message
      });
    }
  }
  
  return results;
}

// Usage
const results = await sendBatch([
  { to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", amount: "0.001" },
  { to: "0x1234567890123456789012345678901234567890", amount: "0.002" },
  { to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", amount: "0.003" }
]);

console.log(`Sent ${results.filter(r => r.success).length}/${results.length} transactions`);
```

### 8. React Hook Example

```typescript
import { useState, useCallback } from 'react';
import { sendNative, TransactionStatus } from '../wallet/transactions';

export function useSendEth() {
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const send = useCallback(async (to: string, amount: string) => {
    try {
      setSending(true);
      setError(null);
      setTxHash(null);
      setStatus(null);
      
      const result = await sendNative({
        to,
        amountEther: amount,
        feeLevel: 'medium'
      });
      
      setTxHash(result.hash);
      setStatus(result.status);
      
      return result;
      
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setSending(false);
    }
  }, []);
  
  const reset = useCallback(() => {
    setSending(false);
    setTxHash(null);
    setStatus(null);
    setError(null);
  }, []);
  
  return {
    send,
    reset,
    sending,
    txHash,
    status,
    error
  };
}

// Usage in component
function SendButton() {
  const { send, sending, txHash, error } = useSendEth();
  
  const handleSend = async () => {
    try {
      await send("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "0.001");
      alert(`Transaction sent: ${txHash}`);
    } catch (err) {
      alert(`Error: ${error}`);
    }
  };
  
  return (
    <button onClick={handleSend} disabled={sending}>
      {sending ? 'Sending...' : 'Send ETH'}
    </button>
  );
}
```

### 9. Testing Example

```typescript
import { sendNative } from './transactions';

// Mock for testing
jest.mock('./transactions');

describe('MyComponent', () => {
  it('should send ETH', async () => {
    const mockSendNative = sendNative as jest.MockedFunction<typeof sendNative>;
    
    mockSendNative.mockResolvedValue({
      hash: '0xabc123',
      nonce: 0,
      from: '0x1234567890123456789012345678901234567890',
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: '0.001',
      gasEstimate: {
        gasLimit: ethers.BigNumber.from(21000),
        totalFeeTH: '0.00015',
        isEIP1559: true,
        level: 'medium'
      },
      status: TransactionStatus.PENDING,
      timestamp: Date.now(),
      response: {} as any
    });
    
    const result = await sendNative({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amountEther: '0.001'
    });
    
    expect(result.hash).toBe('0xabc123');
    expect(mockSendNative).toHaveBeenCalledWith({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amountEther: '0.001'
    });
  });
});
```

### 10. Retry Logic Example

```typescript
import { sendNative, TransactionError } from './transactions';

async function sendWithRetry(
  to: string,
  amount: string,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      
      const result = await sendNative({
        to,
        amountEther: amount,
        feeLevel: attempt === 1 ? 'medium' : 'high' // Increase fee on retry
      });
      
      console.log(`✅ Success on attempt ${attempt}`);
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (
        error instanceof InsufficientFundsError ||
        error instanceof InvalidAddressError ||
        error instanceof InvalidAmountError
      ) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}
```

## Integration with UI

### React Native Example

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { sendNativeAndWait, TransactionStatus } from './wallet/transactions';

export function SendEthForm() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      
      const { result, confirmation } = await sendNativeAndWait({
        to,
        amountEther: amount,
        minConfirms: 2,
        onStatusUpdate: (update) => {
          setStatus(update.status);
          setConfirmations(update.confirmations);
        }
      });
      
      alert(`Transaction confirmed! Hash: ${result.hash}`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };
  
  return (
    <View>
      <TextInput
        placeholder="Recipient address"
        value={to}
        onChangeText={setTo}
      />
      
      <TextInput
        placeholder="Amount (ETH)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      
      <Button
        title={sending ? 'Sending...' : 'Send ETH'}
        onPress={handleSend}
        disabled={sending}
      />
      
      {sending && (
        <View>
          <ActivityIndicator />
          <Text>Status: {status}</Text>
          <Text>Confirmations: {confirmations}</Text>
        </View>
      )}
      
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```
