# Send ETH - Quick Start Guide

## 🚀 Quick Usage

### Basic Send

```typescript
import { sendNative } from './src/wallet/transactions';

// Send 0.001 ETH
const result = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001"
});

console.log(`Transaction sent: ${result.hash}`);
```

### Send with Confirmations

```typescript
import { sendNativeAndWait } from './src/wallet/transactions';

const { result, confirmation } = await sendNativeAndWait({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  minConfirms: 2,
  onStatusUpdate: (status) => {
    console.log(`Confirmations: ${status.confirmations}`);
  }
});

console.log(`Confirmed in block ${confirmation.blockNumber}`);
```

## 📱 UI Usage

```typescript
// Navigate to send screen
navigation.navigate('Send');
```

## 🧪 Testing

### Unit Tests
```bash
npm test -- transactions.test.ts
```

### Integration Tests (Sepolia)
```bash
# Set environment variable
export INTEGRATION_TESTS=true

# Run tests
npm test -- transactions.integration.test.ts
```

## ⚙️ Configuration

### Setup RPC (Recommended)

Edit `mobile/.env`:

```bash
# Alchemy (recommended)
EXPO_PUBLIC_ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
EXPO_PUBLIC_ALCHEMY_HOLESKY_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_API_KEY
```

Get free API key: https://www.alchemy.com/

## 🎯 Features

- ✅ Address validation (EIP-55)
- ✅ Balance checking
- ✅ Gas estimation (low/medium/high)
- ✅ Transaction confirmations (≥2 blocks)
- ✅ Real-time status updates
- ✅ Human-readable errors
- ✅ Nonce management
- ✅ Advanced gas customization

## 📝 Error Handling

```typescript
try {
  await sendNative({ to, amountEther });
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.error('Not enough funds');
  } else if (error instanceof InvalidAddressError) {
    console.error('Invalid address');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

## 📚 Full Documentation

See `SEND_NATIVE_IMPLEMENTATION.md` for complete documentation.

## 🔧 Troubleshooting

**Transaction not confirming?**
- Use 'high' fee level
- Check network status

**RPC errors?**
- Configure Alchemy/Infura in `.env`
- See `RPC_CONFIGURATION.md`

**Insufficient funds?**
- Check balance includes gas fees
- Use 'low' fee level to save on gas
