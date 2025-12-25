#!/bin/bash

# 🚀 E-Y Wallet Development Starter
# Запускает backend и frontend одновременно

echo "🚀 Starting E-Y Wallet Development Environment..."
echo ""

# Проверяем что находимся в корне проекта
if [ ! -f "package.json" ]; then
    echo "❌ Запустите скрипт из корня проекта E-Y"
    exit 1
fi

# Проверяем PostgreSQL
echo "🔍 Checking PostgreSQL..."
if ! PGPASSWORD=postgres psql -U postgres -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ PostgreSQL не запущен!"
    echo "   Запустите: brew services start postgresql@14"
    exit 1
fi
echo "✅ PostgreSQL running"

# Проверяем базу данных
echo "🔍 Checking database..."
if ! PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ База данных 'eternity_wallet' не найдена!"
    echo "   Создайте базу или проверьте DATABASE_URL в backend/.env"
    exit 1
fi
echo "✅ Database connected"

# Проверяем миграцию
echo "🔍 Checking migrations..."
if ! PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -c "SELECT 1 FROM information_schema.columns WHERE table_name='user_wallets' AND column_name='is_active';" | grep -q "1 row"; then
    echo "⚠️  Миграция не применена!"
    echo "   Запустите: cd backend && PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -f migrations/006_add_wallet_active_status.sql"
    read -p "   Хотите применить сейчас? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd backend
        PGPASSWORD=postgres psql -U postgres -h localhost -d eternity_wallet -f migrations/006_add_wallet_active_status.sql
        cd ..
        echo "✅ Migration applied"
    else
        exit 1
    fi
else
    echo "✅ Migrations up to date"
fi

# Проверяем что установлены зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Backend: http://localhost:3000"
echo "📱 Mobile: Expo DevTools will open"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Запускаем оба сервиса
npm run dev
