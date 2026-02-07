# E-Y Web Version — Design Document

> **Создан:** 2026-02-02
> **Статус:** ✅ Sprint 3 завершён
> **Последнее обновление:** Deep links + History готовы

---

## Все принятые решения

### 1. Архитектура приложения

| Решение | Выбор |
|---------|-------|
| **Фреймворк** | Next.js App Router |
| **Структура** | Отдельное приложение `apps/web/` |
| **URL** | `app.eternity-wallet.vercel.app` (subdomain) |
| **UI библиотека** | shadcn/ui + Tailwind |
| **Анимации** | Framer Motion |
| **PWA** | ❌ Нет (можно добавить позже) |

### 2. Бэкенд

| Решение | Выбор |
|---------|-------|
| **База данных** | Supabase PostgreSQL |
| **NestJS** | ❌ Отказываемся, полная миграция на Supabase |
| **REST API** | Supabase auto-generated |
| **Realtime** | Supabase Realtime (для BLIK) |
| **Custom logic** | Supabase Edge Functions |

### 3. Безопасность

| Решение | Выбор |
|---------|-------|
| **Фаза 1** | Ключи в браузере (testnet only) |
| **Шифрование** | AES-GCM через Web Crypto API |
| **Хранение** | IndexedDB (зашифрованный seed) |
| **Фаза 2** | Mobile as Key (телефон подписывает транзакции) |

### 4. Дизайн и UX

| Решение | Выбор |
|---------|-------|
| **Layout** | Адаптивный: phone-frame на десктопе, fullscreen на мобильном |
| **Стилистика** | Как на сайте: полупрозрачные сетки, градиенты, эффекты |
| **Тема** | Dark по умолчанию + Light |
| **UI компоненты** | shadcn/ui (кастомизированный под наш стиль) |

### 5. Фичи

| Решение | Выбор |
|---------|-------|
| **Deep links** | ✅ Да — `/pay/@username`, `/pay/0x...` |
| **Защита от спама** | Rate limiting + не показывать адрес до connect |
| **QR коды** | Генерация для receive |

---

## Переиспользование кода

### Существующие пакеты (без изменений)

| Пакет | Назначение |
|-------|------------|
| `@e-y/crypto` | Wallet generation, signing, HD derivation |
| `@e-y/shared` | Types (User, Transaction, BlikCode), constants |

### Новые пакеты

| Пакет | Назначение |
|-------|------------|
| `@e-y/ui` | Shared React components (Button, Input, Card, Modal) |
| `@e-y/storage` | Web Crypto + IndexedDB abstraction |

### Из `apps/website/` (вынести в `@e-y/ui`)

- `globals.css` — CSS variables, сетки, градиенты
- `Button.tsx` — кнопки (primary, secondary, outline, ghost)
- `GlitchText.tsx` — эффект сборки текста из символов
- `FadeIn.tsx` — анимации появления
- `ThemeContext.tsx` — переключение темы
- `LoadingScreen.tsx` — экран загрузки с прогрессом

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 PostgreSQL                       │   │
│  │  users, usernames, blik_codes, transactions,    │   │
│  │  preferences, contacts, waitlist                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  REST API    │  │   Realtime   │  │   Edge      │  │
│  │  (auto)      │  │  (BLIK)      │  │  Functions  │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↑
           ┌──────────────┼──────────────┐
           ↓              ↓              ↓
      ┌────────┐    ┌────────┐    ┌──────────┐
      │  WEB   │    │ MOBILE │    │ WEBSITE  │
      │ (app.) │    │ (Expo) │    │(landing) │
      └────────┘    └────────┘    └──────────┘
```

---

## Структура монорепо (целевая)

```
e-y/
├── apps/
│   ├── mobile/              # React Native + Expo
│   ├── web/                 # ← НОВЫЙ: Next.js веб-кошелёк
│   │   ├── src/
│   │   │   ├── app/         # Next.js App Router
│   │   │   │   ├── (auth)/  # Create/Import wallet
│   │   │   │   ├── (main)/  # Dashboard, Send, Receive
│   │   │   │   ├── pay/     # Deep links /pay/@username
│   │   │   │   └── layout.tsx
│   │   │   ├── components/  # Web-specific components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/         # Supabase client, utils
│   │   │   └── styles/      # Tailwind config
│   │   ├── public/
│   │   └── package.json
│   ├── website/             # Marketing landing
├── packages/
│   ├── crypto/              # Wallet, signing (существует)
│   ├── shared/              # Types, constants (существует)
│   ├── ui/                  # ← НОВЫЙ: Shared components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── glitch-text.tsx
│   │   │   ├── fade-in.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   └── storage/             # ← НОВЫЙ: Secure storage
│       ├── src/
│       │   ├── web.ts       # Web Crypto + IndexedDB
│       │   ├── native.ts    # expo-secure-store (future)
│       │   └── index.ts
│       └── package.json
└── docs/
    └── plans/
        └── 2026-02-02-web-version-design.md
```

---

## MVP Scope

### Sprint 1: Foundation

| Задача | Описание | Статус |
|--------|----------|--------|
| Init `apps/web/` | Next.js 16 + Tailwind | ✅ Done |
| Init `packages/ui/` | Button, Input, Card, GlitchText, FadeIn | ✅ Done |
| Init `packages/storage/` | Web Crypto + IndexedDB | ✅ Done |
| Create Wallet | `/create` — seed phrase generation | ✅ Done |
| Import Wallet | `/import` — 12/24 word input | ✅ Done |
| Password setup | `/create/password`, `/import/password` | ✅ Done |
| Unlock screen | `/unlock` — password entry | ✅ Done |
| Wallet dashboard | `/wallet` — balance, send/receive buttons | ✅ Done |

### Sprint 2: Core Features + BLIK

| Задача | Описание | Статус |
|--------|----------|--------|
| Supabase lib | `/lib/supabase.ts` + `/lib/blik.ts` | ✅ Done |
| View Balance | ETH через ethers.js | ✅ Done |
| Send to address | `/wallet/send` — gas, sign, broadcast | ✅ Done |
| Send to @username | Lookup → resolve → send | ✅ Done |
| Receive | `/wallet/receive` — адрес + QR код | ✅ Done |
| BLIK create | `/wallet/blik` — генерация 6-digit кода | ✅ Done |
| BLIK lookup | Ввод кода, поиск отправителя | ✅ Done |
| BLIK matching | Supabase Realtime подписка | ✅ Done |
| BLIK received | `/wallet/blik/received` | ✅ Done |
| Send success | `/wallet/send/success` | ✅ Done |

### Sprint 3: Deep Links + History

| Задача | Описание | Статус |
|--------|----------|--------|
| Deep links | `/pay/[recipient]` — @username и 0x адреса | ✅ Done |
| Transaction history | `/wallet/history` — список транзакций | ✅ Done |
| Save transactions | Сохранение в Supabase при отправке | ✅ Done |
| Redirect support | `/unlock?redirect=...` для deep links | ✅ Done |
| Pre-fill send | `/wallet/send?to=...` параметр | ✅ Done |

---

## Supabase Schema

### Таблицы

```sql
-- Users (wallet addresses)
create table users (
  id uuid primary key default gen_random_uuid(),
  address text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Usernames (@username registry)
create table usernames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  username text unique not null,
  created_at timestamptz default now()
);

-- BLIK codes (P2P transfers)
create table blik_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  sender_address text not null,
  amount text not null,
  token_symbol text default 'ETH',
  status text default 'active', -- active, pending, completed, expired
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Transactions (history)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  hash text unique not null,
  from_address text not null,
  to_address text not null,
  amount text not null,
  token_symbol text default 'ETH',
  status text default 'pending', -- pending, confirmed, failed
  direction text not null, -- sent, received
  created_at timestamptz default now()
);

-- Waitlist (уже существует)
-- contacts, preferences, split_bills — добавим позже
```

### Row Level Security (RLS)

```sql
-- Users can only read/update their own data
alter table users enable row level security;

create policy "Users can read own data"
  on users for select
  using (address = current_setting('app.user_address'));

-- Usernames are public (for lookup)
alter table usernames enable row level security;

create policy "Usernames are public"
  on usernames for select
  using (true);

-- BLIK codes readable by anyone (for matching)
alter table blik_codes enable row level security;

create policy "BLIK codes are public"
  on blik_codes for select
  using (true);
```

---

## Security: Key Storage (Фаза 1)

```typescript
// packages/storage/src/web.ts

import { openDB } from 'idb';

const DB_NAME = 'e-y-wallet';
const STORE_NAME = 'encrypted-keys';

export async function encryptAndSave(
  seedPhrase: string,
  password: string
): Promise<void> {
  // 1. Derive key from password (PBKDF2)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // 2. Encrypt seed phrase (AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(seedPhrase)
  );

  // 3. Save to IndexedDB
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });

  await db.put(STORE_NAME, { salt, iv, encrypted }, 'wallet');
}

export async function loadAndDecrypt(password: string): Promise<string> {
  // Reverse process...
}
```

---

## Deep Links

### Routes

| Route | Описание | Auth required |
|-------|----------|---------------|
| `/pay/@username` | Отправить юзеру по username | Нет (public) |
| `/pay/0x...` | Отправить на адрес | Нет (public) |
| `/blik/:code` | Открыть BLIK код | Нет (public) |

### Защита

```typescript
// middleware.ts (Vercel Edge)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, number[]>();

export function middleware(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const ip = request.ip ?? 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const requests = rateLimit.get(ip) ?? [];
  const recentRequests = requests.filter(t => t > now - windowMs);

  if (recentRequests.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  return NextResponse.next();
}

export const config = {
  matcher: '/pay/:path*',
};
```

---

## Следующие шаги

### Готово к имплементации

1. **Создать `packages/ui/`** — вынести компоненты из website
2. **Создать `packages/storage/`** — Web Crypto + IndexedDB
3. **Создать `apps/web/`** — Next.js + shadcn/ui
4. **Настроить Supabase** — таблицы, RLS, Realtime
5. **Начать Sprint 1** — Create/Import Wallet

### Команда для старта

```bash
# 1. Создать packages/ui
mkdir -p packages/ui/src
cd packages/ui && pnpm init

# 2. Создать apps/web
cd apps && npx create-next-app@latest web --typescript --tailwind --app
cd web && npx shadcn@latest init

# 3. Настроить Turborepo
# Добавить в turbo.json новые пакеты
```

---

## Ссылки

- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Vercel Edge Middleware](https://vercel.com/docs/functions/edge-middleware)
