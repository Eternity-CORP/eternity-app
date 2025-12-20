# S-16: Auth для изменения security settings

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** High  
**Оценка:** 4 часа

---

## Задача

Защитить изменение security настроек аутентификацией.

## Acceptance Criteria

- [ ] Отключение biometric/PIN → auth required
- [ ] Смена PIN → auth + текущий PIN + новый PIN x2
- [ ] Reset biometric → auth
- [ ] Warning перед отключением security

## Warning Dialog

```
"Вы уверены что хотите отключить аутентификацию? 
Это сделает кошелёк менее защищённым."

[Cancel] [Disable (requires auth)]
```

## Технические заметки

- Логировать security changes в telemetry
- Один auth prompt за раз (не стекать)
