# E-Y Testing Guide

## Варианты запуска приложения

### ⚠️ Важно: Native модули

Проект использует модули, которые **не работают в Expo Go**:
- `expo-secure-store` - для безопасного хранения seed phrases
- `expo-dev-client` - для development builds
- `expo-local-authentication` - биометрическая аутентификация
- `expo-camera` - сканирование QR кодов

**Вывод:** Для полноценного тестирования нужен **Development Build**.

---

## Вариант 1: Expo Go (ограниченный)

**Ограничения:**
- ❌ `expo-secure-store` не работает → кошелёк не сохранится
- ❌ `expo-local-authentication` не работает
- ✅ Базовый UI можно проверить
- ✅ Навигация работает

**Как запустить:**

```bash
cd apps/mobile
pnpm start:go
# или
npx expo start
```

**Что делать:**
1. Установите Expo Go на телефон (App Store / Play Store)
2. Откройте Expo Go
3. Отсканируйте QR-код из терминала
4. ⚠️ При попытке сохранить кошелёк будет ошибка

**Использование:** Только для проверки UI/навигации, не для функционального тестирования.

---

## Вариант 2: Development Build (рекомендуется)

**Требования:**
- EAS CLI установлен
- Аккаунт Expo (бесплатный)

### Шаг 1: Установка EAS CLI

```bash
npm install -g eas-cli
# или
pnpm add -g eas-cli
```

### Шаг 2: Вход в Expo

```bash
eas login
```

### Шаг 3: Настройка EAS Build

```bash
cd apps/mobile
eas build:configure
```

Это создаст/обновит `eas.json`.

### Шаг 4: Создание Development Build

**Для iOS Simulator (быстро, не нужен Apple Developer):**
```bash
eas build --profile development --platform ios
```

**Для Android Emulator:**
```bash
eas build --profile development --platform android
```

**Для обоих:**
```bash
eas build --profile development --platform all
```

**Время сборки:** ~10-15 минут (первый раз)

### Шаг 5: Установка build на устройство/эмулятор

После завершения сборки:

**iOS Simulator:**
```bash
eas build:run --platform ios --latest
```

**Android Emulator:**
```bash
eas build:run --platform android --latest
```

**Или вручную:**
- iOS: Скачайте `.ipa` и установите через Xcode
- Android: Скачайте `.apk` и установите на эмулятор

### Шаг 6: Запуск dev server

```bash
cd apps/mobile
pnpm start
# или
npx expo start --dev-client
```

Build автоматически подключится к dev server.

---

## Вариант 3: Expo Orbit (управление симуляторами)

**Что это:** macOS приложение для управления симуляторами и быстрого запуска builds.

### Установка Expo Orbit

```bash
brew install expo-orbit
```

**Требования:**
- macOS
- Xcode (для iOS)
- Android Studio (для Android)

### Использование

1. Запустите Expo Orbit из Applications
2. Orbit появится в меню бар (верхняя панель)
3. Через Orbit можно:
   - Запустить iOS Simulator
   - Запустить Android Emulator
   - Установить development build
   - Запустить dev server

**После установки build:**
- Orbit автоматически определит установленный build
- Можно запустить dev server через Orbit
- Build подключится автоматически

---

## Вариант 4: Локальный эмулятор (без EAS)

**Для iOS Simulator:**

```bash
# Убедитесь, что Xcode установлен
xcode-select --install

# Запустите симулятор
open -a Simulator

# Запустите Expo
cd apps/mobile
pnpm ios
# или
npx expo start --ios
```

**Для Android Emulator:**

```bash
# Убедитесь, что Android Studio установлен
# Запустите эмулятор через Android Studio

# Запустите Expo
cd apps/mobile
pnpm android
# или
npx expo start --android
```

**⚠️ Ограничение:** Без development build native модули не будут работать.

---

## Рекомендуемый workflow для Story 2.1

### Для быстрого тестирования UI:

1. **Expo Go:**
   ```bash
   cd apps/mobile
   pnpm start:go
   ```
   - Проверьте навигацию
   - Проверьте UI экранов
   - ⚠️ Сохранение кошелька не будет работать

### Для полноценного тестирования:

1. **Создайте Development Build:**
   ```bash
   cd apps/mobile
   eas build --profile development --platform ios
   ```

2. **Установите на симулятор:**
   ```bash
   eas build:run --platform ios --latest
   ```

3. **Запустите dev server:**
   ```bash
   pnpm start
   ```

4. **Тестируйте:**
   - Создание кошелька
   - Сохранение seed phrase
   - Верификация
   - Навигация

---

## Troubleshooting

### "expo-secure-store is not available in Expo Go"

**Решение:** Используйте Development Build.

### "Cannot connect to Metro bundler"

**Решение:**
```bash
# Очистите кеш
pnpm start --clear
# или
npx expo start --clear
```

### "Build failed" в EAS

**Решение:** Проверьте логи в EAS Dashboard или:
```bash
eas build:list
```

### Симулятор не запускается

**iOS:**
```bash
# Проверьте Xcode
xcode-select --print-path

# Переустановите Xcode Command Line Tools
sudo xcode-select --reset
```

**Android:**
- Убедитесь, что Android Studio установлен
- Запустите эмулятор через Android Studio вручную

---

## Команды для быстрого доступа

```bash
# Expo Go (ограниченный)
cd apps/mobile && pnpm start:go

# Development Build (полный)
cd apps/mobile && pnpm start

# iOS Simulator
cd apps/mobile && pnpm ios

# Android Emulator
cd apps/mobile && pnpm android

# Создать development build
cd apps/mobile && eas build --profile development --platform ios

# Установить build на симулятор
eas build:run --platform ios --latest
```
