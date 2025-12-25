# Epic 03: Cross-Chain выполнение

**ID:** EPIC-03  
**Приоритет:** CRITICAL  
**Срок:** 2 недели  
**Зависит от:** Epic 01, Epic 02

---

## Цель

Завершить cross-chain execution через LiFi, Rango, Socket. Транзакции должны выполняться end-to-end с мониторингом статуса.

**Статус:** ✅ 99% Done — Ready for E2E Testing (Dec 20, 2025)

## Критерии готовности

- [x] LiFi: executeTransaction() реализован и протестирован
- [x] Socket: executeTransaction() реализован (заменяет Rango)
- [x] Rango: ⏸️ Deferred (проблемы с получением API ключа — см. ADR-002)
- [x] Мобильное приложение подписывает и отправляет cross-chain tx ✅
- [x] Статус транзакции отображается в реальном времени ✅
- [x] BLIK cross-chain payment работает ✅
- [ ] 10+ успешных cross-chain переводов на testnet (E2E testing)

## Стори

| ID | Название | Статус | Оценка |
|----|----------|--------|--------|
| S-06 | LiFi executeTransaction() + status monitoring | ✅ Done | 12h |
| S-07 | Socket executeTransaction() (заменяет Rango) | ✅ Done | 8h |
| S-08 | Rango executeTransaction() | ⏸️ Deferred (нет API key) | 6h |
| S-09 | Mobile cross-chain signing + execution | ✅ Done (Dec 20) | 12h |
| S-10 | CrosschainStatusScreen UI статусов | ✅ Done (Dec 20) | 8h |
| S-11 | BLIK cross-chain payment execution | ✅ Done (Dec 20) | 8h |
| S-12 | Gas estimation + fee breakdown | ✅ Done | 6h |

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

---

## Обновления (Dec 20, 2025)

### S-09: Mobile Cross-chain Signing ✅
**Файл:** `mobile/src/screens/CrosschainQuoteScreen.tsx`
- Интегрирована биометрическая аутентификация (FaceID/TouchID)
- Добавлена функция `signAndSendTransaction()` с ethers.js
- UI показывает статусы "Preparing..." / "Signing..."
- После успешной отправки → навигация на CrosschainStatusScreen

### S-10: CrosschainStatusScreen ✅
**Файл:** `mobile/src/screens/CrosschainStatusScreen.tsx` (NEW)
- 5 этапов: Submitted → Confirming → Bridging → Completing → Completed
- Real-time polling статуса каждые 5 секунд
- Анимированный progress bar
- Ссылки на explorer для source/destination транзакций
- Отображение estimated vs elapsed time

### S-11: BLIK Cross-chain ✅
**Файл:** `mobile/src/screens/PayBlikCodeScreen.tsx`
- Определение cross-chain при разных сетях отправителя/получателя
- Навигация на `CrosschainQuoteScreen` для сравнения маршрутов
- Разрешение адреса получателя из wallets BLIK кода
- Same-chain платежи обрабатываются напрямую через `sendETH()`

### Дополнительные улучшения
- **BLIK Security:** Криптографически безопасная генерация кодов (`crypto.randomBytes`)
- **Scheduled Payments:** Сохранение network при создании для консистентности
- **Network Switching:** Исправлен баг с кэшированием данных при переключении Demo/Live
