# S-07: Socket executeTransaction() (заменяет Rango)

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** High  
**Оценка:** 8 часов  
**Статус:** ✅ Done

---

> ⚠️ **История изменена:** Изначально планировалась интеграция Rango, но из-за 
> проблем с получением API ключа заменена на Socket Router.
> См. [ADR-002](../decisions/ADR-002-rango-to-socket-migration.md)

## Задача

Реализовать Socket execution как fallback к LiFi и для Solana маршрутов.

## Acceptance Criteria

- [x] `SocketRouterService.executeTransaction()` реализован
- [x] Status monitoring через Socket API
- [x] Маппинг Socket статусов → E-Y статусы
- [x] Fallback: если LiFi fail → автоматически Socket
- [x] Solana: Socket как primary router
- [ ] Тест: cross-chain через Socket (EVM → EVM)
- [ ] Тест: cross-chain через Socket (EVM → Solana)

## Fallback логика

```typescript
// CrosschainService.selectRouter()
// EVM → EVM: LiFi primary, Socket fallback
// Solana: Socket
```

## Технические заметки

- Socket docs: https://docs.socket.tech/
- Bungee docs: https://docs.bungee.exchange/
- Публичный API ключ: `72a5b4b0-e727-48be-8aa1-5da9d62fe635`
- Production ключ: получить на socket.tech

## Что осталось от Rango

Код `RangoRouterService` сохранён, но не активирован:
- Путь: `backend/src/services/routers/RangoRouter.service.ts`
- Статус: Deferred (нет API ключа)
- Активация: когда получим API ключ от Rango
