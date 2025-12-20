# Rango Integration Documentation

> ⚠️ **СТАТУС: DEFERRED** — Rango временно не используется из-за проблем с получением API ключа.
> 
> **Альтернатива:** Socket Router (активен, поддерживает EVM + Solana).
> См. [ADR-002](../../../docs/decisions/ADR-002-rango-to-socket-migration.md)

## Обзор

Rango Router добавлен для поддержки non-EVM сетей: **Tron, Solana, Bitcoin, Cosmos** и других.

## Зачем Rango?

**LI.FI** отлично работает для EVM/L2 сетей, но имеет ограниченную поддержку:
- ❌ Tron
- ❌ Bitcoin
- ❌ Cosmos ecosystem
- ⚠️ Solana (ограниченная поддержка)

**Rango** покрывает эти пробелы и поддерживает **60+ блокчейнов**.

## Архитектура

```
CrosschainService
├── LifiRouter (EVM/L2)
│   ├── Ethereum
│   ├── Polygon
│   ├── Arbitrum
│   ├── Optimism
│   └── Base
│
└── RangoRouter (All chains)
    ├── EVM (все выше)
    ├── Solana
    ├── Tron
    ├── Bitcoin
    ├── Cosmos
    ├── Osmosis
    └── THORChain
```

## Стратегия выбора роутера

### 1. EVM → EVM
```typescript
fromChain: 'ethereum' → toChain: 'polygon'
✓ Выбирается: LI.FI
✓ Причина: Лучшие цены для EVM
```

### 2. Non-EVM → Any
```typescript
fromChain: 'tron' → toChain: 'solana'
✓ Выбирается: Rango
✓ Причина: Поддержка Tron
```

### 3. Any → Non-EVM
```typescript
fromChain: 'ethereum' → toChain: 'bitcoin'
✓ Выбирается: Rango
✓ Причина: Поддержка Bitcoin
```

## Поддерживаемые сети

### Rango Router

| Сеть | Chain ID | Тип | Пример токена |
|------|----------|-----|---------------|
| **Ethereum** | `ethereum` | EVM | USDC, ETH |
| **Polygon** | `polygon` | EVM | USDC, MATIC |
| **BSC** | `bsc` | EVM | USDT, BNB |
| **Arbitrum** | `arbitrum` | EVM | USDC, ETH |
| **Optimism** | `optimism` | EVM | USDC, ETH |
| **Avalanche** | `avalanche` | EVM | USDC, AVAX |
| **Base** | `base` | EVM | USDC, ETH |
| **Solana** | `solana` | SVM | USDT, SOL |
| **Tron** | `tron` | TRON | USDT, TRX |
| **Bitcoin** | `bitcoin` | BTC | BTC |
| **Cosmos** | `cosmos` | COSMOS | ATOM |
| **Osmosis** | `osmosis` | COSMOS | OSMO |
| **THORChain** | `thorchain` | COSMOS | RUNE |

## Примеры использования

### 1. Tron → Solana (USDT)

```bash
curl "http://localhost:3000/api/v1/crosschain/quote?\
fromChainId=tron&\
toChainId=solana&\
fromToken=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&\
toToken=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB&\
amount=1000000&\
fromAddress=TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf&\
toAddress=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

**Response:**
```json
{
  "estimatedOutput": "998000",
  "fee": "3.00",
  "feeToken": "TRX",
  "durationSeconds": 300,
  "router": "Rango",
  "provider": "rango",
  "route": {
    "fromChain": { "id": "TRON", "name": "Tron" },
    "toChain": { "id": "SOLANA", "name": "Solana" },
    "steps": [...]
  }
}
```

### 2. Bitcoin → Ethereum (BTC → WBTC)

```typescript
const quote = await crosschainService.getQuote({
  fromChainId: 'bitcoin',
  toChainId: 'ethereum',
  fromTokenAddress: 'native', // BTC
  toTokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
  amount: '100000000', // 1 BTC (8 decimals)
  fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  toAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});
```

### 3. Сравнение роутеров

```typescript
const quotes = await crosschainService.getAllQuotes({
  fromChainId: 'ethereum',
  toChainId: 'polygon',
  // ... остальные параметры
});

console.log(quotes);
// [
//   { router: 'LI.FI', quote: { estimatedOutput: '999500', ... } },
//   { router: 'Rango', quote: { estimatedOutput: '999200', ... } }
// ]
```

## Конфигурация

### Переменные окружения

```env
# LI.FI API Key (опционально)
LIFI_API_KEY=your_lifi_key

# Rango API Key (опционально, но рекомендуется)
RANGO_API_KEY=your_rango_key
```

### Инициализация

```typescript
import { CrosschainService } from './services/Crosschain.service';
import { LifiRouter } from './services/routers/LifiRouter.service';
import { RangoRouter } from './services/routers/RangoRouter.service';

const lifiRouter = new LifiRouter({
  apiKey: process.env.LIFI_API_KEY,
});

const rangoRouter = new RangoRouter({
  apiKey: process.env.RANGO_API_KEY,
});

const crosschainService = new CrosschainService([
  lifiRouter,
  rangoRouter,
]);
```

## Unit тесты

Созданы тесты для проверки стратегии выбора роутера:

```bash
# Запуск тестов
npm test -- Crosschain.service

# Результат:
✓ should select LI.FI for Ethereum to Polygon
✓ should select LI.FI for Arbitrum to Optimism
✓ should select Rango for Tron to Solana
✓ should select Rango for Bitcoin to Ethereum
✓ should select Rango for Solana to Tron
```

## API Документация Rango

- **Main Docs:** https://docs.rango.exchange/
- **API Reference:** https://api.rango.exchange/
- **Supported Chains:** https://docs.rango.exchange/api-integration/supported-blockchains

## Roadmap

### Текущая реализация ⏸️ DEFERRED
- [x] RangoRouter с базовой функциональностью
- [x] Unit тесты
- [x] Документация
- ⏸️ НЕ зарегистрирован в CrosschainModule (нет API ключа)

### Заблокировано 🚫
- [ ] Получение API ключа от Rango (сложный процесс)
- [ ] Интеграционные тесты с реальным Rango API

### Используется вместо: Socket Router ✅
Socket покрывает основные use cases:
- EVM chains (15+)
- Solana
- Публичный API ключ для тестирования

### Когда активировать Rango
1. Получить API ключ от Rango Exchange
2. Добавить `RANGO_API_KEY` в .env
3. Зарегистрировать в CrosschainModule:
```typescript
// crosschain.module.ts
import { RangoRouterService } from '../../services/routers/RangoRouter.service';

@Module({
  providers: [
    // ... existing
    RangoRouterService,
  ],
})
export class CrosschainModule implements OnModuleInit {
  constructor(
    // ... existing
    private readonly rangoRouter: RangoRouterService,
  ) {}

  onModuleInit() {
    // ... existing
    this.crosschainService.registerRouter(this.rangoRouter);
    console.log('✅ [Crosschain] Rango router registered');
  }
}
```

## Troubleshooting

### Ошибка: "No routes found"
- Проверьте, что обе сети поддерживаются
- Убедитесь, что токены существуют в обеих сетях
- Попробуйте увеличить slippage

### Ошибка: "Unsupported chain"
- Проверьте chainId в `chainIdMap`
- Убедитесь, что сеть поддерживается Rango

### Медленные котировки
- Добавьте API ключ Rango для приоритета
- Используйте кэширование
- Рассмотрите параллельные запросы

## Контакты

- **Rango Support:** https://docs.rango.exchange/
- **LI.FI Support:** https://docs.li.fi/
