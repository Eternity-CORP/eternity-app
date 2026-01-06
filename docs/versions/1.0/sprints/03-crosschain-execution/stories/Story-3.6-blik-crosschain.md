# S-11: BLIK cross-chain payment execution

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** High  
**Оценка:** 8 часов

---

## Задача

Завершить cross-chain payment через BLIK код.

## Текущее состояние

- ✅ BLIK code generation работает
- ✅ Quote retrieval работает
- ❌ Cross-chain execution — TODO в коде

## Acceptance Criteria

- [ ] `BlikService.executeRequest()` вызывает `crosschainService.executeTransaction()` для cross-chain
- [ ] BLIK код маркируется "processing" при старте
- [ ] При fail на source → код возвращается в "pending"
- [ ] При success → код "completed"
- [ ] `crosschainExecutionId` сохраняется в PaymentRequest
- [ ] `/api/blik/:code/status` возвращает cross-chain статус

## Тест сценарий

1. Alice создаёт BLIK на 50 USDC (Arbitrum)
2. Bob имеет USDC на Polygon, вводит код
3. Bob видит cross-chain quote, подтверждает
4. Транзакция выполняется
5. Alice получает 50 USDC на Arbitrum
6. Код нельзя использовать повторно

## Database migration

```sql
ALTER TABLE payment_request 
ADD COLUMN crosschain_execution_id VARCHAR(255);
```
