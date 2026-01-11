# EAS Build для Monorepo - Настройка

## Проблема

EAS Build не может разрешить workspace зависимости (`@e-y/shared`, `@e-y/crypto`) при сборке.

## Решение

### 1. Настройка eas.json

Добавлен `prebuildCommand` для:
- Включения corepack (для pnpm)
- Установки pnpm нужной версии
- Установки всех зависимостей
- Сборки workspace packages перед сборкой mobile

### 2. Структура проекта

EAS Build должен видеть:
```
e-y/
├── apps/
│   └── mobile/        # ← EAS работает отсюда
├── packages/
│   ├── shared/        # ← Нужно собрать перед mobile
│   └── crypto/        # ← Нужно собрать перед mobile
├── pnpm-workspace.yaml
├── .npmrc
└── package.json
```

### 3. Команды для сборки

**Development build:**
```bash
cd apps/mobile
eas build --profile development --platform ios
```

**Что происходит:**
1. EAS загружает весь проект (из корня)
2. Выполняет `prebuildCommand`:
   - `cd ../..` - переходит в корень monorepo
   - `corepack enable` - включает corepack
   - `corepack prepare pnpm@8.15.0 --activate` - устанавливает pnpm
   - `pnpm install` - устанавливает все зависимости
   - `pnpm --filter @e-y/shared build` - собирает shared
   - `pnpm --filter @e-y/crypto build` - собирает crypto
3. Затем собирает mobile app

### 4. Альтернатива: Локальная сборка для тестирования

Если EAS Build всё ещё не работает, можно собрать локально:

```bash
# 1. Соберите packages
cd /Users/daniillogachev/Ma\ project/E-Y
pnpm install
pnpm --filter @e-y/shared build
pnpm --filter @e-y/crypto build

# 2. Запустите Expo локально
cd apps/mobile
pnpm start
```

Затем используйте Expo Go или локальный симулятор (но native модули не будут работать без dev build).

### 5. Проверка логов

Если build всё ещё падает, проверьте логи:
- URL из вывода: `https://expo.dev/accounts/eternaki/projects/mobile/builds/...`
- Ищите ошибки в фазе "Install dependencies"

### 6. Возможные проблемы

**Проблема:** "Cannot find module @e-y/shared"
**Решение:** Убедитесь, что:
- `pnpm-workspace.yaml` существует в корне
- `.npmrc` с `node-linker=hoisted` в корне
- `prebuildCommand` выполняется до сборки mobile

**Проблема:** "pnpm not found"
**Решение:** `prebuildCommand` должен включать установку pnpm через corepack

**Проблема:** "Build timeout"
**Решение:** Увеличьте timeout или оптимизируйте prebuildCommand
