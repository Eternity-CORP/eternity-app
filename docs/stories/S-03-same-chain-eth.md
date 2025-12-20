# S-03: Реализовать скрипт same-chain ETH перевода

**Epic:** EPIC-02 (Same-Chain переводы)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Создать и протестировать скрипт для отправки ETH на Sepolia.

## Acceptance Criteria

- [ ] Создать скрипт для тестирования (см. Файлы для создания)
- [ ] Скрипт загружает private key из env
- [ ] Отправить 0.001 ETH на тестовый адрес
- [ ] Дождаться confirmation
- [ ] Вывести tx hash
- [ ] Проверить на Etherscan Sepolia

## Код скрипта

```typescript
// 1. Загрузить приватный ключ
// 2. Создать ethers.js wallet
// 3. Отправить 0.001 ETH
// 4. Ждать подтверждения
// 5. Логировать результат
```

## Файлы для создания

- `backend/scripts/test-same-chain-eth.ts` — тестовый скрипт

## Существующие файлы

- `backend/src/services/Payment.service.ts` — сервис платежей

## Технические заметки

- ethers.js v5.7
- Gas estimation автоматическая
