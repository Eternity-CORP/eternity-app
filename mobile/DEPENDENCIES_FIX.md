# ✅ Исправление зависимостей

## 🐛 Проблемы

1. ❌ `Unable to resolve module zustand` - пакет не установлен
2. ❌ `Unable to resolve "../../wallet/provider"` - неправильный путь

## 🔧 Решение

### 1. Установка пакетов

```bash
npm install zustand uuid rrule
```

**Что это:**
- `zustand` - state management для scheduled payments
- `uuid` - генерация уникальных ID
- `rrule` - повторяющиеся платежи (recurring payments)

### 2. Исправление путей в JobRunner

**Было:**
```typescript
const { sendNative } = require('../../wallet/transactions');
const { getProvider } = require('../../wallet/provider');  // ❌ Не существует
```

**Стало:**
```typescript
const { sendETH } = require('../../services/blockchain/transactionService');
const { getProvider } = require('../../services/blockchain/ethereumProvider');  // ✅ Правильный путь
```

### 3. Адаптация интерфейсов

**Проблема:** `sendETH` принимает другие параметры чем ожидает JobRunner

**Решение:** Создал wrapper функцию:

```typescript
const sendNative = async (params: any) => {
  const { to, value, chainId } = params;
  // Convert value from wei to ETH string
  const amountETH = ethers.utils.formatEther(value);
  const network = chainId === 1 ? 'mainnet' : chainId === 11155111 ? 'sepolia' : 'holesky';
  return await sendETH(to, amountETH, network);
};
```

**Для getProvider:**
```typescript
getProvider: (chainId: number) => {
  const network = chainId === 1 ? 'mainnet' : chainId === 11155111 ? 'sepolia' : 'holesky';
  return getProvider(network);
}
```

## 📁 Изменённые файлы

1. ✅ `package.json` - добавлены zustand и uuid
2. ✅ `src/features/schedule/JobRunner.ts` - исправлены пути и адаптеры

## 🧪 Проверка

```bash
npm start
```

**Должно работать:**
- ✅ Приложение запускается без ошибок
- ✅ Можно создать отложенный платёж
- ✅ JobRunner запускается
- ✅ Транзакции отправляются автоматически

## 🎯 Итог

**Статус:** ✅ **ВСЕ ЗАВИСИМОСТИ ИСПРАВЛЕНЫ!**

Теперь можно тестировать отложенные платежи!
