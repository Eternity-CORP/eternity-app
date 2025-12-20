# Трассировочная Матрица: Документация ↔ Код

**Версия:** 1.1  
**Обновлено:** December 18, 2025  
**Автоматическая валидация:** `npm run docs:check`

---

## Назначение

Этот документ — **единый источник истины** для связей между документацией и кодом.  
При изменении кода или документации — **обязательно обновить этот файл**.

---

## Epic → Stories → Код

### EPIC-01: Инфраструктура трансферов
| Story ID | Статус | Связанные файлы |
|----------|--------|------------------|
| S-01 | ⏳ Pending | `backend/.env.example`, `backend/src/services/routers/LifiRouter.service.ts`, `backend/src/services/routers/RangoRouter.service.ts` |
| S-02 | ⏳ Pending | `docs/testnet-addresses.md` |

### EPIC-02: Same-Chain Transfer
| Story ID | Статус | Связанные файлы |
|----------|--------|-----------------|
| S-03 | ✅ Done | `backend/src/services/Payment.service.ts` |
| S-04 | ✅ Done | `backend/src/services/Payment.service.ts` |
| S-05 | ⏳ In Progress | `mobile/src/screens/UnifiedSendScreen.tsx` |

### EPIC-03: Cross-Chain Execution
| Story ID | Статус | Связанные файлы |
|----------|--------|-----------------|
| S-06 | ✅ Done | `backend/src/services/routers/LifiRouter.service.ts`, `backend/src/services/Crosschain.service.ts` |
| S-07 | ✅ Done | `backend/src/services/routers/RangoRouter.service.ts` |
| S-08 | ⏸️ Deferred | `backend/src/services/routers/SocketRouter.service.ts` |
| S-09 | ⏳ In Progress | `mobile/src/screens/CrosschainQuoteScreen.tsx`, `mobile/src/services/walletService.ts` |
| S-10 | ⏳ In Progress | `mobile/src/screens/TransactionDetailsScreen.tsx` |
| S-11 | ⏳ In Progress | `backend/src/services/Blik.service.ts`, `mobile/src/screens/CreateBlikCodeScreen.tsx` |
| S-12 | ⏳ In Progress | `mobile/src/services/blockchain/gasEstimatorService.ts` |

### EPIC-04: Mobile Security
| Story ID | Статус | Связанные файлы |
|----------|--------|------------------|
| S-13 | ⏳ Pending | `mobile/src/services/authService.ts`, `mobile/src/screens/OnboardingScreen.tsx` |
| S-14 | ⏳ Pending | `mobile/src/services/authService.ts` |
| S-15 | ⏳ Pending | `mobile/src/services/cryptoService.ts` |
| S-16 | ⏳ Pending | `mobile/src/screens/SecuritySettingsScreen.tsx` |
| S-17 | ⏳ Pending | `mobile/src/services/pinService.ts` |
| S-18 | ⏳ Pending | `mobile/src/services/cryptoService.ts` |

### EPIC-05: Demo/Live Mode
| Story ID | Статус | Связанные файлы |
|----------|--------|------------------|
| S-19 | ✅ Done | `mobile/src/services/networkModeService.ts`, `mobile/src/features/network/NetworkModeSwitcher.tsx`, `mobile/src/features/network/NetworkSwitcher.tsx`, `mobile/src/screens/SettingsScreen.tsx`, `mobile/src/screens/HomeScreen.tsx` |

---

## Документ → Зависимости

| Документ | Зависит от файлов | Последнее обновление |
|----------|-------------------|----------------------|
| `docs/prd/prd.md` | — (корневой) | 2025-12-16 |
| `docs/prd/epic-01-infrastructure.md` | S-01, S-02 | 2025-12-16 |
| `docs/prd/epic-02-same-chain-transfer.md` | S-03, S-04, S-05 | 2025-12-16 |
| `docs/prd/epic-03-crosschain-execution.md` | S-06..S-12 | 2025-12-16 |
| `docs/prd/epic-04-mobile-security.md` | S-13..S-18 | 2025-12-16 |
| `docs/prd/epic-05-demo-live-mode.md` | S-19 | 2025-12-18 |
| `docs/ROADMAP.md` | All epics/stories | 2025-12-18 |
| `docs/architecture/architecture.md` | Backend + Mobile structure | 2025-12-16 |

---

## Правила обновления

### При изменении КОДА:
1. Найти связанные Stories в этой матрице
2. Проверить: изменение влияет на Acceptance Criteria?
3. Если да → обновить Story + Epic + ROADMAP
4. Обновить эту матрицу (статус, дату)

### При изменении ДОКУМЕНТАЦИИ:
1. Проверить: все файлы в "Связанные файлы" существуют?
2. Проверить: код соответствует описанию?
3. Обновить эту матрицу

### При добавлении новой ФИЧИ:
1. Создать Story в `docs/stories/S-XX-название.md`
2. Привязать к Epic или создать новый Epic
3. Добавить запись в эту матрицу
4. Обновить `docs/ROADMAP.md`

---

## Статусы

| Статус | Значение |
|--------|----------|
| ⏳ Pending | Не начато |
| ⏳ In Progress | В работе |
| ✅ Done | Код готов, тесты проходят |
| ⏸️ Deferred | Отложено (не в MVP) |
| ❌ Blocked | Заблокировано |

---

## Changelog

| Дата | Изменение | Автор |
|------|-----------|-------|
| 2025-12-18 | Добавлен Epic-05 Demo/Live Mode, Story S-19, обновлены статусы | Dev |
| 2025-12-17 | Создана трассировочная матрица | PM |

