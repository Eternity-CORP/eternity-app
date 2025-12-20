# Epic 02: Same-Chain переводы

**ID:** EPIC-02  
**Приоритет:** CRITICAL  
**Срок:** 4 дня  
**Зависит от:** Epic 01

---

## Цель

Реализовать и протестировать выполнение ETH/USDC переводов на одной сети (Sepolia).

**Статус:** ✅ 90% Done

## Критерии готовности

- [x] Тестовый скрипт same-chain перевода работает
- [x] ETH перевод подтверждён на Etherscan Sepolia
- [x] USDC (ERC20) перевод работает
- [x] PaymentService backend валидирован end-to-end
- [x] Мобильное приложение может отправить same-chain транзакцию

## Стори

| ID | Название | Статус | Оценка |
|----|----------|--------|--------|
| S-03 | Реализовать скрипт same-chain ETH перевода | ✅ Done | 4h |
| S-04 | Реализовать same-chain USDC перевод | ✅ Done | 4h |
| S-05 | Smoke-тест mobile → backend same-chain | ✅ Done | 4h |

---

## Реализовано (Dec 2025)

### Mobile Services
- `transactionService.ts` — ETH send с retry, nonce management
- `tokenService.ts` — ERC-20 transfers
- `gasEstimatorService.ts` — EIP-1559 + legacy gas estimation
- `nonceManagerService.ts` — Nonce tracking, tx cancellation

### Screens
- `UnifiedSendScreen.tsx` — Универсальная отправка
- `SendScreen.tsx` — ETH/token send
- `SendByIdentifierScreen.tsx` — Отправка по @nickname

## Технические заметки

- ✅ ethers.js v5.7 для подписи
- ✅ Gas estimation с EIP-1559 поддержкой
- ✅ Retry логика с exponential backoff
- ✅ Nonce management для параллельных tx
