# E-Y Security Audit Plan

## Status Legend
- [ ] Not started
- [x] Found
- [F] Fixed

---

## Part 1: Scheduled Payments (COMPLETED)

### CRITICAL

- [x] **C1** — REST API без аутентификации (`x-wallet-address` header не верифицируется)
  - Files: `apps/api/src/scheduled/scheduled.controller.ts` (все endpoints)
  - Impact: Полная имперсонация любого кошелька
  - Fix: Добавить signature-based auth guard (как WS auth)

- [x] **C2** — Execute принимает фейковый tx hash без on-chain проверки
  - File: `apps/api/src/scheduled/scheduled.service.ts:315-360`
  - Impact: Платёж помечается выполненным без реального перевода
  - Fix: Верифицировать receipt on-chain перед пометкой executed

- [x] **C3** — Signed tx не верифицируется на совпадение from == creatorAddress
  - File: `apps/api/src/scheduled/scheduled.service.ts` (create + update)
  - Impact: Можно подсунуть чужую подписанную транзакцию
  - Fix: `Transaction.from(signedTx).from === creatorAddress`

- [x] **C4** — WebSocket пускает без аутентификации (backward compat bypass)
  - File: `apps/api/src/common/ws-auth.guard.ts:43-54, 139-161`
  - Impact: Любой может подписаться на события любого кошелька
  - Fix: Убрать backward-compat bypass, reject unauthenticated

- [x] **C5** — Signed tx утекает через WebSocket events
  - File: `apps/api/src/scheduled/scheduled.gateway.ts:25-60`
  - Impact: Перехват и broadcast чужой подписанной транзакции
  - Fix: Sanitize entity перед отправкой (убрать signedTransaction, nonce, gasPrice)

### HIGH

- [x] **H1** — Double-spend race condition (server cron vs mobile auto-execute)
  - Files: `scheduled.service.ts:710-751`, `useAutoScheduledPayments.ts`
  - Fix: Atomic status check перед выполнением + re-fetch status на клиенте

- [x] **H2** — Amount без числовой валидации (`@IsString()` only)
  - File: `apps/api/src/scheduled/dto/create-scheduled.dto.ts:30-31`
  - Fix: `@Matches(/^\d+(\.\d+)?$/)` + проверка > 0

- [x] **H3** — scheduledAt принимает прошлые даты → мгновенное выполнение
  - File: `apps/api/src/scheduled/dto/create-scheduled.dto.ts:38`
  - Fix: Валидация что дата в будущем (минимум +1 мин)

- [x] **H4** — tokenSymbol принимает любую строку
  - File: `apps/api/src/scheduled/dto/create-scheduled.dto.ts:34-36`
  - Fix: `@MaxLength(10)` + `@Matches(/^[A-Za-z0-9]+$/)`

- [x] **H5** — Mnemonic не очищается из памяти (mobile)
  - File: `apps/mobile/src/hooks/useAutoScheduledPayments.ts:29-36`
  - Fix: Минимизировать scope, tight try/finally

- [x] **H6** — Private key передаётся как string параметр
  - File: `apps/mobile/src/services/scheduled-signing.ts:32-40`
  - Fix: Принимать HDNodeWallet вместо privateKey string

- [x] **H7** — recurringEndDate не проверяется относительно scheduledAt
  - File: `apps/api/src/scheduled/dto/create-scheduled.dto.ts:45-47`
  - Fix: Cross-field validation endDate > scheduledAt

- [x] **H8** — Нет rate limit на WebSocket подписки
  - File: `apps/api/src/common/base-subscription.gateway.ts:90-118`
  - Fix: MAX_SUBSCRIPTIONS_PER_CLIENT = 5

### MEDIUM

- [x] **M1** — signedTransaction не валидируется при update (можно "garbage")
- [x] **M2** — Нет лимита на количество платежей на юзера
- [x] **M3** — Delete разрешён для executed/pending_confirmation
- [x] **M4** — description/recipientName без maxLength
- [x] **M5** — signedTransaction не чистится после выполнения
- [x] **M6** — CORS включает localhost в production (все 6 gateways)
- [x] **M7** — WS auth replay window 5 минут (нет nonce)
- [x] **M8** — Полный entity отправляется получателю
- [x] **M9** — wallet address header не валидируется как ETH адрес формат
- [x] **M10** — Chain ID не проверяется в signed tx vs payment record
- [x] **M11** — Gas price window: type 0 tx не адаптируется к рынку

### LOW

- [x] **L1** — days query param не ограничен
- [x] **L2** — Нет ParseUUIDPipe на path params
- [x] **L3** — estimatedGasPrice не валидируется как число
- [x] **L4** — Полные адреса в логах
- [x] **L5** — /scheduled WebSocket namespace не используется клиентами

---

## Part 2: Global / Cross-Cutting (COMPLETED)

### CRITICAL

- [x] **G-C1** — REST API auth через `x-wallet-address` header без верификации (ВСЕ контроллеры)
  - Files: `split.controller.ts`, `blik.controller.ts`, `preferences.controller.ts`, `ai.gateway.ts`
  - Impact: Полная имперсонация любого кошелька на всех API endpoints
  - Fix: Signature-based auth guard на всех REST endpoints

- [x] **G-C2** — WebSocket backward-compat bypass (ВСЕ gateways)
  - File: `apps/api/src/common/ws-auth.guard.ts:43-54, 139-161`
  - Impact: Любой может подключиться к WS без auth и слушать все события
  - Fix: Убрать backward-compat bypass, reject unauthenticated connections

- [x] **G-C3** — Supabase RLS policies все `USING (true)` — нет row-level security
  - Files: Все таблицы в Supabase (scheduled_payments, split_bills, blik_codes, contacts)
  - Impact: Любой с Supabase anon key может читать/писать ВСЕ данные напрямую
  - Fix: Реальные RLS policies с проверкой wallet address

- [x] **G-C4** — Приватный ключ faucet в plaintext `.env`
  - File: `apps/api/.env` (FAUCET_PRIVATE_KEY)
  - Impact: Утечка .env = полный drain faucet wallet
  - Fix: Vault/secrets manager (Railway secrets, не .env файл)

- [x] **G-C5** — Anthropic API key и Supabase service key в plaintext `.env`
  - File: `apps/api/.env` (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
  - Impact: Полный доступ к AI API + bypass RLS на Supabase
  - Fix: Vault/secrets manager

- [x] **G-C6** — Нет биометрической/PIN аутентификации перед подписью транзакций (mobile)
  - Files: `apps/mobile/src/services/send-service.ts`, `apps/mobile/src/hooks/useAutoScheduledPayments.ts`
  - Impact: Физический доступ к телефону = полный доступ к кошельку
  - Fix: Require biometrics/PIN через `expo-local-authentication` перед каждой подписью


### HIGH

- [x] **G-H1** — Split bills: создатель может менять суммы участников после создания
  - File: `apps/api/src/split/split.service.ts`
  - Impact: Манипуляция суммами после согласия участников
  - Fix: Запретить изменение amounts после первого participant accept

- [x] **G-H2** — BLIK code не имеет rate limit на создание
  - File: `apps/api/src/blik/blik.controller.ts`
  - Impact: Спам-атака, исчерпание ресурсов
  - Fix: Rate limit: max 5 BLIK кодов в минуту

- [x] **G-H3** — BLIK code: нет проверки что redeemer != creator
  - File: `apps/api/src/blik/blik.service.ts`
  - Impact: Создатель может сам redeem свой BLIK код
  - Fix: Проверка redeemer !== creator

- [x] **G-H4** — Contact list: нет изоляции между пользователями
  - File: `packages/shared/src/services/contacts-service.ts`
  - Impact: Пользователь A может видеть контакты пользователя B
  - Fix: Фильтрация по owner wallet address

- [x] **G-H5** — Transaction history: нет фильтрации по wallet на сервере
  - File: `packages/shared/src/services/transaction-history-service.ts`
  - Impact: Можно запросить историю чужого кошелька
  - Fix: Server-side фильтрация + auth check

- [x] **G-H6** — Mnemonic хранится в SecureStore без encryption-at-rest
  - File: `apps/mobile/src/services/wallet-service.ts`
  - Impact: Root на устройстве = доступ к мнемонике
  - Fix: Дополнительный слой шифрования с user PIN/password

- [x] **G-H7** — Web: private key в localStorage (не encrypted)
  - File: `apps/web/src/lib/wallet.ts`
  - Impact: XSS = кража приватного ключа
  - Fix: Использовать Web Crypto API для шифрования или session-only storage

- [x] **G-H8** — Нет rate limiting на REST API (все endpoints)
  - File: `apps/api/src/main.ts`
  - Impact: Brute-force, DoS
  - Fix: `@nestjs/throttler` global guard

- [x] **G-H9** — CORS: `*` origin в production
  - File: `apps/api/src/main.ts`, все gateway files
  - Impact: Любой сайт может делать API calls
  - Fix: Whitelist только production origins


- [x] **G-H11** — Split bill: участник может отправить `paid` статус без on-chain верификации
  - File: `apps/api/src/split/split.service.ts`
  - Impact: Пометка "оплачено" без реального платежа
  - Fix: Верифицировать tx hash on-chain

- [x] **G-H12** — Send flow: нет проверки достаточности баланса перед подписью (web)
  - File: `apps/web/src/lib/send-service.ts`
  - Impact: Подпись транзакции которая гарантированно fail
  - Fix: Pre-check баланс перед подписью

- [x] **G-H13** — AI gateway: prompt injection через user input
  - File: `apps/api/src/ai/ai.gateway.ts`
  - Impact: Манипуляция AI ответами, утечка system prompt
  - Fix: Input sanitization + output validation

### MEDIUM

- [x] **G-M1** — Error messages возвращают stack traces в production
  - File: `apps/api/src/main.ts` (no production error filter)
  - Fix: Global exception filter, sanitize errors в production


- [x] **G-M3** — Split DTO: `amount` как string без numeric validation
  - File: `apps/api/src/split/dto/create-split.dto.ts`
  - Fix: `@Matches(/^\d+(\.\d+)?$/)` + проверка > 0

- [x] **G-M4** — BLIK DTO: `amount` без bounds validation
  - File: `apps/api/src/blik/dto/create-blik.dto.ts`
  - Fix: Min/max amount validation

- [x] **G-M5** — Нет CSRF protection на REST endpoints
  - File: `apps/api/src/main.ts`
  - Fix: CSRF tokens для state-changing operations

- [x] **G-M6** — WebSocket events не throttled (flood protection)
  - File: Все gateway files
  - Fix: Event rate limiting per client

- [x] **G-M7** — `.env` файлы не в `.gitignore` (или были committed)
  - File: `.gitignore`
  - Fix: Убедиться что .env в .gitignore + удалить из git history

- [x] **G-M8** — Supabase anon key в клиентском коде (expected, но risky без RLS)
  - Files: `apps/web/src/lib/supabase.ts`, `apps/mobile/src/config/supabase.ts`
  - Impact: Без реальных RLS policies = прямой доступ к данным
  - Fix: Исправить RLS policies (G-C3) + использовать server-side Supabase client


- [x] **G-M10** — Нет input sanitization для XSS (recipient names, descriptions)
  - Files: Все DTO files + client rendering
  - Fix: Sanitize HTML/script tags в inputs

- [x] **G-M11** — Wallet derivation path hardcoded, не configurable
  - File: `apps/mobile/src/services/wallet-service.ts`
  - Fix: Использовать стандартный BIP-44 path, документировать

- [x] **G-M12** — No Content-Security-Policy headers (web)
  - File: `apps/web/next.config.ts`
  - Fix: Добавить CSP headers

- [x] **G-M13** — API responses include internal IDs and timestamps
  - Files: All service files returning raw entities
  - Fix: Response DTOs с whitelist полей

- [x] **G-M14** — Split bill: нет лимита на количество участников
  - File: `apps/api/src/split/dto/create-split.dto.ts`
  - Fix: `@ArrayMaxSize(50)`

- [x] **G-M15** — Notification tokens stored without encryption
  - File: `apps/api/src/notifications/notifications.service.ts`
  - Fix: Encrypt push tokens at rest

### LOW

- [x] **G-L1** — Console.log statements в production code
  - Files: Various service files
  - Fix: Заменить на structured logger

- [x] **G-L2** — Нет request ID tracking для debugging
  - File: `apps/api/src/main.ts`
  - Fix: Добавить correlation ID middleware

- [x] **G-L3** — Unused WebSocket namespace (/split)
  - Files: `split.gateway.ts`
  - Fix: Удалить или задокументировать

- [x] **G-L4** — No API versioning
  - File: `apps/api/src/main.ts`
  - Fix: Prefix `/api/v1/`

- [x] **G-L5** — TypeORM `synchronize: true` в production
  - File: `apps/api/src/app.module.ts`
  - Fix: `synchronize: false` в production, использовать migrations

- [x] **G-L6** — No health check endpoint
  - File: `apps/api/src/app.controller.ts`
  - Fix: `/health` endpoint для monitoring

- [x] **G-L7** — Package.json scripts expose internal paths
  - File: `apps/api/package.json`
  - Fix: Cleanup scripts, don't expose internal structure

- [x] **G-L8** — No automated dependency vulnerability scanning
  - Fix: Добавить `pnpm audit` в CI pipeline

---

## Part 3: Fix Implementation

### Priority order:
1. **CRITICAL** (Part 1: C1-C5 + Part 2: G-C1-G-C8) — Auth, RLS, secrets, transaction verification
2. **HIGH** (Part 1: H1-H8 + Part 2: G-H1-G-H13) — Race conditions, validation, key handling
3. **MEDIUM** (Part 1: M1-M11 + Part 2: G-M1-G-M15) — Hardening, CORS, data leakage
4. **LOW** (Part 1: L1-L5 + Part 2: G-L1-G-L8) — Cleanup, monitoring

### Summary totals:
| Severity | Part 1 | Part 2 | Total |
|----------|--------|--------|-------|
| Critical | 5 | 6 | 11 |
| High | 8 | 12 | 20 |
| Medium | 11 | 13 | 24 |
| Low | 5 | 8 | 13 |
| **Total** | **29** | **39** | **68** |

---
