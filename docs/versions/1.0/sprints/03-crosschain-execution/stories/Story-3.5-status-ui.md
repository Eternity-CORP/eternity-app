# S-10: CrosschainExecutionScreen UI статусов

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** High  
**Оценка:** 8 часов

---

## Задача

Создать экран мониторинга статуса cross-chain транзакции.

## Acceptance Criteria

- [ ] Создать `CrosschainExecutionScreen.tsx`
- [ ] Анимированный прогресс: Source → Bridge → Destination
- [ ] Real-time обновления статуса
- [ ] Estimated time remaining
- [ ] "View on Explorer" для каждого шага
- [ ] Confetti на completion
- [ ] Shard notification если qualifying action

## UI States

| Статус | UI |
|--------|-----|
| PENDING | Spinner на Source |
| SOURCE_DONE | ✓ Source, Spinner на Bridge |
| BRIDGE_PENDING | ✓ Source, "Bridging..." |
| DEST_PENDING | ✓ Source, ✓ Bridge, Spinner на Dest |
| COMPLETED | ✓ все + Confetti |
| FAILED | ✗ + Error message |

## Error UI

- Source fail: "Транзакция не отправлена. Повторить?"
- Bridge hang: "Задержка моста. Мосты могут занять 10-30 мин."
- Dest fail: "Мост прошёл, ожидание на destination."
