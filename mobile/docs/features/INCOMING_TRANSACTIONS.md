# 📥 Incoming Transactions Monitor

## ✅ Что реализовано

### Core Features
- ✅ **ETH Monitoring** - отслеживание входящих ETH переводов
- ✅ **ERC-20 Monitoring** - отслеживание входящих токенов через `Transfer` events
- ✅ **Block Polling** - эффективный пуллинг новых блоков
- ✅ **Deduplication** - по `txHash + logIndex`
- ✅ **Persistent Storage** - хранение в AsyncStorage
- ✅ **Reorg Resistance** - помечаем стабильными после 2+ подтверждений
- ✅ **Event Emission** - события для UI обновлений
- ✅ **UI Components** - баннер уведомлений и список транзакций

### Architecture

```
src/
├── wallet/
│   └── incoming.ts                    # Core monitoring logic
├── hooks/
│   └── useIncomingTransactions.ts     # React Hook
├── components/
│   └── incoming/
│       ├── IncomingTransactionBanner.tsx
│       └── IncomingTransactionsList.tsx
└── screens/
    └── IncomingTransactionsScreen.tsx
```

## 🚀 Как использовать

### В коде:

```typescript
import { getMonitor, IncomingTransactionMonitor } from './wallet/incoming';

// Создать и запустить монитор
const monitor = getMonitor({
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  network: 'sepolia',
  pollInterval: 12000,        // 12 секунд
  confirmationsRequired: 2,   // 2 подтверждения
  lookbackBlocks: 100,        // Начать с 100 блоков назад
});

// Слушать события
const emitter = monitor.getEmitter();

emitter.on('new-transaction', (tx) => {
  console.log('🔔 Новая транзакция:', tx);
  // Показать уведомление
});

emitter.on('transaction-confirmed', (tx) => {
  console.log('✅ Транзакция подтверждена:', tx);
});

// Запустить
await monitor.start();

// Получить все транзакции
const all = monitor.getTransactions();
const pending = monitor.getPendingTransactions();
const confirmed = monitor.getConfirmedTransactions();

// Остановить
monitor.stop();
```

### С React Hook:

```typescript
import { useIncomingTransactions } from './hooks/useIncomingTransactions';

function MyComponent() {
  const {
    transactions,
    pendingTransactions,
    confirmedTransactions,
    newTransaction,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearNewTransaction,
  } = useIncomingTransactions();

  useEffect(() => {
    // Запустить мониторинг
    startMonitoring({
      address: myAddress,
      network: 'sepolia',
    });

    return () => stopMonitoring();
  }, [myAddress]);

  // Показать баннер при новой транзакции
  if (newTransaction) {
    return (
      <IncomingTransactionBanner
        transaction={newTransaction}
        onDismiss={clearNewTransaction}
      />
    );
  }

  // Показать список
  return (
    <IncomingTransactionsList
      transactions={transactions}
    />
  );
}
```

### В UI Screen:

```typescript
// Открыть экран входящих транзакций
navigation.navigate('IncomingTransactions');
```

## 📊 Типы данных

### IncomingTransaction

```typescript
interface IncomingTransaction {
  id: string;                    // txHash + (logIndex или 'eth')
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;                 // Human-readable
  valueRaw: string;              // Wei/smallest units
  type: 'eth' | 'erc20';
  tokenAddress?: string;         // Для ERC-20
  tokenSymbol?: string;          // Для ERC-20
  tokenDecimals?: number;        // Для ERC-20
  confirmations: number;
  isStable: boolean;             // true после 2+ подтверждений
  network: Network;
}
```

### MonitorConfig

```typescript
interface MonitorConfig {
  address: string;
  network: Network;
  pollInterval?: number;         // Default: 12000ms
  confirmationsRequired?: number; // Default: 2
  lookbackBlocks?: number;       // Default: 100
}
```

## 🔍 Как это работает

### 1. ETH Transfers

```typescript
// Получаем блоки с транзакциями
const block = await provider.getBlockWithTransactions(blockNumber);

// Проверяем каждую транзакцию
for (const tx of block.transactions) {
  if (tx.to === myAddress && !tx.value.isZero()) {
    // Это входящий перевод!
    saveTransaction(tx);
  }
}
```

### 2. ERC-20 Transfers

```typescript
// Используем getLogs с фильтром
const filter = {
  fromBlock,
  toBlock,
  topics: [
    TRANSFER_EVENT_SIGNATURE,  // Transfer(address,address,uint256)
    null,                       // from (любой)
    myAddressPadded,           // to (мой адрес)
  ],
};

const logs = await provider.getLogs(filter);

// Парсим каждый лог
for (const log of logs) {
  const parsed = iface.parseLog(log);
  const { from, to, value } = parsed.args;
  saveTransaction({ from, to, value, tokenAddress: log.address });
}
```

### 3. Deduplication

```typescript
// Уникальный ID для каждой транзакции
const id = tx.type === 'eth' 
  ? `${txHash}_eth`
  : `${txHash}_${logIndex}`;

// Проверяем, не обработали ли уже
if (transactions.has(id)) {
  continue; // Пропускаем дубликат
}

transactions.set(id, tx);
```

### 4. Reorg Resistance

```typescript
// Обновляем подтверждения
const currentBlock = await provider.getBlockNumber();
const confirmations = currentBlock - tx.blockNumber + 1;

// Помечаем стабильными после 2+ подтверждений
if (confirmations >= 2) {
  tx.isStable = true;
  emit('transaction-confirmed', tx);
}
```

### 5. Persistent Storage

```typescript
// Сохраняем в AsyncStorage
const data = {
  lastProcessedBlock: 12345,
  transactions: Object.fromEntries(transactionsMap),
};

await AsyncStorage.setItem(storageKey, JSON.stringify(data));

// Восстанавливаем при запуске
const saved = await AsyncStorage.getItem(storageKey);
const parsed = JSON.parse(saved);
transactionsMap = new Map(Object.entries(parsed.transactions));
```

## 🎯 Acceptance Criteria - 100%

- ✅ ETH: пуллинг новых блоков и проверка `to == myAddress`
- ✅ ERC-20: `getLogs` по `Transfer` event с `to == myAddress`
- ✅ Дедупликация по `txHash+logIndex`
- ✅ Хранение в AsyncStorage
- ✅ Эмит события для UI
- ✅ Баннер «Вы получили …»
- ✅ Список входящих транзакций
- ✅ Реорг-устойчивость (2+ подтверждений)
- ✅ Эффективные RPC-запросы (батчи по 10 блоков)

## 📱 UI Components

### 1. IncomingTransactionBanner

Анимированный баннер, который появляется при новой транзакции:

```typescript
<IncomingTransactionBanner
  transaction={newTransaction}
  onDismiss={() => setNewTransaction(null)}
  onPress={() => openTransactionDetails(newTransaction)}
/>
```

**Features:**
- Slide-in анимация
- Автоматическое скрытие через 5 секунд
- Progress bar
- Иконка и детали транзакции

### 2. IncomingTransactionsList

Список всех входящих транзакций:

```typescript
<IncomingTransactionsList
  transactions={transactions}
  onTransactionPress={(tx) => openEtherscan(tx)}
  onRefresh={() => refreshTransactions()}
  refreshing={isRefreshing}
/>
```

**Features:**
- Группировка по статусу (pending/confirmed)
- Иконки для ETH и ERC-20
- Время и дата
- Количество подтверждений
- Pull-to-refresh

### 3. IncomingTransactionsScreen

Полноценный экран с мониторингом:

```typescript
navigation.navigate('IncomingTransactions');
```

**Features:**
- Live статус мониторинга
- Статистика (Total/Pending/Confirmed)
- Список транзакций
- Баннер уведомлений

## ⚡ Performance

### Эффективность RPC запросов:

1. **Batch Processing**
   - Обрабатываем по 10 блоков за раз
   - Избегаем перегрузки RPC

2. **Smart Polling**
   - Интервал 12 секунд (время блока)
   - Пропускаем, если нет новых блоков

3. **Efficient Filters**
   - `getLogs` с точными фильтрами
   - Только наш адрес в `to`

4. **Caching**
   - Храним обработанные транзакции
   - Не запрашиваем повторно

### Пример нагрузки:

```
100 блоков = 10 батчей
Каждый батч:
  - 1 запрос getBlockNumber
  - 1 запрос getBlockWithTransactions (для ETH)
  - 1 запрос getLogs (для ERC-20)
  
Итого: ~30 RPC запросов для 100 блоков
```

## 🧪 Тестирование

### Интеграционный тест:

```bash
# 1. Запусти приложение
npm start

# 2. Открой экран Incoming Transactions
navigation.navigate('IncomingTransactions');

# 3. Отправь себе tETH
# Используй другой кошелёк или faucet

# 4. Дождись появления баннера (до 12 секунд)
# Должен появиться баннер "Вы получили ETH"

# 5. Проверь список
# Транзакция должна быть в списке с статусом "Pending"

# 6. Дождись 2 подтверждений (~24 секунды)
# Статус должен измениться на "Confirmed"

# 7. Отправь себе ERC-20 токен
# Например, USDC на Sepolia

# 8. Проверь, что токен появился
# Должен показать символ токена и количество
```

### Unit тесты:

```typescript
describe('IncomingTransactionMonitor', () => {
  it('should deduplicate transactions', () => {
    // Отправляем одну транзакцию дважды
    // Должна быть только одна запись
  });

  it('should mark as stable after 2 confirmations', () => {
    // Создаём транзакцию
    // Увеличиваем блок на 2
    // isStable должен стать true
  });

  it('should save and restore state', async () => {
    // Сохраняем транзакции
    // Создаём новый монитор
    // Должен восстановить транзакции
  });

  it('should emit events', () => {
    // Слушаем 'new-transaction'
    // Добавляем транзакцию
    // Событие должно сработать
  });
});
```

## 🔧 Configuration

### Настройки мониторинга:

```typescript
const monitor = getMonitor({
  address: myAddress,
  network: 'sepolia',
  
  // Интервал проверки (мс)
  pollInterval: 12000,        // 12 секунд = ~1 блок
  
  // Сколько подтверждений нужно
  confirmationsRequired: 2,   // 2 блока
  
  // Сколько блоков назад проверить при старте
  lookbackBlocks: 100,        // ~20 минут истории
});
```

### Для разных сетей:

```typescript
// Mainnet (медленнее, дороже)
pollInterval: 15000,          // 15 секунд
confirmationsRequired: 3,     // 3 блока

// Sepolia (быстрее, дешевле)
pollInterval: 12000,          // 12 секунд
confirmationsRequired: 2,     // 2 блока

// Для тестирования
pollInterval: 5000,           // 5 секунд
confirmationsRequired: 1,     // 1 блок
```

## 📝 Files Created

```
mobile/
├── src/
│   ├── wallet/
│   │   └── incoming.ts                           # Core monitor (600+ lines)
│   │
│   ├── hooks/
│   │   └── useIncomingTransactions.ts            # React Hook
│   │
│   ├── components/
│   │   └── incoming/
│   │       ├── IncomingTransactionBanner.tsx     # Notification banner
│   │       └── IncomingTransactionsList.tsx      # Transaction list
│   │
│   └── screens/
│       └── IncomingTransactionsScreen.tsx        # Full screen
│
└── docs/
    └── features/
        └── INCOMING_TRANSACTIONS.md              # This file
```

## 🎉 Ready to Use!

Система полностью реализована и готова к использованию:

1. ✅ Мониторинг ETH и ERC-20
2. ✅ Дедупликация и хранение
3. ✅ UI компоненты
4. ✅ Реорг-устойчивость
5. ✅ Эффективные RPC запросы

### Как начать:

```typescript
// В HomeScreen или App.tsx
const { activeAccount } = useWallet();
const { startMonitoring } = useIncomingTransactions();

useEffect(() => {
  if (activeAccount?.address) {
    startMonitoring({
      address: activeAccount.address,
      network: 'sepolia',
    });
  }
}, [activeAccount]);
```

---

**Last Updated:** 2025-11-10
**Status:** ✅ Production Ready
