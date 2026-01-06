# S-14: Auth перед подтверждением транзакции

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Требовать biometric/PIN перед каждой транзакцией.

## Acceptance Criteria

- [ ] "Confirm Send" → biometric prompt
- [ ] Prompt message: "Authenticate to send X USDC to @recipient"
- [ ] Auth failure → можно retry или Cancel
- [ ] 3 failures → транзакция отменяется
- [ ] Cross-chain тоже требует auth
- [ ] BLIK payment требует auth

## Flow

```
Review tx → Tap "Confirm" → Biometric → Sign tx → Execute
                              ↓
                         PIN fallback
```

## Технические заметки

- НЕ кэшировать auth для транзакций (всегда re-prompt)
- Custom message для контекста
