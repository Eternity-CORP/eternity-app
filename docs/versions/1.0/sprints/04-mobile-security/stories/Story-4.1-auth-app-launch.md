# S-13: Auth при запуске приложения (background >5min)

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** High  
**Оценка:** 6 часов

---

## Задача

Требовать аутентификацию при возврате в приложение после >5 минут в background.

## Acceptance Criteria

- [ ] `lastAuthenticatedAt` в Zustand (volatile)
- [ ] AppState listener для foreground/background
- [ ] Если `now - lastAuth > 5min` → auth screen
- [ ] Auth screen блокирует контент (нет Skip/Cancel)
- [ ] Biometric prompt автоматически
- [ ] Fallback на PIN после 3 biometric failures
- [ ] Успешная auth даёт 5-min grace period

## Технические заметки

- `expo-local-authentication` для biometric
- `AppState.addEventListener('change', handler)`
- Очищать lastAuth при app termination
