# Crosschain Integration Documentation

## Обзор

Модуль для выполнения crosschain свапов через агрегаторы (LI.FI, Socket, Squid).

## Структура

```
src/
├── types/
│   └── crosschain.types.ts          # Типы для crosschain операций
├── interfaces/
│   └── CrosschainRouter.interface.ts # Интерфейс роутера
├── services/
│   ├── Crosschain.service.ts        # Основной сервис
│   └── routers/
│       └── LifiRouter.service.ts    # Реализация LI.FI
├── controllers/
│   └── crosschain.controller.ts     # HTTP контроллер
├── dto/
│   └── crosschain.dto.ts            # DTO для API
└── examples/
    └── crosschain-integration.example.ts
```

## Компоненты

### 1. ICrosschainRouter Interface

Базовый интерфейс для всех роутеров.

**Методы:**
- `getQuote()` — получение котировки
- `prepareTransaction()` — подготовка данных транзакции
- `getTransactionStatus()` — статус выполнения
- `supportsRoute()` — проверка поддержки маршрута

### 2. LifiRouter

Реализация интеграции с LI.FI API.

**Особенности:**
- Поддержка всех EVM/L2 сетей
- Автоматический выбор лучшего маршрута
- Обработка ошибок

**Конфигурация:**
```typescript
const lifiRouter = new LifiRouter({
  apiKey: process.env.LIFI_API_KEY, // Опционально
  apiUrl: 'https://li.quest/v1',     // По умолчанию
});
```

### 3. CrosschainService

Сервис для управления несколькими роутерами.

**Методы:**
- `getQuote()` — котировка от лучшего роутера
- `getAllQuotes()` — котировки от всех роутеров
- `getBestQuote()` — автовыбор лучшей котировки
- `prepareTransaction()` — подготовка транзакции
- `getTransactionStatus()` — статус транзакции

### 4. API Endpoints

#### GET /api/v1/crosschain/quote

Получение котировки для crosschain swap.

**Query Parameters:**
- `fromChainId` — исходная сеть (ethereum, polygon, etc.)
- `toChainId` — целевая сеть
- `fromToken` — адрес токена в исходной сети
- `toToken` — адрес токена в целевой сети
- `amount` — сумма (в минимальных единицах токена)
- `fromAddress` — адрес отправителя
- `toAddress` — адрес получателя
- `slippage` — допустимое проскальзывание (опционально, default: 0.5%)

**Response:**
```json
{
  "estimatedOutput": "999500000",
  "fee": "2.50",
  "feeToken": "ETH",
  "durationSeconds": 180,
  "priceImpact": "low",
  "route": { ... },
  "router": "LI.FI"
}
```

#### GET /api/v1/crosschain/quotes/compare

Сравнение котировок от всех роутеров.

#### POST /api/v1/crosschain/prepare

Подготовка транзакции для подписи пользователем.

#### GET /api/v1/crosschain/status/:txHash

Получение статуса crosschain транзакции.

#### GET /api/v1/crosschain/routers

Список доступных роутеров.

## Настройка

### 1. Установка зависимостей

```bash
# Опционально: официальный SDK LI.FI
npm install @lifi/sdk @lifi/types
```

### 2. Переменные окружения

```env
# LI.FI API Key (опционально, но рекомендуется для production)
LIFI_API_KEY=your_api_key_here

# Другие роутеры (в будущем)
SOCKET_API_KEY=your_socket_key
SQUID_API_KEY=your_squid_key
```

### 3. Инициализация

```typescript
import { CrosschainService } from './services/Crosschain.service';
import { LifiRouter } from './services/routers/LifiRouter.service';

const lifiRouter = new LifiRouter({
  apiKey: process.env.LIFI_API_KEY,
});

const crosschainService = new CrosschainService([lifiRouter]);
```

## Поддерживаемые сети

### LI.FI Router

**EVM/L2 сети:**
- Ethereum (ethereum)
- Polygon (polygon)
- BSC (bsc)
- Arbitrum (arbitrum)
- Optimism (optimism)
- Avalanche (avalanche)
- Base (base)
- Gnosis (gnosis)

## Обработка ошибок

### Коды ошибок

- `ROUTE_NOT_FOUND` — маршрут не найден
- `UNSUPPORTED_CHAIN` — сеть не поддерживается
- `LIFI_ERROR` — ошибка LI.FI API

### Пример обработки

```typescript
try {
  const quote = await crosschainService.getQuote(params);
} catch (error) {
  if (error.message.includes('ROUTE_NOT_FOUND')) {
    // Маршрут недоступен
  } else if (error.message.includes('UNSUPPORTED_CHAIN')) {
    // Сеть не поддерживается
  }
}
```

## Расширение

### Добавление нового роутера

1. Создайте класс, реализующий `ICrosschainRouter`:

```typescript
export class SocketRouter implements ICrosschainRouter {
  readonly name = 'Socket';
  readonly supportedChainTypes = ['EVM'];

  async getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote> {
    // Реализация
  }

  // ... остальные методы
}
```

2. Добавьте в CrosschainService:

```typescript
const socketRouter = new SocketRouter();
const crosschainService = new CrosschainService([
  lifiRouter,
  socketRouter,
]);
```

## Тестирование

```bash
# Запуск тестов
npm test -- Crosschain

# Тестирование с реальным API (требует API ключ)
LIFI_API_KEY=your_key npm test -- LifiRouter.integration
```

## Документация LI.FI

- **API Reference:** https://docs.li.fi/li.fi-api/li.fi-api-reference
- **SDK Documentation:** https://docs.li.fi/integrate-li.fi-js-sdk
- **Supported Chains:** https://docs.li.fi/li.fi-api/supported-chains-bridges-dexs

## Roadmap

- [ ] Добавить Socket.tech роутер
- [ ] Добавить Squid роутер
- [ ] Поддержка Solana (SVM)
- [ ] Кэширование котировок
- [ ] Webhook для статусов транзакций
- [ ] Метрики и мониторинг
