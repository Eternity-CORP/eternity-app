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

# Проверяем что установлены зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

echo "🔧 Backend: http://localhost:3000"
echo "📱 Mobile: Expo DevTools will open"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Запускаем оба сервиса
npm run dev
