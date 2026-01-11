# Исправление EAS Build для Monorepo

## Проблема
EAS Build падает на фазе "Install dependencies" при работе с pnpm monorepo.

## Решение

### 1. Добавлен `eas-build-pre-install` скрипт в `apps/mobile/package.json`

Этот скрипт выполняется **автоматически** EAS Build перед установкой зависимостей:

```json
{
  "scripts": {
    "eas-build-pre-install": "cd ../.. && corepack enable && corepack prepare pnpm@8.15.0 --activate && pnpm install"
  }
}
```

**Что делает:**
- Переходит в корень monorepo
- Включает corepack
- Устанавливает pnpm нужной версии
- Устанавливает все зависимости workspace

### 2. Упрощён `prebuildCommand` в `eas.json`

Теперь только собирает packages (зависимости уже установлены через pre-install):

```json
{
  "prebuildCommand": "cd ../.. && pnpm --filter @e-y/shared build && pnpm --filter @e-y/crypto build"
}
```

### 3. Настройки в корневом `package.json`

- `packageManager: "pnpm@8.15.0"` - помогает EAS определить менеджер пакетов
- `.npmrc` с `ignore-workspace-root-check=true`

## Проверка

После этих изменений попробуйте:

```bash
cd apps/mobile
eas build --profile development --platform ios
```

## Альтернатива: Локальный build (если EAS всё ещё не работает)

Если EAS Build продолжает падать, можно попробовать локальный build:

```bash
# 1. Убедитесь, что все зависимости установлены
cd /Users/daniillogachev/Ma\ project/E-Y
pnpm install
pnpm --filter @e-y/shared build
pnpm --filter @e-y/crypto build

# 2. Запустите локальный build (требует Xcode)
cd apps/mobile
npx expo run:ios
```

**⚠️ Ограничение:** `npx expo run:ios` может не работать корректно с monorepo, так как он ожидает стандартную структуру Expo проекта.
