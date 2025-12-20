# S-06: LiFi executeTransaction() + status monitoring

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** Critical  
**Оценка:** 12 часов

---

## Задача

Завершить LiFi router execution: отправка подписанной транзакции и мониторинг статуса.

## Текущее состояние

- ✅ Quote fetching работает
- ✅ prepareTransaction() возвращает unsigned tx
- ❌ executeTransaction() — НЕ РЕАЛИЗОВАНО
- ❌ Status monitoring — НЕ РЕАЛИЗОВАНО

## Acceptance Criteria

- [ ] `LifiRouterService.executeTransaction(signedTx, routeId)` реализован
- [ ] Метод возвращает `{ txHash, executionId }`
- [ ] `getTransactionStatus(executionId)` реализован
- [ ] Статусы: PENDING → IN_PROGRESS → COMPLETED/FAILED
- [ ] Тест: 10 USDC Sepolia → другая сеть

## API

```typescript
async executeTransaction(
  signedTx: string,
  routeId: string
): Promise<{ txHash: string; executionId: string }>

async getTransactionStatus(
  executionId: string
): Promise<{
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  substep?: string;
}>
```

## Технические заметки

- LiFi docs: https://docs.li.fi/
- Status polling: exponential backoff (1s, 2s, 5s, 10s, 30s)
- Cache quotes 60 сек
