# Change Log: Документация и Код

**Формат:** При каждом значимом изменении — добавить запись в начало списка.

---

## Записи изменений

### [2025-12-24] TokenRegistry и исправление BLIK архитектуры
**Тип:** Feature + Refactor  
**Автор:** Dev  
**Затронуто:**
- Создан `backend/src/services/TokenRegistry.service.ts` — централизованный реестр токенов
- Изменён `backend/src/services/Blik.service.ts` — исправлена архитектура (backend не отправляет транзакции)
- Изменён `backend/src/controllers/blik.controller.ts` — добавлена обработка TX_HASH_REQUIRED
- Изменён `backend/src/modules/blik/blik.module.ts` — добавлен TokenRegistryService
- Изменён `backend/src/dto/blik.dto.ts` — добавлен txHash в ExecuteBlikRequestDto
- Изменён `backend/src/types/blik.types.ts` — добавлен txHash в ExecutePaymentRequestParams
- Изменён `mobile/src/services/api/blikService.ts` — передача txHash в backend

**Причина:** 
1. Централизация адресов токенов вместо hardcoded маппинга
2. Исправление архитектуры: backend не имеет приватных ключей и не может отправлять транзакции. Mobile отправляет транзакции и передаёт txHash в backend для записи.

**Проверка настроек:**
- Все настройки (privacy, notifications, language, pin, biometric, networkMode) корректно сохраняются в AsyncStorage/SecureStore ✅

---

### [2025-12-18] Добавлен переключатель Demo/Live Mode
**Тип:** Feature  
**Автор:** Dev  
**Затронуто:**
- Создан `mobile/src/services/networkModeService.ts` — сервис управления режимом
- Создан `mobile/src/features/network/NetworkModeSwitcher.tsx` — UI переключателя
- Изменён `mobile/src/features/network/NetworkSwitcher.tsx` — фильтрация сетей по режиму
- Изменён `mobile/src/screens/SettingsScreen.tsx` — добавлен пункт Wallet Mode
- Изменён `mobile/src/screens/HomeScreen.tsx` — индикатор режима в хедере

**Причина:** Пользователь должен иметь возможность переключаться между тестовым режимом (Demo) и реальными транзакциями (Live)

**Функциональность:**
- Demo Mode: доступны только тестовые сети (Sepolia, Holesky)
- Live Mode: доступен только Mainnet, реальные транзакции
- При переключении на Live показывается предупреждение
- Индикатор режима на главном экране

---

### [2025-12-17] Создана система консистентности
**Тип:** Infrastructure  
**Автор:** PM  
**Затронуто:**
- Создан `docs/TRACEABILITY.md` — трассировочная матрица
- Создан `scripts/check-docs-consistency.ts` — валидатор
- Создан `.windsurf/workflows/doc-sync.md` — workflow синхронизации
- Добавлены npm scripts: `docs:check`, `docs:sync`

**Причина:** Необходимость поддержания консистентности между документацией и кодом

---

## Шаблон записи

```markdown
### [YYYY-MM-DD] Краткое описание
**Тип:** Feature | Bugfix | Refactor | Docs | Infrastructure  
**Автор:** Имя или роль  
**Затронуто:**
- Что изменено (файлы, функции, документы)

**Причина:** Почему сделано изменение

**Breaking Changes:** (если есть)
- Что сломается у других

**Migration:** (если нужно)
- Шаги для обновления
```

---

## Типы изменений

| Тип | Когда использовать |
|-----|-------------------|
| **Feature** | Новая функциональность |
| **Bugfix** | Исправление ошибки |
| **Refactor** | Улучшение кода без изменения поведения |
| **Docs** | Изменения только в документации |
| **Infrastructure** | CI/CD, скрипты, конфиги |

---

## Связь с Git

Каждая запись должна соответствовать одному или нескольким коммитам.  
Рекомендуемый формат коммита:

```
[TYPE] Short description

- Detail 1
- Detail 2

Docs: Updated CHANGE-LOG.md
```
