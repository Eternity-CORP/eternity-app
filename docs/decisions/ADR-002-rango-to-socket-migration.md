# ADR-002: Замена Rango Router на Socket Router

**Status:** Accepted  
**Date:** 2025-01-20  
**Decision Makers:** Dev Team  
**Category:** Integration, Cross-Chain  
**Supersedes:** Частично ADR-001 (в части Rango как fallback)

---

## Context

Rango Exchange был выбран в ADR-001 как secondary/fallback роутер для cross-chain операций, особенно для non-EVM сетей (Solana, Tron, Bitcoin, Cosmos).

**Проблема:** Получение API ключа от Rango оказалось крайне затруднительным:
- Сложный процесс верификации
- Длительное время ожидания
- Отсутствие self-service для получения ключа
- Блокирует продвижение по Epic-03 (Cross-Chain Execution)

---

## Options Considered

### 1. Продолжить ждать API ключ Rango
❌ **Отклонено**
- Неопределённый срок ожидания
- Блокирует развитие проекта

### 2. Активировать Socket Router (уже реализован)
✅ **Выбрано**
- Код уже написан и интегрирован
- Публичный API ключ для тестирования
- Production ключ легко получить на socket.tech
- Поддерживает EVM + Solana

### 3. Реализовать deBridge
⏸️ **Отложено**
- Требует новой разработки
- Можно добавить позже если нужно

### 4. Реализовать Squid Router
⏸️ **Отложено**
- Требует новой разработки
- Привязан к Axelar ecosystem

---

## Decision

**Заменить Rango Router на Socket Router как основной fallback для LiFi.**

### Новая стратегия роутинга:

```
CrosschainService
├── LiFi (Primary) — EVM chains
│   ├── Ethereum, Polygon, Arbitrum
│   ├── Optimism, Base, Avalanche
│   └── BSC, Gnosis, etc.
│
└── Socket (Fallback/Secondary)
    ├── Все EVM chains (как fallback)
    └── Solana
```

### Что теряем:
| Сеть | Rango | Socket | Альтернатива |
|------|-------|--------|--------------|
| Tron | ✅ | ❌ | THORSwap (будущее) |
| Bitcoin | ✅ | ❌ | Chainflip, THORSwap |
| Cosmos | ✅ | ❌ | Squid Router |

### Что сохраняем:
| Сеть | Покрытие |
|------|----------|
| EVM chains (25+) | ✅ LiFi + Socket |
| EVM → Solana | ✅ Socket (receivingEnabled) |
| Solana → EVM | ⚠️ Не поддерживается (sendingEnabled: false) |

> **Важно:** Socket поддерживает **получение** на Solana (например USDC Ethereum → Solana),  
> но **отправка** с Solana пока не доступна через их API.

---

## Implementation

### Уже реализовано:
1. ✅ `SocketRouterService` — полностью готов
2. ✅ `CrosschainModule` — Socket зарегистрирован
3. ✅ `CrosschainService` — стратегия выбора включает Socket

### Публичный API ключ (для тестирования):
```typescript
// backend/src/services/routers/SocketRouter.service.ts
this.apiKey = process.env.SOCKET_API_KEY || '72a5b4b0-e727-48be-8aa1-5da9d62fe635';
```

### Для Production:
```env
# .env
SOCKET_API_KEY=your_production_key  # Получить на socket.tech
```

---

## Consequences

### Positive
- ✅ Разблокирует Epic-03 немедленно
- ✅ Не требует дополнительной разработки
- ✅ Socket активно развивается (Bungee.exchange)
- ✅ Публичный API ключ для тестирования
- ✅ Хорошая документация

### Negative
- ❌ Потеря Tron, Bitcoin, Cosmos поддержки
- ❌ Меньше bridge diversity чем с Rango

### Mitigation
- Tron/Bitcoin/Cosmos поддержка не является MVP приоритетом
- Можно добавить Rango позже когда получим API ключ
- THORSwap/Chainflip можно добавить для Bitcoin в будущем

---

## Status of Rango Code

Код `RangoRouterService` **сохраняется** в репозитории:
- Путь: `backend/src/services/routers/RangoRouter.service.ts`
- Статус: Реализован, но НЕ зарегистрирован в модуле
- Причина: Когда получим API ключ, можно легко активировать

---

## References

- [ADR-001: Cross-Chain Aggregator Selection](./ADR-001-crosschain-aggregator-selection.md)
- [Socket Tech Docs](https://docs.socket.tech/)
- [Bungee Exchange](https://bungee.exchange/)
- [Epic-03: Cross-Chain Execution](../prd/epic-03-crosschain-execution.md)

---

**Decision Date:** January 20, 2025  
**Review Date:** After Rango API key obtained (optional)

