# E-Y Web Version — Development Plan

> **Документ для brainstorm-сессий**
> Каждый раздел — отдельная тема для обсуждения и проработки.

---

## 1. Контекст и мотивация

### Почему Web-first?

- Нет Apple Developer Account → невозможно распространить мобильное приложение
- Веб даёт мгновенный доступ: ссылка → пользователь внутри
- Идеально для демо (EthCC): QR-код на слайде → люди сканируют → пробуют BLIK между собой
- Не нужен TestFlight, APK, Expo Go — ноль барьеров для входа

### Стратегическая роль

- Веб-версия становится **основным клиентом** для Milestone 1
- Мобильное приложение (`apps/mobile/`) остаётся в репозитории, развитие на паузе
- Когда появится Apple Developer Account → выпуск мобильного + модель "телефон как ключ"

### Вопросы для brainstorm:

- Нужен ли нам лендинг/маркетинговый сайт отдельно от самого приложения?
- Какой домен? (app.e-y.xyz, wallet.e-y.xyz, просто e-y.xyz?)
- Будем ли поддерживать мобильный браузер (responsive) или только десктоп?

---

## 2. Архитектура: адаптация монорепо

### Текущая структура

```
e-y/
├── apps/
│   ├── mobile/          # React Native + Expo (на паузе)
│   └── api/             # NestJS Backend (без изменений)
├── packages/
│   ├── @e-y/shared/     # Типы, константы
│   └── @e-y/crypto/     # Кошелёк, подпись, BIP-39
```

### Целевая структура

```
e-y/
├── apps/
│   ├── mobile/          # React Native + Expo (на паузе)
│   ├── web/             # ← НОВЫЙ: Next.js веб-клиент
│   └── api/             # NestJS Backend (общий)
├── packages/
│   ├── @e-y/shared/     # Типы, константы (общие)
│   ├── @e-y/crypto/     # Кошелёк, подпись (общие, без изменений)
│   └── @e-y/storage/    # ← НОВЫЙ: абстракция хранения
│       ├── index.ts     # Общий интерфейс
│       ├── web.ts       # Web Crypto API + IndexedDB
│       └── mobile.ts    # expo-secure-store (будущее)
```

### Вопросы для brainstorm:

- Next.js (App Router) или Vite + React? Что лучше подходит для SPA-кошелька?
- Нужен ли SSR вообще? Или полностью клиентский рендеринг?
- Стилизация: Tailwind CSS? Тот же подход что и NativeWind для мобильного?
- Нужно ли менять что-то в `@e-y/crypto` для работы в браузере?

---

## 3. Безопасность: хранение ключей в браузере

### Подход для Testnet

Testnet = нет реальных денег → допустимый уровень риска ниже чем для mainnet. Но архитектура должна быть готова к усилению для mainnet.

### Схема хранения

```
Пользователь задаёт пароль
        │
        ▼
Seed phrase шифруется через Web Crypto API (AES-GCM)
        │
        ▼
Зашифрованный blob сохраняется в IndexedDB
        │
        ▼
При входе: пароль → расшифровка → seed в памяти
        │
        ▼
При закрытии вкладки: seed удаляется из памяти
```

### Пакет @e-y/storage — единый интерфейс

```typescript
interface SecureStorage {
  saveEncryptedSeed(seed: string, password: string): Promise<void>
  loadDecryptedSeed(password: string): Promise<string>
  hasSavedWallet(): Promise<boolean>
  clearWallet(): Promise<void>
}
```

Одинаковый API → мобильная версия подключает expo-secure-store, веб — Web Crypto + IndexedDB.

### Вопросы для brainstorm:

- Нужен ли session timeout (авто-лок через N минут)?
- Хранить ли зашифрованный seed между сессиями или каждый раз вводить seed phrase?
- Предупреждение пользователю о рисках браузерного хранения — как подать?
- Нужен ли PIN-код как альтернатива длинному паролю?

---

## 4. Функциональный паритет с мобильным MVP

### Что переносим 1:1

| Фича | Зависит от | Приоритет |
|------|-----------|-----------|
| Create Wallet (seed phrase) | `@e-y/crypto` | 🔴 Critical |
| Import Wallet | `@e-y/crypto` | 🔴 Critical |
| Multi-account support | `@e-y/crypto` (HD derivation) | 🟡 High |
| View balances | `ethers.js` + RPC | 🔴 Critical |
| Send to address | `ethers.js` + подпись | 🔴 Critical |
| Send to @username | Backend API | 🔴 Critical |
| Receive (address, QR) | QR-генерация в браузере | 🟡 High |
| BLIK Code Payment | Backend WebSocket | 🔴 Critical |
| Contact Book | Backend API | 🟢 Medium |
| Scheduled Payments | Backend API | 🟢 Medium |
| Split Bill | Backend API | 🟢 Medium |

### Что специфично для веба

| Фича | Описание |
|------|----------|
| Responsive layout | Десктоп + мобильный браузер |
| Keyboard shortcuts | Быстрые действия (Cmd+S → Send) |
| Copy-paste UX | Адреса, BLIK-коды |
| Browser notifications | BLIK matching, входящие переводы |
| Deep links | `e-y.xyz/send/@username`, `e-y.xyz/blik/123456` |

### Вопросы для brainstorm:

- Какой порядок реализации фич? Что в первый спринт?
- QR-код: сканирование через камеру в браузере — стоит ли делать?
- BLIK на вебе — как выглядит UX? Полноэкранный оверлей с кодом?
- Deep links — можем ли мы сделать `e-y.xyz/pay/@danylo` как публичную страницу?

---

## 5. Дизайн и UX для веба

### Адаптация мобильного дизайна

Текущий дизайн-вектор (тёмная тема, градиенты, минимализм а-ля WorldApp) отлично переносится на веб. Но есть нюансы.

### Ключевые решения

- **Layout:** Центрированный контейнер (как мобильный экран) или полноэкранный dashboard?
- **Навигация:** Sidebar? Top bar? Tabs внизу как на мобильном?
- **Экраны:** Один "экран" в центре (phone-frame style) или свободная веб-компоновка?
- **Анимации:** Framer Motion? Тот же feel что и мобильный?

### Вдохновение

- **Phantom Wallet (web)** — кошелёк в стиле расширения, минимальный UI
- **Rabby Wallet (web)** — более dashboard-подход
- **Monobank Web** — banking-like, но минималистичный
- **WorldApp** — текущее вдохновение для мобильного

### Вопросы для brainstorm:

- Phone-frame стиль (узкий контейнер по центру) или полноценный веб-layout?
- Сохраняем ли дизайн-систему 1:1 с мобильным или создаём web-specific?
- Какой UI-фреймворк? shadcn/ui + Tailwind? Radix UI?
- Нужна ли тёмная/светлая тема или только dark?
- Анимации переходов между экранами — важно или нет?

---

## 6. Multi-Device: один кошелёк — любое устройство

### Принцип

Аккаунт привязан к адресу кошелька (`0x...`). Один seed phrase = один кошелёк = одни и те же данные везде.

### Что синхронизируется автоматически

```
                Веб-клиент              Мобильный клиент (будущее)
                    │                           │
                    │     один seed phrase       │
                    │    = один адрес 0x...     │
                    │                           │
                    └───────────┬───────────────┘
                                │
                          NestJS Backend
                                │
                    ┌───────────┴───────────┐
                    │  Аккаунт привязан к   │
                    │  адресу кошелька       │
                    │  ───────────────────── │
                    │  @username             │
                    │  Контакты              │
                    │  BLIK сессии           │
                    │  Scheduled Payments    │
                    │  Split Bill            │
                    │  Настройки             │
                    └───────────────────────┘
                                │
                          Blockchain
                       (баланс, транзакции)
```

### Авторизация на бэкенде

При подключении клиента (веб или мобильный) → challenge-response:
1. Бэкенд отправляет случайный nonce
2. Клиент подписывает nonce приватным ключом
3. Бэкенд верифицирует подпись → аутентификация

Никаких паролей, email, OAuth. Твой ключ = твоя личность. Крипто-нативный подход.

### Вопросы для brainstorm:

- Нужен ли onboarding "привяжи к аккаунту" или это прозрачно?
- Что если пользователь импортирует seed на вебе — и его @username уже занят с мобильного? (конфликтов не будет, потому что адрес тот же, но стоит продумать UX)
- Показывать ли "залогинен с 2 устройств"?
- Нужна ли возможность "отключить все сессии"?

---

## 7. Эволюция: от standalone web к "телефон как ключ"

### Фаза 1: Standalone Web (сейчас → Milestone 1)

- Веб-клиент = полноценный кошелёк
- Ключи хранятся в браузере (зашифрованные)
- Полный функционал: создание, импорт, переводы, BLIK
- Testnet only

### Фаза 2: Mobile Release (Milestone 3 — Mainnet)

- Выпуск мобильного приложения (Apple Developer Account)
- Мобильный = основной клиент с secure enclave
- Веб работает параллельно

### Фаза 3: Phone as Key (Post-Mainnet)

- WhatsApp Web модель для крипто
- Веб показывает QR-код → сканируешь из мобильного → сессия связана
- Веб отправляет intent ("отправить 0.5 ETH на @vasya")
- Мобильный получает push → подтвердил → подписал → отправлено
- Приватный ключ никогда не покидает устройство
- Веб становится "пультом управления", телефон — "сейфом"

### Вопросы для brainstorm:

- В Фазе 1, показывать ли в UI что "в будущем можно подключить телефон как ключ"?
- Как мигрировать пользователей с Фазы 1 (ключи в браузере) на Фазу 3 (ключи на телефоне)?
- WebSocket между мобильным и вебом — через бэкенд (проще) или peer-to-peer (сложнее)?

---

## 8. Технический стек для apps/web

### Предлагаемый стек

| Слой | Технология | Почему |
|------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR/SSG опционально, отличный DX |
| Стилизация | Tailwind CSS + shadcn/ui | Уже в рассмотрении для проекта |
| State | Redux Toolkit | Единый подход с мобильным |
| Blockchain | ethers.js v6 | Уже в проекте, работает в браузере |
| Real-time | WebSocket (native / Socket.io) | Уже есть для BLIK |
| QR | qrcode.react | Генерация QR для receive |
| Crypto | Web Crypto API | Шифрование seed phrase |
| Storage | IndexedDB (via idb) | Зашифрованное хранение |

### Вопросы для brainstorm:

- Next.js vs Vite+React — финальное решение?
- Socket.io или нативные WebSockets?
- Нужен ли PWA (Progressive Web App) — установка на домашний экран?
- Хостинг: Vercel (бесплатно для Next.js), Cloudflare Pages, или свой?
- CI/CD: GitHub Actions → автодеплой?

---

## 9. Порядок реализации (Sprint Plan)

### Sprint 1: Foundation

- [ ] Инициализация `apps/web/` (Next.js + Tailwind + shadcn/ui)
- [ ] Настройка Turborepo для нового пакета
- [ ] Создание `@e-y/storage` пакета с web-реализацией
- [ ] Базовый layout (навигация, тема, responsive)
- [ ] Create Wallet flow (seed → шифрование → сохранение)
- [ ] Import Wallet flow

### Sprint 2: Core Transfers

- [ ] Dashboard (балансы, аккаунты)
- [ ] Send to address flow
- [ ] Send to @username flow
- [ ] Receive (адрес + QR-код)
- [ ] Transaction history

### Sprint 3: BLIK + Features

- [ ] BLIK Code Payment (WebSocket интеграция)
- [ ] Contact Book
- [ ] Scheduled Payments UI
- [ ] Split Bill UI

### Sprint 4: Polish

- [ ] Animations и transitions
- [ ] Error handling и edge cases
- [ ] Browser notifications
- [ ] Testing на разных браузерах
- [ ] Deploy на production домен

### Вопросы для brainstorm:

- Реалистичны ли эти спринты? Сколько времени на каждый?
- Что можно вырезать из MVP веб-версии?
- Нужна ли фича "Testnet Faucet" прямо в UI? (получить тестовые ETH)
- Какой минимум для "можно показать людям"?

---

## 10. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| XSS-атака → утечка ключей | Средняя | Критическое | CSP headers, sanitization, Web Crypto (ключ не экстрактируемый) |
| Браузерная совместимость | Низкая | Средняя | Тестирование Chrome/Firefox/Safari, progressive enhancement |
| Производительность ethers.js в браузере | Низкая | Средняя | Lazy loading, web workers для тяжёлых операций |
| Распыление фокуса (web + mobile) | Высокая | Высокая | Mobile на паузе, 100% фокус на web |
| IndexedDB limitations | Низкая | Средняя | Fallback на encrypted localStorage |
| Пользователи теряют пароль → теряют seed | Высокая | Критическое | Seed phrase backup flow, предупреждения |

### Вопросы для brainstorm:

- Какие ещё риски не учтены?
- Приоритет между безопасностью и UX для testnet?
- Нужен ли "recovery" сценарий если пользователь забыл пароль?

---

## Следующие шаги

1. **Brainstorm по каждому разделу** — пройти пункт за пунктом
2. **Зафиксировать решения** — обновить architecture.md и PRD
3. **Создать эпики и stories** — разбить на конкретные задачи
4. **Начать Sprint 1** — foundation для `apps/web/`
