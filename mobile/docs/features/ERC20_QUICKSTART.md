# 🪙 ERC-20 Token Support - Quick Start

## ✅ Что реализовано

### Core Functionality
- ✅ **ERC-20 ABI** - минимальный набор функций
- ✅ **Token Metadata** - symbol, name, decimals
- ✅ **Balance Checking** - в BigNumber и форматированный
- ✅ **Token Transfer** - с поддержкой "молчаливых" токенов
- ✅ **Gas Estimation** - автоматическая оценка
- ✅ **UI** - полноценный экран отправки

### Поддержка "молчаливых" токенов
- ✅ Токены без `returns (bool)` в `transfer()`
- ✅ Не падает на `undefined/false` при успешной транзакции
- ✅ Корректная обработка всех типов ERC-20

## 🚀 Как использовать

### В коде:

```typescript
import { sendErc20, getErc20Meta, getErc20Balance } from './wallet/erc20';

// Получить метаданные токена
const metadata = await getErc20Meta(tokenAddress);
console.log(metadata.symbol, metadata.decimals);

// Проверить баланс
const balance = await getErc20Balance(tokenAddress, userAddress);
console.log('Balance:', formatTokenAmount(balance, metadata.decimals));

// Отправить токены (human-readable)
const result = await sendErc20({
  token: tokenAddress,
  to: recipientAddress,
  amountHuman: '10.5', // Автоматически конвертируется по decimals
  feeLevel: 'medium',
});

// Или отправить в smallest units
const result = await sendErc20({
  token: tokenAddress,
  to: recipientAddress,
  amountUnits: ethers.utils.parseUnits('10.5', decimals),
  feeLevel: 'high',
});
```

### В UI:

```typescript
// Открыть экран отправки токенов
navigation.navigate('SendToken');

// Или с предзаполненным адресом токена
navigation.navigate('SendToken', { 
  tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // USDC
});
```

## 📱 UI Features

### SendTokenScreen
1. **Token Selection**
   - Ввод адреса контракта
   - Быстрый выбор из популярных токенов (USDC, USDT)
   - Автоматическая загрузка метаданных
   - Отображение баланса

2. **Transfer Form**
   - Валидация адреса получателя (EIP-55)
   - Ввод суммы в human-readable формате
   - Проверка достаточности баланса
   - Выбор уровня комиссии (Low/Medium/High)

3. **Transaction Status**
   - Индикатор отправки
   - Hash транзакции
   - Ссылка на explorer

## 🧪 Тестирование

### Тестовые токены на Sepolia:

**USDC (Sepolia):**
```
Address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Symbol: USDC
Decimals: 6
```

**USDT (Sepolia):**
```
Address: 0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0
Symbol: USDT
Decimals: 6
```

### Как получить тестовые токены:

1. **Faucet для USDC:**
   ```
   https://faucet.circle.com/
   ```

2. **Или используй любой ERC-20 на Sepolia**
   - Найди контракт на Sepolia Etherscan
   - Скопируй адрес
   - Вставь в приложение

### Тестовый сценарий:

```bash
# 1. Открой приложение
npm start

# 2. Перейди на SendToken экран
# 3. Введи адрес токена (например, USDC)
# 4. Дождись загрузки метаданных
# 5. Введи адрес получателя
# 6. Введи сумму (например, 1.5)
# 7. Выбери Medium gas fee
# 8. Нажми "Send USDC"
# 9. Проверь транзакцию в Etherscan
```

## 📊 API Reference

### `getErc20Meta(tokenAddress, network?)`
Получить метаданные токена.

**Returns:**
```typescript
{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}
```

### `getErc20Balance(tokenAddress, address, network?)`
Получить баланс токена (в smallest units).

**Returns:** `BigNumber`

### `getErc20BalanceFormatted(tokenAddress, address, network?)`
Получить баланс с форматированием.

**Returns:**
```typescript
{
  balance: BigNumber;
  balanceFormatted: string;
  decimals: number;
}
```

### `sendErc20(params)`
Отправить ERC-20 токены.

**Params:**
```typescript
{
  token: string;              // Contract address
  to: string;                 // Recipient
  amountUnits?: BigNumber;    // Amount in smallest units
  amountHuman?: string;       // Amount in human format
  feeLevel?: 'low' | 'medium' | 'high';
  gasLimit?: BigNumber;
  maxFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;
  network?: Network;
}
```

**Returns:**
```typescript
{
  hash: string;
  nonce: number;
  from: string;
  to: string;
  token: string;
  value: string;              // Human-readable
  valueUnits: BigNumber;      // Smallest units
  gasEstimate: GasEstimate;
  timestamp: number;
  response: TransactionResponse;
}
```

## 🔍 Decimals Conversion

### Human → Smallest Units:
```typescript
import { parseTokenAmount } from './wallet/erc20';

// USDC (6 decimals): "10.5" → 10500000
const amount = parseTokenAmount('10.5', 6);
console.log(amount.toString()); // "10500000"

// DAI (18 decimals): "1.0" → 1000000000000000000
const amount = parseTokenAmount('1.0', 18);
console.log(amount.toString()); // "1000000000000000000"
```

### Smallest Units → Human:
```typescript
import { formatTokenAmount } from './wallet/erc20';

// USDC: 10500000 → "10.5"
const formatted = formatTokenAmount(BigNumber.from(10500000), 6);
console.log(formatted); // "10.5"

// DAI: 1000000000000000000 → "1.0"
const formatted = formatTokenAmount(
  BigNumber.from('1000000000000000000'), 
  18
);
console.log(formatted); // "1.0"
```

## ⚠️ Error Handling

### Custom Errors:

```typescript
try {
  await sendErc20({ token, to, amountHuman: '10' });
} catch (error) {
  if (error instanceof InvalidTokenAddressError) {
    console.error('Invalid token address');
  } else if (error instanceof InsufficientTokenBalanceError) {
    console.error('Not enough tokens');
  } else if (error instanceof TokenError) {
    console.error('Token error:', error.message);
  }
}
```

### Common Errors:

- `INVALID_TOKEN_ADDRESS` - невалидный адрес контракта
- `TOKEN_METADATA_ERROR` - не удалось загрузить метаданные
- `INSUFFICIENT_TOKEN_BALANCE` - недостаточно токенов
- `INSUFFICIENT_GAS` - недостаточно ETH для газа
- `NONCE_TOO_LOW` - nonce уже использован
- `UNDERPRICED` - слишком низкая цена газа
- `TRANSFER_FAILED` - транзакция провалилась

## 🎯 Acceptance Criteria

### ✅ Completed:
- ✅ Минимальный ERC-20 ABI создан
- ✅ `getErc20Meta()` возвращает symbol и decimals
- ✅ `getErc20Balance()` возвращает баланс в BigNumber
- ✅ `sendErc20()` поддерживает amountHuman и amountUnits
- ✅ Автоматическая конвертация по decimals
- ✅ Поддержка токенов без `returns (bool)`
- ✅ UI с выбором токена и отправкой
- ✅ Корректное форматирование сумм
- ✅ Ссылки на explorer

### 🔜 Next Steps:
- [ ] Юнит-тесты для форматирования
- [ ] Интеграционные тесты на Sepolia
- [ ] Добавить больше популярных токенов
- [ ] Кэширование метаданных токенов
- [ ] История транзакций токенов

## 📝 Files Created

```
mobile/
├── src/
│   ├── abi/
│   │   └── erc20.json                 # ERC-20 ABI
│   │
│   ├── wallet/
│   │   └── erc20.ts                   # Core ERC-20 functions
│   │
│   └── features/
│       └── send/
│           └── SendTokenScreen.tsx    # UI for sending tokens
│
└── docs/
    └── features/
        └── ERC20_QUICKSTART.md        # This file
```

## 🔗 Links

- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Circle USDC Faucet](https://faucet.circle.com/)

---

**Last Updated:** 2025-11-10
**Status:** ✅ Ready for Testing
