#!/bin/bash

# 🌐 E-Y Wallet Tunnel Development Starter
# Запускает backend и mobile через tunnel (доступ из любой точки мира)

echo "🌐 Starting E-Y Wallet with Tunnel Access..."
echo ""

# Проверяем что находимся в корне проекта
if [ ! -f "package.json" ]; then
    echo "❌ Запустите скрипт из корня проекта E-Y"
    exit 1
fi

# Проверяем и запускаем PostgreSQL
echo "🔍 Checking PostgreSQL..."
if ! PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⏳ PostgreSQL не запущен, запускаю..."
    brew services start postgresql@14
    
    # Ждём запуска PostgreSQL (до 30 секунд)
    for i in {1..30}; do
        if PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Проверяем ещё раз
    if ! PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ Не удалось запустить PostgreSQL!"
        exit 1
    fi
fi
echo "✅ PostgreSQL running"

# Проверяем и создаём базу данных
echo "🔍 Checking database..."
if ! PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⏳ База данных 'eternity_wallet' не найдена, создаю..."
    PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE eternity_wallet;" 2>/dev/null
    
    if ! PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -c "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ Не удалось создать базу данных!"
        exit 1
    fi
    echo "✅ Database created"
fi
echo "✅ Database connected"

# Проверяем и запускаем Redis
echo "🔍 Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⏳ Redis не запущен, запускаю..."
    brew services start redis
    
    # Ждём запуска Redis (до 10 секунд)
    for i in {1..10}; do
        if redis-cli ping > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "⚠️  Redis не запустился, backend может работать без него"
    fi
fi
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis running"
fi

# Проверяем что установлены зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Файл для хранения tunnel URL
TUNNEL_URL_FILE="/tmp/ey-backend-tunnel-url.txt"
rm -f "$TUNNEL_URL_FILE"

# Функция для очистки процессов при выходе
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    kill $METRO_TUNNEL_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    rm -f "$TUNNEL_URL_FILE"
    # Убиваем все ngrok процессы
    pkill -f "ngrok" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запускаем backend с Redis URL
echo "🚀 Starting Backend..."
cd backend
REDIS_URL="redis://localhost:6379" npm run start:dev &
BACKEND_PID=$!
cd ..

# Ждём пока backend запустится
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Проверяем что backend работает
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  Backend may still be starting, continuing..."
fi

# Создаём ngrok конфиг для двух туннелей (добавляем к существующему)
NGROK_CONFIG="/tmp/ey-ngrok.yml"
NGROK_DEFAULT_CONFIG="$HOME/Library/Application Support/ngrok/ngrok.yml"
cat > "$NGROK_CONFIG" << EOF
version: "3"
agent:
    authtoken: 1wfh5hn1IoO8nCWp7DJLhUVZyXR_2E21CVyTewzieXefhi8k5
tunnels:
  backend:
    addr: 3000
    proto: http
  metro:
    addr: 8081
    proto: http
EOF

# Запускаем ngrok с двумя туннелями
echo "🚇 Starting Tunnels (ngrok)..."
ngrok start --all --config "$NGROK_CONFIG" > /tmp/ey-tunnel-output.txt 2>&1 &
TUNNEL_PID=$!

# Ждём получения tunnel URLs (до 30 секунд)
echo "⏳ Waiting for tunnel URLs..."
BACKEND_TUNNEL_URL=""
METRO_TUNNEL_URL=""
for i in {1..30}; do
    # Получаем URLs через ngrok API с правильным парсингом по имени туннеля
    TUNNELS_JSON=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    if [ -n "$TUNNELS_JSON" ]; then
        BACKEND_TUNNEL_URL=$(echo "$TUNNELS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((t['public_url'] for t in d.get('tunnels',[]) if t.get('name')=='backend'), ''))" 2>/dev/null)
        METRO_TUNNEL_URL=$(echo "$TUNNELS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((t['public_url'] for t in d.get('tunnels',[]) if t.get('name')=='metro'), ''))" 2>/dev/null)
        if [ -n "$BACKEND_TUNNEL_URL" ] && [ -n "$METRO_TUNNEL_URL" ]; then
            break
        fi
    fi
    sleep 1
done

if [ -z "$BACKEND_TUNNEL_URL" ]; then
    echo "❌ Не удалось получить tunnel URL!"
    echo "   Убедитесь что ngrok настроен: ngrok config add-authtoken YOUR_TOKEN"
    cleanup
    exit 1
fi

echo "$BACKEND_TUNNEL_URL" > "$TUNNEL_URL_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All services starting!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Backend Local:  http://localhost:3000"
echo "🌐 Backend Tunnel: $BACKEND_TUNNEL_URL"
echo ""
echo "📱 Metro Local:    http://localhost:8081"
echo "🌐 Metro Tunnel:   $METRO_TUNNEL_URL"
echo ""
echo "📲 Для подключения с телефона:"
echo "   1. Откройте Expo Go"
echo "   2. Введите URL: exp+ey-wallet://expo-development-client/?url=$METRO_TUNNEL_URL"
echo "   ИЛИ отсканируйте QR код ниже"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Запускаем mobile БЕЗ tunnel (используем ngrok)
echo "🚀 Starting Mobile (Metro bundler)..."
cd mobile
EXPO_PUBLIC_API_BASE_URL="$BACKEND_TUNNEL_URL/api" npx expo start --clear &
MOBILE_PID=$!
cd ..

# Ждём завершения
wait
