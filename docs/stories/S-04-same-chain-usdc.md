# S-04: Реализовать same-chain USDC перевод

**Epic:** EPIC-02 (Same-Chain переводы)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Реализовать ERC20 USDC перевод на Sepolia.

## Acceptance Criteria

- [ ] Создать скрипт для тестирования (см. Файлы для создания)
- [ ] Approve USDC spending (если нужно)
- [ ] Отправить 1 testnet USDC
- [ ] Проверить ERC20 Transfer event
- [ ] Валидировать баланс получателя

## Файлы для создания

- `backend/scripts/test-same-chain-usdc.ts` — тестовый скрипт

## Существующие файлы

- `backend/src/services/Payment.service.ts` — сервис платежей

## Технические заметки

- USDC Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Использовать ERC20 ABI для transfer()
