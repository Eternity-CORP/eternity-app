# Epic 03: Cross-Chain выполнение

**ID:** EPIC-03  
**Приоритет:** CRITICAL  
**Срок:** 2 недели  
**Зависит от:** Epic 01, Epic 02

---

## Цель

Завершить cross-chain execution через LiFi, Rango, Socket. Транзакции должны выполняться end-to-end с мониторингом статуса.

**Статус:** ⏳ In Progress (S-06, S-07 Done)

## Критерии готовности

- [x] LiFi: executeTransaction() реализован и протестирован
- [x] Socket: executeTransaction() реализован (заменяет Rango)
- [x] Rango: ⏸️ Deferred (проблемы с получением API ключа — см. ADR-002)
- [ ] Мобильное приложение подписывает и отправляет cross-chain tx
- [ ] Статус транзакции отображается в реальном времени
- [ ] BLIK cross-chain payment работает
- [ ] 10+ успешных cross-chain переводов на testnet

## Стори

| ID | Название | Статус | Оценка |
|----|----------|--------|--------|
| S-06 | LiFi executeTransaction() + status monitoring | ✅ Done | 12h |
| S-07 | Socket executeTransaction() (заменяет Rango) | ✅ Done | 8h |
| S-08 | Rango executeTransaction() | ⏸️ Deferred (нет API key) | 6h |
| S-09 | Mobile cross-chain signing + execution | ⏳ In Progress | 12h |
| S-10 | CrosschainExecutionScreen UI статусов | ⏳ In Progress | 8h |
| S-11 | BLIK cross-chain payment execution | ⏳ In Progress | 8h |
| S-12 | Gas estimation + fee breakdown | ⏳ In Progress | 6h |

---

## Интеграции

**Backend:**
- `CrosschainService.executeTransaction()`
- `BlikService` интеграция с cross-chain
- Webhook endpoints для LiFi/Rango/Socket

**Mobile:**
- `api/crosschainService.ts` → executeTransaction()
- `CrosschainExecutionScreen.tsx` — мониторинг статуса
- Transaction signing с biometric prompt

---

## Обработка ошибок

| Ошибка | Сообщение пользователю |
|--------|------------------------|
| Недостаточно gas | "Нужно X ETH для комиссии" |
| Quote expired | "Маршрут устарел. Обновите." |
| Bridge timeout | "Транзакция задерживается. Мосты могут занять 10-30 мин." |
| Bridge failed | "Ошибка моста. Средства на исходной сети. ID: 0xABC..." |
