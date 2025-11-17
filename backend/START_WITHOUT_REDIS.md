# 🚀 Start Backend Without Redis

## ✅ Redis теперь опциональный!

Система настроена так, что Redis не обязателен для работы.

## 📝 Настройка .env

### Вариант 1: Без Redis (рекомендуется для разработки)

В твоем `.env` файле закомментируй или удали строку с REDIS_URL:

```env
# Redis (OPTIONAL - comment out if not using Redis)
# REDIS_URL=redis://localhost:6379
```

### Вариант 2: С Redis (для production)

Если хочешь использовать Redis:

```env
REDIS_URL=redis://localhost:6379
```

И запусти Redis:
```bash
brew services start redis
```

## 🚀 Запуск сервера

```bash
npm run start:dev
```

Сервер запустится без ошибок Redis!

## ✅ Что изменилось

### 1. Validation (src/config/validation.ts)
- `REDIS_URL` теперь **optional** вместо required

### 2. PaymentsModule (src/modules/payments/payments.module.ts)
- Если `REDIS_URL` не указан, используется **mock Redis client**
- Mock поддерживает базовые операции: `get()`, `set()`, `del()`
- Идемпотентность в payments работает через in-memory (без персистентности)

### 3. .env.example
- Redis помечен как OPTIONAL
- Добавлена конфигурация для шардов

## 🧪 Тестирование

### 1. Запусти сервер
```bash
npm run start:dev
```

Должен запуститься без ошибок:
```
[Nest] 52702  - LOG [NestFactory] Starting Nest application...
[Nest] 52702  - LOG [InstanceLoader] ShardModule dependencies initialized
[Nest] 52702  - LOG [RouterExplorer] Mapped {/api/shards/me, GET} route
[Nest] 52702  - LOG Eternity Wallet backend listening on port 3000
```

### 2. Зарегистрируй пользователя

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d4Dc462d5c4Ff8C8644bB5f5e62A8D4C0"
  }'
```

Ответ:
```json
{
  "user": {
    "id": "uuid",
    "walletAddress": "0x742d4dc462d5c4ff8c8644bb5f5e62a8d4c0",
    "createdAt": "..."
  },
  "message": "User registered successfully"
}
```

**Важно:** При регистрации автоматически начисляется +1 шард за создание профиля!

### 3. Залогинься

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d4Dc462d5c4Ff8C8644bB5f5e62A8D4C0"
  }'
```

Ответ:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x742d4dc462d5c4ff8c8644bb5f5e62a8d4c0"
  }
}
```

### 4. Сохрани токен

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. Проверь шарды

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me
```

Ожидаемый ответ (новый пользователь):
```json
{
  "totalShards": 1,
  "shardsEarnedToday": 0,
  "recentTransactions": [
    {
      "id": "uuid",
      "amount": 1,
      "reason": "ONBOARD_PROFILE_CREATED",
      "createdAt": "2025-01-15T02:37:00.000Z"
    }
  ]
}
```

✅ **Работает!** Получен +1 шард за создание профиля!

### 6. Создай Split Bill (получишь +2 шарда)

```bash
curl -X POST http://localhost:3000/api/split-bills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": "1.5",
    "currency": "ETH",
    "mode": "EQUAL",
    "participants": [
      {
        "address": "0x1234567890123456789012345678901234567890",
        "amount": "0.5"
      },
      {
        "address": "0x0987654321098765432109876543210987654321",
        "amount": "0.5"
      },
      {
        "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "amount": "0.5"
      }
    ],
    "message": "Test split",
    "emoji": "🍕"
  }'
```

Проверь шарды снова:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/shards/me
```

Должно показать:
```json
{
  "totalShards": 3,
  "shardsEarnedToday": 1,
  "recentTransactions": [
    {
      "id": "...",
      "amount": 1,
      "reason": "DAILY_ADVANCED_FEATURE",
      "createdAt": "..."
    },
    {
      "id": "...",
      "amount": 1,
      "reason": "ONBOARD_FIRST_SPLIT_BILL",
      "createdAt": "..."
    },
    {
      "id": "...",
      "amount": 1,
      "reason": "ONBOARD_PROFILE_CREATED",
      "createdAt": "..."
    }
  ]
}
```

## 🎯 Награды работают!

### Разовые (Onboarding):
- ✅ `ONBOARD_PROFILE_CREATED` - при регистрации
- ✅ `ONBOARD_FIRST_SPLIT_BILL` - при первом split bill
- ✅ `ONBOARD_FIRST_SCHEDULED_PAYMENT` - при первом scheduled payment
- ⏳ `ONBOARD_FIRST_TX_SENT` - нужно интегрировать в send
- ⏳ `ONBOARD_FIRST_TX_RECEIVED` - нужно интегрировать в webhooks

### Ежедневные (Daily):
- ✅ `DAILY_ADVANCED_FEATURE` - при split bill или scheduled payment
- ⏳ `DAILY_FIRST_SEND` - нужно интегрировать в send

**Дневной лимит:** 3 шарда максимум

## 📊 Проверка в БД

```sql
-- Проверить состояние шардов пользователя
SELECT 
  u."walletAddress",
  uss."totalShards",
  uss."shardsEarnedToday",
  uss."hasProfileCreationShard",
  uss."hasFirstSplitBillShard"
FROM user_shard_states uss
JOIN users u ON u.id = uss."userId";

-- Проверить историю транзакций
SELECT 
  u."walletAddress",
  st.amount,
  st.reason,
  st."createdAt"
FROM shard_transactions st
JOIN users u ON u.id = st."userId"
ORDER BY st."createdAt" DESC;
```

## 🎉 Готово!

Теперь можешь:
- ✅ Запускать backend без Redis
- ✅ Тестировать систему шардов
- ✅ Регистрировать пользователей и получать награды
- ✅ Создавать split bills и scheduled payments

**Следующий шаг:** Интегрировать награды за send/receive транзакции

---

**Документация:**
- Полная система: `SHARD_SYSTEM.md`
- Установка: `SHARD_SYSTEM_SETUP.md`
- Тестовые команды: `TEST_COMMANDS.md`
- Итоговый summary: `SHARD_IMPLEMENTATION_SUMMARY.md`
