# S-09: Mobile cross-chain signing + execution

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** Critical  
**Оценка:** 12 часов

---

## Задача

Интегрировать cross-chain execution в мобильное приложение.

## Acceptance Criteria

- [ ] `api/crosschainService.ts` → `executeTransaction()` метод
- [ ] User видит quote (маршрут, комиссии, время)
- [ ] User нажимает "Confirm"
- [ ] Biometric/PIN prompt
- [ ] App подписывает tx приватным ключом
- [ ] App отправляет signed tx на backend
- [ ] Backend выполняет и возвращает executionId

## Flow

```
Quote Screen → Confirm → Biometric → Sign → Execute → Status Screen
```

## Технические заметки

- `wallet.signTransaction(unsignedTx)` — ethers.js
- Хранить executionId локально для polling
- Retry при network failures
