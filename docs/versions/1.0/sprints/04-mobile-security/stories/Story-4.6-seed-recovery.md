# S-18: Seed phrase recovery при полной блокировке

**Epic:** EPIC-04 (Мобильная безопасность)  
**Приоритет:** High  
**Оценка:** 4 часа

---

## Задача

Обеспечить recovery path когда PIN lockout + нет biometric.

## Acceptance Criteria

- [ ] Если нет biometric И PIN locked → seed phrase recovery
- [ ] UI: "Введите seed phrase для разблокировки"
- [ ] Валидация: derived address == stored address
- [ ] Success → wallet restored, PIN reset flow
- [ ] Telemetry: логировать recovery events

## Recovery Flow

```
PIN locked + No biometric
         ↓
"Enter your seed phrase to unlock"
         ↓
Validate (derive address, compare)
         ↓
Success → Reset PIN → Home
```

## UI

```
🔒 Кошелёк заблокирован

Введите вашу seed phrase (12 слов) 
для восстановления доступа.

[Word 1] [Word 2] [Word 3] ...

[Recover Wallet]
```

## Технические заметки

- Использовать существующий ImportWalletScreen flow
- После recovery → force new PIN setup
