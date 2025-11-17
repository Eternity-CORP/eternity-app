# 🚀 Запуск E-Y Wallet для разработки

## Быстрый старт

### Вариант 1: Автоматический скрипт (рекомендуется)

```bash
./start.sh
```

Этот скрипт:
- ✅ Проверит зависимости
- ✅ Запустит backend на порту 3000
- ✅ Запустит Expo Metro bundler
- ✅ Откроет Expo DevTools

### Вариант 2: NPM скрипты

```bash
# Запустить backend + mobile (Expo)
npm run dev

# Запустить backend + iOS симулятор
npm run dev:ios

# Запустить backend + Android эмулятор  
npm run dev:android

# Запустить backend + web версию
npm run dev:web
```

## 📱 Что запускается

### 🔧 Backend (NestJS)
- **URL:** http://localhost:3000
- **API:** http://localhost:3000/api
- **Shards API:** http://localhost:3000/api/shards/me
- **Health:** http://localhost:3000/api/health

### 📱 Frontend (Expo)
- **Metro Bundler:** http://localhost:8081
- **Expo DevTools:** автоматически откроется в браузере
- **QR код** для сканирования в Expo Go

## 🛠️ Отдельный запуск

Если нужно запустить сервисы по отдельности:

```bash
# Только backend
npm run backend

# Только mobile
npm run mobile

# Только iOS
npm run mobile:ios

# Только Android
npm run mobile:android

# Только web
npm run mobile:web
```

## 🔧 Настройка

### Backend (.env)
Убедись что в `backend/.env` есть:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/eternity_wallet
JWT_SECRET=change-this-in-prod-32-chars-minimum________________________________
# REDIS_URL=redis://localhost:6379  # Закомментировано - не нужен
MIN_TX_AMOUNT_FOR_SHARD=0.001
MAX_SHARDS_PER_DAY=3
```

### Mobile
Expo настроен автоматически через `mobile/app.json`

## 📊 Логи

При запуске через `npm run dev` увидишь логи обоих сервисов:

```
🔧 [Backend] [Nest] LOG [NestFactory] Starting Nest application...
🔧 [Backend] [Nest] LOG Eternity Wallet backend listening on port 3000
📱 [Mobile] Starting Metro Bundler...
📱 [Mobile] Expo DevTools running at http://localhost:19002
```

## 🧪 Тестирование

После запуска можешь протестировать:

```bash
# Проверить backend
curl http://localhost:3000/api/health

# Протестировать систему шардов
cd backend && ./QUICK_TEST.sh
```

## 🛑 Остановка

Нажми `Ctrl+C` в терминале - остановятся оба сервиса.

## 📱 Подключение к мобильному

### iOS Симулятор
```bash
npm run dev:ios
```

### Android Эмулятор
```bash
npm run dev:android
```

### Физическое устройство
1. Запусти `npm run dev`
2. Установи Expo Go на телефон
3. Отсканируй QR код из терминала или DevTools

## 🔄 Горячая перезагрузка

- **Backend:** Автоматически перезапускается при изменении файлов
- **Mobile:** Hot reload через Metro bundler

## 🐛 Troubleshooting

### Порт 3000 занят
```bash
lsof -ti:3000 | xargs kill -9
```

### Порт 8081 занят (Metro)
```bash
lsof -ti:8081 | xargs kill -9
```

### Проблемы с зависимостями
```bash
npm run clean
npm run install:all
```

### Проблемы с Expo cache
```bash
cd mobile
npx expo start --clear
```

---

**Готово к разработке!** 🎉
