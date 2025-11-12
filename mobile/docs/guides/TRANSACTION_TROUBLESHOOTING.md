# 🔧 Transaction Troubleshooting Guide

## ❌ Transaction Reverted (Failed)

### Что это значит?
Транзакция была **отправлена в сеть** и **включена в блок**, но **откатилась** (reverted) при выполнении. Это означает, что:
- ✅ Транзакция валидна
- ✅ Gas fee был оплачен
- ❌ Но выполнение провалилось

### Основные причины:

#### 1. **Недостаточный Gas Limit** 🔥
**Симптомы:**
- Транзакция reverted
- В Etherscan: "Out of gas"

**Решение:**
```typescript
// Увеличь gas limit вручную
await sendNative({
  to: recipient,
  amountEther: '0.01',
  gasLimit: BigNumber.from(50000), // Увеличь с 21000 до 50000
});
```

**Почему происходит:**
- Получатель - контракт, который требует больше газа
- Сложная логика в контракте

#### 2. **Получатель - контракт** 📜
**Симптомы:**
- Отправка на адрес контракта
- Контракт отклоняет транзакцию

**Как проверить:**
```typescript
const provider = getProvider();
const code = await provider.getCode(recipientAddress);

if (code !== '0x') {
  console.log('⚠️ Это контракт, не обычный кошелёк!');
}
```

**Решение:**
- Убедись, что контракт принимает ETH (имеет `receive()` или `fallback()`)
- Или используй специальную функцию контракта

#### 3. **Контракт с логикой отклонения** 🚫
**Примеры:**
- Multisig wallet (требует подписи)
- Контракт с whitelist
- Контракт с паузой

**Решение:**
- Проверь требования контракта
- Используй правильную функцию контракта

#### 4. **Nonce проблемы** 🔢
**Симптомы:**
- "Nonce too low"
- "Nonce too high"

**Решение:**
```typescript
// Дождись подтверждения предыдущих транзакций
// Или используй pending nonce
const nonce = await provider.getTransactionCount(address, 'pending');
```

#### 5. **Недостаточный баланс для газа** 💰
**Симптомы:**
- "Insufficient funds for gas"

**Решение:**
- Проверь баланс ETH (не токенов!)
- Убедись, что хватает на amount + gas fee

```typescript
const balance = await provider.getBalance(address);
const totalRequired = amount.add(gasLimit.mul(maxFeePerGas));

if (balance.lt(totalRequired)) {
  console.error('Недостаточно ETH для газа!');
}
```

## 🔍 Как диагностировать проблему

### 1. Проверь транзакцию в Etherscan

**Sepolia:**
```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

**Mainnet:**
```
https://etherscan.io/tx/YOUR_TX_HASH
```

### 2. Посмотри на статус

**Status: Success ✅**
- Транзакция выполнена успешно

**Status: Fail ❌**
- Транзакция откатилась
- Смотри "Error Message" для деталей

### 3. Проверь Gas Used

```
Gas Used: 21,000 / 21,000 (100%)
```
- Если 100% - возможно, недостаточно газа
- Если меньше - другая проблема

### 4. Проверь получателя

```typescript
// Это контракт?
const code = await provider.getCode(recipientAddress);
console.log('Contract code:', code);

// 0x = обычный кошелёк (EOA)
// Длинная строка = контракт
```

## 🛠️ Решения

### Увеличить Gas Limit

```typescript
// Для обычного перевода: 21,000
// Для контракта: 50,000 - 100,000+

await sendNative({
  to: recipient,
  amountEther: '0.01',
  gasLimit: BigNumber.from(100000), // Увеличено
});
```

### Увеличить Gas Price

```typescript
// Используй 'high' fee level
await sendNative({
  to: recipient,
  amountEther: '0.01',
  feeLevel: 'high', // Вместо 'medium'
});
```

### Проверить баланс перед отправкой

```typescript
const balance = await getETHBalance(address);
const amount = ethers.utils.parseEther('0.01');
const gasEstimate = await estimateGasForETH(recipient, '0.01');
const totalFee = gasEstimate.medium.gasLimit.mul(gasEstimate.medium.maxFeePerGas!);
const totalRequired = amount.add(totalFee);

if (balance.lt(totalRequired)) {
  throw new Error(`Insufficient balance. Need ${ethers.utils.formatEther(totalRequired)} ETH`);
}
```

## 📊 Типичные ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Transaction reverted` | Контракт отклонил | Проверь логику контракта |
| `Out of gas` | Недостаточно gas limit | Увеличь gas limit |
| `Insufficient funds` | Мало ETH | Пополни баланс |
| `Nonce too low` | Nonce уже использован | Дождись подтверждения |
| `Replacement underpriced` | Gas price слишком низкий | Увеличь gas price |

## 🧪 Тестирование

### Тест 1: Обычный перевод (EOA → EOA)
```typescript
// Должно работать с gas limit 21,000
await sendNative({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amountEther: '0.001',
  feeLevel: 'medium',
});
```

### Тест 2: Перевод на контракт
```typescript
// Может потребовать больше газа
await sendNative({
  to: contractAddress,
  amountEther: '0.001',
  gasLimit: BigNumber.from(100000), // Увеличено
  feeLevel: 'high',
});
```

### Тест 3: Минимальная сумма
```typescript
// Проверь, что хватает на газ
await sendNative({
  to: recipient,
  amountEther: '0.0001',
  feeLevel: 'low',
});
```

## 🆘 Если ничего не помогает

### 1. Проверь сеть
```typescript
const network = await getSelectedNetwork();
console.log('Current network:', network);
```

### 2. Проверь RPC
```typescript
const provider = getProvider();
const blockNumber = await provider.getBlockNumber();
console.log('Connected to block:', blockNumber);
```

### 3. Попробуй другой RPC
```
# В .env
EXPO_PUBLIC_ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 4. Проверь логи
```bash
# Смотри консоль в Expo
# Ищи ошибки с префиксом ❌ или 🔴
```

## 📝 Чеклист перед отправкой

- [ ] Адрес получателя валиден (checksummed)
- [ ] Достаточно ETH для amount + gas
- [ ] Сумма > 0
- [ ] Если получатель - контракт, увеличен gas limit
- [ ] Выбран правильный network
- [ ] RPC работает (проверь block number)
- [ ] Нет pending транзакций с тем же nonce

## 🔗 Полезные ссылки

- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [Gas Tracker](https://etherscan.io/gastracker)
- [Alchemy Status](https://status.alchemy.com/)

---

**Last Updated:** 2025-11-10
