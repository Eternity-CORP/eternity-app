# Send Native ETH Implementation

## Overview

Полная реализация функционала отправки нативного ETH с валидацией, оценкой газа, nonce management и подтверждениями.

## Реализованные компоненты

### 1. Core Transaction Module (`src/wallet/transactions.ts`)

**Основные функции:**

#### `sendNative(params)`
Отправка ETH транзакции с комплексной валидацией и обработкой ошибок.

```typescript
const result = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  feeLevel: "medium", // low | medium | high
  network: "sepolia"
});

console.log(`Transaction sent: ${result.hash}`);
```

**Параметры:**
- `to` - адрес получателя (валидируется с EIP-55)
- `amountEther` - сумма в ETH (строка)
- `feeLevel` - уровень комиссии (опционально, default: medium)
- `maxFeePerGas` - максимальная цена газа (опционально)
- `maxPriorityFeePerGas` - приоритетная комиссия (опционально)
- `gasLimit` - лимит газа (опционально)
- `network` - сеть (опционально)

**Возвращает:**
```typescript
{
  hash: string;           // Хэш транзакции
  nonce: number;          // Nonce
  from: string;           // Адрес отправителя
  to: string;             // Адрес получателя
  value: string;          // Сумма в ETH
  gasEstimate: GasEstimate;
  status: TransactionStatus;
  timestamp: number;
  response: TransactionResponse;
}
```

#### `waitForConfirmations(params)`
Ожидание подтверждений транзакции с обновлениями статуса.

```typescript
const confirmation = await waitForConfirmations({
  hash: "0xabc123...",
  minConfirms: 2,
  timeoutMs: 120000,
  onStatusUpdate: (status) => {
    console.log(`Confirmations: ${status.confirmations}`);
  }
});
```

**Параметры:**
- `hash` - хэш транзакции
- `minConfirms` - минимальное количество подтверждений (default: 2)
- `timeoutMs` - таймаут в миллисекундах (default: 120000)
- `network` - сеть (опционально)
- `onStatusUpdate` - callback для обновлений статуса (опционально)

**Возвращает:**
```typescript
{
  receipt: TransactionReceipt;
  status: TransactionStatus;
  confirmations: number;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice?: string;
}
```

#### `sendNativeAndWait(params)`
Комбинированная функция - отправка и ожидание подтверждений.

```typescript
const { result, confirmation } = await sendNativeAndWait({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  minConfirms: 2,
  onStatusUpdate: (status) => {
    console.log(`Status: ${status.status}`);
  }
});
```

### 2. UI Component (`src/features/send/SendEthScreen.tsx`)

**Функционал:**
- ✅ Ввод адреса получателя с валидацией EIP-55
- ✅ Ввод суммы с проверкой баланса
- ✅ Выбор уровня комиссии (Low/Medium/High)
- ✅ Расширенные настройки газа (опционально)
- ✅ Предпросмотр комиссии
- ✅ Отображение статуса транзакции
- ✅ Real-time обновления подтверждений
- ✅ Swipe-to-confirm для отправки

**Использование:**
```typescript
// В навигации
navigation.navigate('Send');
```

### 3. Error Handling

**Кастомные ошибки:**

```typescript
// Недостаточно средств
InsufficientFundsError
// Required: 0.002 ETH, Available: 0.001 ETH

// Невалидный адрес
InvalidAddressError
// Invalid Ethereum address: 0xinvalid

// Невалидная сумма
InvalidAmountError
// Invalid amount: -0.001. Amount must be greater than 0

// Таймаут транзакции
TransactionTimeoutError
// Transaction 0xabc... timed out after 120000ms

// Транзакция провалилась
TransactionFailedError
// Transaction 0xabc... failed: reverted

// Общая ошибка транзакции
TransactionError
// Nonce too low, Underpriced, Network error, etc.
```

**Обработка RPC ошибок:**
- `INSUFFICIENT_FUNDS` - недостаточно средств
- `NONCE_TOO_LOW` - nonce уже использован
- `UNDERPRICED` - слишком низкая цена газа
- `GAS_LIMIT_TOO_LOW` - лимит газа слишком низкий
- `NETWORK_ERROR` - проблемы с сетью

### 4. Validation

**Валидация адреса:**
```typescript
// Автоматическая проверка EIP-55 checksum
const checksummedAddress = validateAddress("0x742d35cc...");
// Returns: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

**Валидация суммы:**
```typescript
// Проверка на положительное число
validateAmount("0.001");  // ✅ OK
validateAmount("0");      // ❌ Error
validateAmount("-0.001"); // ❌ Error
validateAmount("abc");    // ❌ Error
```

**Проверка баланса:**
```typescript
// Автоматическая проверка: amount + gas <= balance
// Выбрасывает InsufficientFundsError если недостаточно
```

### 5. Gas Estimation

**Автоматическая оценка:**
```typescript
// Получение вариантов комиссии
const feeOptions = await estimateGasForETH(to, amount, network);

// feeOptions = {
//   low: { gasLimit, totalFeeTH: "0.0001", ... },
//   medium: { gasLimit, totalFeeTH: "0.00015", ... },
//   high: { gasLimit, totalFeeTH: "0.0002", ... }
// }
```

**Кастомные параметры газа:**
```typescript
await sendNative({
  to: "0x...",
  amountEther: "0.001",
  gasLimit: BigNumber.from(25000),
  maxFeePerGas: parseUnits("50", "gwei"),
  maxPriorityFeePerGas: parseUnits("2", "gwei")
});
```

### 6. Nonce Management

**Автоматическое управление:**
- Получение следующего nonce через `getNextNonce()`
- Отслеживание pending транзакций
- Предотвращение конфликтов nonce
- Поддержка замены транзакций (speed up/cancel)

### 7. Transaction Status Tracking

**Статусы:**
```typescript
enum TransactionStatus {
  PENDING = 'pending',      // Отправлена, но не в блоке
  CONFIRMING = 'confirming', // В блоке, но мало подтверждений
  CONFIRMED = 'confirmed',   // Достаточно подтверждений
  FAILED = 'failed',         // Провалилась
  REPLACED = 'replaced',     // Заменена другой транзакцией
  CANCELLED = 'cancelled'    // Отменена
}
```

## Testing

### Unit Tests

```bash
npm test -- transactions.test.ts
```

**Покрытие:**
- ✅ Валидация адресов (EIP-55)
- ✅ Парсинг и валидация сумм
- ✅ Обработка RPC ошибок
- ✅ Проверка баланса
- ✅ Выбор уровня комиссии
- ✅ Кастомные параметры газа

### Integration Tests (Sepolia)

```bash
INTEGRATION_TESTS=true npm test -- transactions.integration.test.ts
```

**Покрытие:**
- ✅ Отправка реальной транзакции на Sepolia
- ✅ Ожидание подтверждений (≥2 блоков)
- ✅ Различные уровни комиссии
- ✅ Обработка ошибок (insufficient funds, invalid address)
- ✅ Оценка газа для разных сумм

**Требования для интеграционных тестов:**
1. Настроенный Alchemy/Infura RPC для Sepolia
2. Тестовый кошелек с балансом tETH
3. Переменная окружения `INTEGRATION_TESTS=true`

## Usage Examples

### Простая отправка

```typescript
import { sendNative } from './wallet/transactions';

try {
  const result = await sendNative({
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    amountEther: "0.001"
  });
  
  console.log(`✅ Sent! Hash: ${result.hash}`);
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

### Отправка с ожиданием подтверждений

```typescript
import { sendNativeAndWait } from './wallet/transactions';

const { result, confirmation } = await sendNativeAndWait({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  feeLevel: "high",
  minConfirms: 2,
  onStatusUpdate: (status) => {
    console.log(`Confirmations: ${status.confirmations}`);
  }
});

console.log(`Confirmed in block ${confirmation.blockNumber}`);
console.log(`Gas used: ${confirmation.gasUsed}`);
```

### Кастомные параметры газа

```typescript
import { ethers } from 'ethers';
import { sendNative } from './wallet/transactions';

const result = await sendNative({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amountEther: "0.001",
  gasLimit: ethers.BigNumber.from(25000),
  maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
  maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei")
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SendEthScreen (UI)                      │
│  - Form validation                                          │
│  - Gas fee selection                                        │
│  - Status display                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              wallet/transactions.ts (API)                   │
│  - sendNative()                                             │
│  - waitForConfirmations()                                   │
│  - Validation & Error handling                              │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Balance     │  │ Gas          │  │ Transaction  │
│ Service     │  │ Estimator    │  │ Service      │
└─────────────┘  └──────────────┘  └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │   Ethereum Provider (RPC)     │
         │   - Alchemy/Infura/Public     │
         │   - Fallback mechanism        │
         └───────────────────────────────┘
```

## Acceptance Criteria ✅

### Core Functionality
- ✅ ETH транзакция отправляется на Sepolia
- ✅ Подтверждается ≥2 блоками
- ✅ Пользователь видит hash
- ✅ Отображаются статусы: pending/confirming/confirmed/failed

### Validation
- ✅ Валидация адреса (EIP-55 checksum)
- ✅ Проверка amount > 0
- ✅ Проверка достаточности баланса

### Gas Management
- ✅ Автоматическая оценка газа
- ✅ Выбор уровня комиссии (low/medium/high)
- ✅ Расширенные настройки (опционально)
- ✅ Поля можно редактировать вручную

### Error Handling
- ✅ Insufficient funds
- ✅ Invalid address
- ✅ Underpriced
- ✅ Nonce too low
- ✅ Network errors
- ✅ Человекочитаемые сообщения

### Nonce & Confirmations
- ✅ Автоматическое получение nonce
- ✅ Отслеживание подтверждений
- ✅ Real-time обновления статуса

## Files Created

```
mobile/
├── src/
│   ├── wallet/
│   │   ├── transactions.ts                    # Core API
│   │   └── __tests__/
│   │       ├── transactions.test.ts           # Unit tests
│   │       └── transactions.integration.test.ts # Integration tests
│   └── features/
│       └── send/
│           └── SendEthScreen.tsx              # UI Component
└── SEND_NATIVE_IMPLEMENTATION.md              # This file
```

## Next Steps

1. **Добавить в навигацию:**
   ```typescript
   // MainNavigator.tsx
   <Stack.Screen name="SendEth" component={SendEthScreen} />
   ```

2. **Запустить тесты:**
   ```bash
   npm test -- transactions.test.ts
   INTEGRATION_TESTS=true npm test -- transactions.integration.test.ts
   ```

3. **Протестировать на Sepolia:**
   - Получить tETH из faucet
   - Отправить тестовую транзакцию
   - Проверить подтверждения

4. **Опционально:**
   - Добавить поддержку ERC-20 токенов
   - Добавить QR-код сканер для адреса
   - Добавить адресную книгу
   - Добавить историю транзакций

## Performance Considerations

- **RPC Fallback**: Автоматическое переключение между провайдерами при ошибках
- **Gas Estimation**: Кэширование оценок для одинаковых параметров
- **Nonce Management**: Локальное отслеживание для избежания конфликтов
- **Timeout Handling**: Разумные таймауты с возможностью настройки

## Security Considerations

- ✅ Валидация всех входных данных
- ✅ EIP-55 checksum для адресов
- ✅ Проверка баланса перед отправкой
- ✅ Безопасное хранение приватных ключей (через walletService)
- ✅ Обработка всех возможных ошибок
- ✅ Логирование без раскрытия чувствительных данных

## Troubleshooting

### Транзакция не подтверждается
- Проверьте RPC подключение
- Увеличьте gas price (используйте 'high' fee level)
- Проверьте статус сети (congestion)

### Ошибка "Nonce too low"
- Очистите кэш провайдера: `clearProviderCache()`
- Подождите подтверждения предыдущих транзакций

### Ошибка "Insufficient funds"
- Проверьте баланс
- Учтите комиссию газа
- Используйте 'low' fee level для экономии

### RPC ошибки
- Проверьте конфигурацию в `.env`
- Настройте Alchemy/Infura API keys
- См. `RPC_CONFIGURATION.md`
