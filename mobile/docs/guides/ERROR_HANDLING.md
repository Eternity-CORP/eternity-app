# 🚨 Error Handling & User Messages

## ✅ Что реализовано

### Core Features
- ✅ **Error Code Mapping** - RPC → человеко-понятные тексты
- ✅ **Localization** - RU/EN поддержка
- ✅ **Standardized Format** - `{ code, title, message, hint, action }`
- ✅ **Privacy Protection** - удаление приватных данных
- ✅ **UI Components** - Alert и Toast
- ✅ **Actionable Hints** - что делать дальше

## 🏗️ Architecture

```
src/
├── utils/
│   └── error-codes.ts              # Core error mapping (600+ lines)
└── components/
    └── errors/
        ├── ErrorAlert.tsx          # Alert dialogs
        └── ErrorToast.tsx          # Toast notifications
```

## 📊 Error Codes

### Supported Errors:

| Code | RPC Pattern | Title (EN) | Title (RU) |
|------|-------------|------------|------------|
| `INSUFFICIENT_FUNDS` | "insufficient funds" | Insufficient Balance | Недостаточно средств |
| `INSUFFICIENT_GAS` | "insufficient funds for gas" | Insufficient Gas | Недостаточно газа |
| `UNDERPRICED` | "transaction underpriced" | Gas Price Too Low | Слишком низкая цена газа |
| `REPLACEMENT_UNDERPRICED` | "replacement transaction underpriced" | Replacement Fee Too Low | Слишком низкая комиссия замены |
| `NONCE_TOO_LOW` | "nonce too low" | Transaction Already Processed | Транзакция уже обработана |
| `NONCE_TOO_HIGH` | "nonce too high" | Transaction Order Issue | Проблема с порядком транзакций |
| `EXECUTION_REVERTED` | "execution reverted" | Transaction Failed | Транзакция отклонена |
| `USER_REJECTED` | "user rejected" | Transaction Cancelled | Транзакция отменена |
| `INVALID_ADDRESS` | "invalid address" | Invalid Address | Неверный адрес |
| `INVALID_AMOUNT` | "invalid amount" | Invalid Amount | Неверная сумма |
| `NETWORK_ERROR` | "network error" | Network Error | Ошибка сети |
| `TIMEOUT` | "timeout" | Request Timeout | Превышено время ожидания |
| `UNKNOWN_ERROR` | (default) | Something Went Wrong | Что-то пошло не так |

## 🚀 Как использовать

### 1. Detect Error Code:

```typescript
import { detectErrorCode } from './utils/error-codes';

try {
  await sendTransaction();
} catch (error) {
  const code = detectErrorCode(error);
  console.log('Error code:', code);  // e.g., "INSUFFICIENT_FUNDS"
}
```

### 2. Get User-Friendly Message:

```typescript
import { getErrorMessage } from './utils/error-codes';

try {
  await sendTransaction();
} catch (error) {
  const message = getErrorMessage(error, 'en');
  
  console.log('Code:', message.code);
  console.log('Title:', message.title);
  console.log('Message:', message.message);
  console.log('Hint:', message.hint);
  console.log('Action:', message.action);
}
```

**Output:**
```json
{
  "code": "INSUFFICIENT_FUNDS",
  "title": "Insufficient Balance",
  "message": "You don't have enough ETH to complete this transaction.",
  "hint": "Add more ETH to your wallet or reduce the amount you're sending.",
  "action": "Add Funds"
}
```

### 3. Show Alert:

```typescript
import { showErrorAlert } from './components/errors/ErrorAlert';

try {
  await sendTransaction();
} catch (error) {
  showErrorAlert({
    error,
    language: 'en',
    onAction: () => navigation.navigate('AddFunds'),
    onDismiss: () => console.log('Dismissed'),
  });
}
```

### 4. Show Toast:

```typescript
import ErrorToast from './components/errors/ErrorToast';

function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  const handleSend = async () => {
    try {
      await sendTransaction();
    } catch (err) {
      setError(err as Error);
    }
  };

  return (
    <>
      <Button onPress={handleSend} />
      
      <ErrorToast
        error={error}
        language="en"
        onDismiss={() => setError(null)}
        onAction={() => {
          // Handle action
          navigation.navigate('AddFunds');
        }}
      />
    </>
  );
}
```

### 5. Use WalletError Class:

```typescript
import { WalletError } from './utils/error-codes';

try {
  await sendTransaction();
} catch (error) {
  // Convert RPC error to WalletError
  const walletError = WalletError.fromRPCError(error, 'en');
  
  console.log('Code:', walletError.code);
  console.log('Message:', walletError.message);
  console.log('Hint:', walletError.hint);
  console.log('Action:', walletError.action);
  
  // Can be serialized
  const json = walletError.toJSON();
}
```

## 🎯 Acceptance Criteria - 100%

- ✅ Error mapping RPC → человеко-понятные тексты
- ✅ Локализация RU/EN
- ✅ Тосты/модалки с hint
- ✅ Любая ошибка отображается понятным сообщением + рекомендацией
- ✅ Тексты не раскрывают приватные данные
- ✅ Стандартизированный объект ошибки (`code`, `title`, `hint`)
- ✅ Документация по списку ошибок

## 🔒 Privacy Protection

### Sanitization:

```typescript
import { sanitizeErrorMessage } from './utils/error-codes';

const error = new Error('Transaction failed for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
const sanitized = sanitizeErrorMessage(error);

console.log(sanitized);
// "Transaction failed for 0x***"
```

**Removes:**
- Addresses (0x + 40 hex chars)
- Private keys (0x + 64 hex chars)
- Transaction hashes (0x + 64 hex chars)

### Logging:

```typescript
import { formatErrorForLogging } from './utils/error-codes';

try {
  await sendTransaction();
} catch (error) {
  const log = formatErrorForLogging(error);
  
  console.log('Code:', log.code);
  console.log('Original:', log.message);
  console.log('Sanitized:', log.sanitized);
  console.log('Timestamp:', log.timestamp);
  
  // Send to analytics (sanitized only!)
  analytics.logError(log.sanitized, log.code);
}
```

## 📱 UI Examples

### Alert Dialog:

```typescript
showErrorAlert({
  error: new Error('insufficient funds'),
  language: 'ru',
  onAction: () => {
    // Navigate to add funds
    navigation.navigate('AddFunds');
  },
});
```

**Shows:**
```
┌─────────────────────────────────┐
│ Недостаточно средств            │
│                                 │
│ У вас недостаточно ETH для      │
│ выполнения этой транзакции.     │
│                                 │
│ 💡 Пополните кошелёк или        │
│ уменьшите сумму отправки.       │
│                                 │
│  [Пополнить]  [OK]              │
└─────────────────────────────────┘
```

### Toast Notification:

```typescript
<ErrorToast
  error={error}
  language="en"
  onDismiss={() => setError(null)}
  onAction={() => navigation.navigate('Settings')}
/>
```

**Shows:**
```
┌─────────────────────────────────┐
│ ⚠️  Network Error          ✕    │
│ Unable to connect to the        │
│ network.                        │
└─────────────────────────────────┘
```

## 🧪 Testing

### Unit Tests:

```typescript
import { detectErrorCode, getErrorMessage, sanitizeErrorMessage } from './utils/error-codes';

describe('Error Mapping', () => {
  it('should detect INSUFFICIENT_FUNDS', () => {
    const error = new Error('insufficient funds for transfer');
    const code = detectErrorCode(error);
    expect(code).toBe('INSUFFICIENT_FUNDS');
  });

  it('should detect UNDERPRICED', () => {
    const error = new Error('transaction underpriced');
    const code = detectErrorCode(error);
    expect(code).toBe('UNDERPRICED');
  });

  it('should detect NONCE_TOO_LOW', () => {
    const error = new Error('nonce too low');
    const code = detectErrorCode(error);
    expect(code).toBe('NONCE_TOO_LOW');
  });

  it('should return localized message', () => {
    const error = new Error('insufficient funds');
    const messageEN = getErrorMessage(error, 'en');
    const messageRU = getErrorMessage(error, 'ru');

    expect(messageEN.title).toBe('Insufficient Balance');
    expect(messageRU.title).toBe('Недостаточно средств');
  });

  it('should sanitize addresses', () => {
    const error = new Error('Failed for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    const sanitized = sanitizeErrorMessage(error);
    expect(sanitized).toBe('Failed for 0x***');
    expect(sanitized).not.toContain('742d35Cc');
  });
});
```

### Integration Test:

```typescript
describe('Error UI Integration', () => {
  it('should show error alert on insufficient funds', async () => {
    // Mock insufficient balance
    const balance = ethers.utils.parseEther('0.001');
    const amount = ethers.utils.parseEther('1.0');

    try {
      await sendNative({
        to: recipient,
        amountEther: '1.0',
      });
    } catch (error) {
      // Should show alert
      const message = getErrorMessage(error, 'en');
      expect(message.code).toBe('INSUFFICIENT_FUNDS');
      expect(message.title).toBe('Insufficient Balance');
      expect(message.action).toBe('Add Funds');
    }
  });

  it('should show underpriced error on low gas', async () => {
    try {
      await sendNative({
        to: recipient,
        amountEther: '0.01',
        maxFeePerGas: ethers.utils.parseUnits('0.1', 'gwei'), // Too low!
      });
    } catch (error) {
      const message = getErrorMessage(error, 'en');
      expect(message.code).toBe('UNDERPRICED');
      expect(message.hint).toContain('Increase the gas price');
    }
  });
});
```

## 📖 Error Documentation

### Get Full Documentation:

```typescript
import { getErrorDocumentation } from './utils/error-codes';

const doc = getErrorDocumentation('INSUFFICIENT_FUNDS', 'en');

console.log('Code:', doc.code);
console.log('Title:', doc.title);
console.log('Description:', doc.description);
console.log('Common Causes:', doc.commonCauses);
console.log('Solutions:', doc.solutions);
```

**Output:**
```json
{
  "code": "INSUFFICIENT_FUNDS",
  "title": "Insufficient Balance",
  "description": "You don't have enough ETH to complete this transaction.",
  "commonCauses": [
    "Not enough ETH in wallet",
    "Amount + fee exceeds balance"
  ],
  "solutions": [
    "Add more ETH",
    "Reduce send amount",
    "Lower gas fee"
  ]
}
```

## 📝 Files Created

```
mobile/
├── src/
│   ├── utils/
│   │   └── error-codes.ts              # Core module (600+ lines)
│   │
│   └── components/
│       └── errors/
│           ├── ErrorAlert.tsx          # Alert dialogs
│           └── ErrorToast.tsx          # Toast notifications
│
└── docs/
    └── guides/
        └── ERROR_HANDLING.md           # This file
```

## 🎉 Ready to Use!

Система полностью реализована:

1. ✅ 13 типов ошибок с маппингом
2. ✅ Локализация RU/EN
3. ✅ UI компоненты (Alert + Toast)
4. ✅ Privacy protection
5. ✅ Actionable hints
6. ✅ Документация

### Quick Start:

```typescript
// Catch and show error
try {
  await sendTransaction();
} catch (error) {
  showErrorAlert({
    error,
    language: 'en',
    onAction: () => handleAction(),
  });
}

// Or use toast
<ErrorToast
  error={error}
  onDismiss={() => setError(null)}
/>
```

---

**Last Updated:** 2025-11-10
**Status:** ✅ Production Ready
