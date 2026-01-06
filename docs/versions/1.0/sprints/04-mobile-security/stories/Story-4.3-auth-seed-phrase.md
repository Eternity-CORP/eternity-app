# S-15: Auth для просмотра seed phrase

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Защитить seed phrase дополнительной аутентификацией.

## Acceptance Criteria

- [ ] "View Seed Phrase" → biometric prompt
- [ ] Prompt: "Authenticate to view your seed phrase"
- [ ] Security warnings на экране seed phrase
- [ ] Auto-lock через 30 сек idle
- [ ] Screenshot prevention (FLAG_SECURE / expo-screen-capture)

## Security Warnings

```
⚠️ Никогда не делитесь seed phrase
⚠️ E-Y никогда не попросит seed phrase
⚠️ Скриншоты отключены
```

## Технические заметки

- `expo-secure-store` для retrieval
- `expo-screen-capture.preventScreenCaptureAsync()`
- 30-сек таймер на экране
