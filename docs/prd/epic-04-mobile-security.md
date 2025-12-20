# Epic 04: Мобильная безопасность

**ID:** EPIC-04  
**Приоритет:** HIGH  
**Срок:** 1.5 недели  
**Параллельно с:** Epic 03

---

## Цель

Обеспечить biometric/PIN аутентификацию на всех sensitive actions. Защита средств при потере устройства.

**Статус:** ⏳ Pending

## Критерии готовности

- [ ] Re-auth при возврате в приложение (>5 мин background)
- [ ] Auth перед каждой транзакцией
- [ ] Auth перед показом seed phrase
- [ ] Auth перед изменением security settings
- [ ] PIN lockout после 5 неудачных попыток
- [ ] Fallback: биометрия → PIN → seed phrase recovery

## Стори

| ID | Название | Статус | Оценка |
|----|----------|--------|--------|
| S-13 | Auth при запуске приложения (background >5min) | ⏳ Pending | 6h |
| S-14 | Auth перед подтверждением транзакции | ⏳ Pending | 4h |
| S-15 | Auth для просмотра seed phrase | ⏳ Pending | 4h |
| S-16 | Auth для изменения security settings | ⏳ Pending | 4h |
| S-17 | PIN lockout + biometric fallback | ⏳ Pending | 6h |
| S-18 | Seed phrase recovery при полной блокировке | ⏳ Pending | 4h |

---

## Технические заметки

- `expo-local-authentication` для biometric
- `lastAuthenticatedAt` в Zustand (volatile, не персистентный)
- Grace period: 5 минут
- Lockout: 5 попыток → 30 сек biometric-only
- Screenshot prevention на seed phrase screen

---

## Точки интеграции

| Действие | Требует auth |
|----------|--------------|
| Запуск приложения (>5 мин) | ✅ |
| Отправка транзакции | ✅ |
| Просмотр seed phrase | ✅ |
| Изменение PIN | ✅ |
| Отключение biometric | ✅ |
| Просмотр баланса | ❌ |
| Просмотр истории | ❌ |
