# S-05: Smoke-тест mobile → backend same-chain

**Epic:** EPIC-02 (Same-Chain переводы)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Проверить что мобильное приложение может инициировать same-chain перевод через backend.

## Acceptance Criteria

- [ ] Mobile вызывает `/api/payments/send-by-identifier`
- [ ] Backend резолвит получателя
- [ ] Mobile подписывает транзакцию
- [ ] Транзакция отправляется
- [ ] Баланс обновляется

## Тестовый сценарий

1. User A отправляет 1 USDC @userB на Sepolia
2. Backend резолвит @userB → адрес
3. Mobile подписывает tx
4. Tx подтверждается
5. User B видит 1 USDC
