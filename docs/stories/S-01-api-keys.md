# S-01: Получить API ключи LiFi и Rango

**Epic:** EPIC-01 (Инфраструктура трансферов)  
**Приоритет:** Critical  
**Оценка:** 4 часа

---

## Задача

Получить API ключи для LiFi и Rango, настроить их в backend.

## Acceptance Criteria

- [ ] Зарегистрироваться на https://li.fi/, получить API ключ
- [ ] Зарегистрироваться на https://rango.exchange/, получить API ключ
- [ ] Добавить ключи в `backend/.env` (НЕ коммитить)
- [ ] Проверить что backend делает authenticated запросы

## Файлы

- `backend/.env.example` — placeholders
- `backend/src/services/routers/LifiRouter.service.ts`
- `backend/src/services/routers/RangoRouter.service.ts`

## Заметки

- LiFi: ключ опционален для dev, обязателен для prod
- Rango: ключ обязателен всегда
- Socket: отложен до post-MVP
