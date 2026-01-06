# S-17: PIN lockout + biometric fallback

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** High  
**Оценка:** 6 часов

---

## Задача

Реализовать lockout после неудачных попыток PIN.

## Acceptance Criteria

- [ ] Счётчик failed attempts в AsyncStorage
- [ ] 1-2 wrong: "Неверный PIN. Попробуйте снова."
- [ ] 3 wrong: "Неверный PIN. Осталось 2 попытки."
- [ ] 4 wrong: "Неверный PIN. Осталось 1 попытка."
- [ ] 5 wrong: Lockout 30 сек, только biometric
- [ ] После biometric success → reset counter
- [ ] Counter persists across app restarts

## Lockout UI

```
❌ Слишком много попыток

PIN заблокирован на 30 секунд.
Используйте биометрию для разблокировки.

[Use Biometric]
```

## Технические заметки

- `failedPinAttempts` в AsyncStorage
- `lockoutUntil` timestamp
- Будущее: exponential backoff (5→30s, 10→5min, 15→30min)
