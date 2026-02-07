# E-Y Growth Agents — Shared Context

> Общий контекст для всех growth агентов

---

## О проекте E-Y

**E-Y** — криптокошелёк с радикально простым UX.

### Ключевые фичи

1. **BLIK-коды** — 6-значный код вместо адресов (первый в мире для крипто)
2. **Network Abstraction** — пользователь видит "USDC", не "USDC (Polygon)"
3. **Bank-like UX** — интерфейс как у Monobank
4. **Self-custody** — ключи только у пользователя

### Value Proposition

> "Дай код — получи деньги. Никаких адресов."

### Целевая аудитория

| Персона | Описание | Боль |
|---------|----------|------|
| Newcomer (Оксана) | Первый опыт с криптой | Страх потерять деньги |
| Recipient (Андрей) | Принимает оплату в крипте | Не понимает адреса/сети |
| Power User (Макс) | Опытный, хочет привести друзей | Нет простого кошелька для рекомендации |

### Tech Stack

- Mobile: Expo + React Native + TypeScript
- Blockchain: Polygon, Base, Arbitrum (Sepolia testnet для MVP)
- Backend: NestJS (минимальный — только @username и BLIK координация)

---

## Текущий статус

**Фаза:** Pre-launch / Beta preparation

**Файлы для проверки:**
- `docs/growth/status.md` — текущие метрики и задачи
- `docs/growth/calendar.md` — дедлайны
- `docs/growth/opportunities.md` — гранты и акселераторы
- `docs/growth/content-log.md` — опубликованный контент

---

## Приоритеты (в порядке важности)

1. **Гранты** — бесплатные деньги без dilution
   - Polygon Grant (приоритет #1)
   - Base Grant
   - Ukrainian Startup Fund

2. **Бета-тестеры** — 50 человек за 2-3 недели
   - Twitter build-in-public
   - Personal contacts

3. **Акселераторы** — после 50+ тестеров
   - Alliance DAO
   - Outlier Ventures

---

## Тон коммуникации

### Для контента:
- **Twitter (EN):** Confident but humble, build-in-public, no hype
- **Grants/Investors:** Professional, data-driven, specific about ask

### Ключевые сообщения:
- "BLIK for crypto" — главная метафора
- "6 digits instead of addresses" — конкретная польза
- "No network selection" — отсутствие сложности
- "Bank-like UX for self-custody" — безопасность + простота

---

## Файлы документации

| Файл | Содержание |
|------|------------|
| `docs/v1.0/prd.md` | Product Requirements — фичи, требования |
| `docs/v1.0/architecture.md` | Техническая архитектура |
| `docs/growth/first-users.md` | Стратегия привлечения пользователей |
| `docs/growth/fundraising.md` | Гид по грантам и инвесторам |

---

## Правила для агентов

1. **Всегда проверяй status.md** перед генерацией плана
2. **Логируй контент** в content-log.md после публикации
3. **Обновляй opportunities.md** при изменении статуса заявок
4. **Используй шаблоны** из docs/growth/templates/
5. **Предлагай 2-3 варианта** для контента (пользователь выберет)
6. **Спрашивай подтверждение** перед действиями

---

## Метрики успеха

| Метрика | Текущая | Цель (4 недели) |
|---------|---------|-----------------|
| Beta testers | 0 | 50 |
| Twitter followers | 0 | 200 |
| Transactions | 0 | 200 |
| Grants submitted | 0 | 2-3 |
