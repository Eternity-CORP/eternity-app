# Backend Services Documentation

## Структура проекта

```
backend/src/
├── entities/           # TypeORM entities (User, UserWallet, etc.)
├── dto/               # Data Transfer Objects
├── types/             # TypeScript типы и интерфейсы
├── services/          # Бизнес-логика
│   ├── IdentityResolver.service.ts
│   ├── Payment.service.ts
│   └── __tests__/     # Unit тесты
├── controllers/       # HTTP контроллеры
│   └── payments.controller.ts
├── examples/          # Примеры интеграции
└── migrations/        # SQL миграции
```

## Созданные компоненты

### 1. Identity Resolver Service

**Файл:** `services/IdentityResolver.service.ts`

**Назначение:** Резолвинг идентификаторов пользователей (nickname, global_id, raw address)

**Основные методы:**
- `resolveIdentifier(input: string)` — резолвинг любого идентификатора
- `getAddressForChain(resolved, chainId)` — получение адреса для сети
- `getPreferredChainForToken(resolved, tokenSymbol)` — получение предпочтительной сети
- `getOptimalAddressForToken(resolved, tokenSymbol)` — оптимальный адрес с учетом preferences

**Пример использования:**
```typescript
const resolved = await identityResolver.resolveIdentifier('@john_doe');
if (resolved) {
  const address = identityResolver.getAddressForChain(resolved, 'ethereum');
  console.log(address); // 0x742d...
}
```

### 2. Payment Service

**Файл:** `services/Payment.service.ts`

**Назначение:** Обработка платежей по идентификаторам (same-chain)

**Основные методы:**
- `sendByIdentifier(fromUserId, request)` — отправка средств по идентификатору

**Обработка ошибок:**
- `RECIPIENT_NOT_FOUND` — получатель не найден
- `CANNOT_SEND_TO_SELF` — попытка отправить самому себе
- `RECIPIENT_NO_ADDRESS_FOR_CHAIN` — у получателя нет адреса для сети
- `INSUFFICIENT_BALANCE` — недостаточно средств
- `BLOCKCHAIN_ERROR` — ошибка блокчейна

### 3. Payments Controller

**Файл:** `controllers/payments.controller.ts`

**Endpoint:** `POST /api/v1/payments/send-by-identifier`

**Request:**
```json
{
  "identifier": "@john_doe",
  "chainId": "polygon",
  "token": "USDT",
  "amount": "100.50",
  "memo": "Optional description"
}
```

**Response (Success):**
```json
{
  "txHash": "0xabc123...",
  "chainId": "polygon",
  "recipient": {
    "userId": "550e8400-...",
    "nickname": "john_doe",
    "globalId": "EY-ABC123XYZ",
    "maskedAddress": "0x742d...f0bEb",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  },
  "amount": "100.50",
  "token": "USDT",
  "status": "pending",
  "timestamp": "2025-11-19T17:00:00.000Z"
}
```

## Lint ошибки (ожидаемые)

Текущие lint ошибки связаны с:
1. **DTO классы** — "Property has no initializer" — это нормально для DTO, можно исправить добавив `!` или настроив `strictPropertyInitialization: false` в tsconfig
2. **Express types** — требуется `@types/express` и настройка `esModuleInterop: true`

## Следующие шаги

1. **Настроить tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "strictPropertyInitialization": false,
       "esModuleInterop": true
     }
   }
   ```

2. **Установить зависимости:**
   ```bash
   npm install express typeorm pg
   npm install -D @types/express @types/node jest ts-jest @types/jest
   ```

3. **Запустить тесты:**
   ```bash
   npm test
   ```

4. **Реализовать WalletService** — интеграция с Web3/ethers.js для реальных транзакций

5. **Добавить валидацию** — class-validator для DTO

6. **Добавить документацию API** — Swagger/OpenAPI
