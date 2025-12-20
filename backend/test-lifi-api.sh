#!/bin/bash

# Скрипт для быстрой проверки LI.FI API ключа
# Использование: ./test-lifi-api.sh

echo "🔍 Testing LI.FI API Key..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with LIFI_API_KEY"
    exit 1
fi

# Проверка наличия LIFI_API_KEY в .env
if ! grep -q "LIFI_API_KEY" .env; then
    echo "❌ Error: LIFI_API_KEY not found in .env"
    echo "Please add: LIFI_API_KEY=your_api_key_here"
    exit 1
fi

echo "✅ .env file found"
echo "✅ LIFI_API_KEY configured"
echo ""

# Запуск быстрого теста
echo "Running quick API validation test..."
echo ""

npm test -- LifiRouter.integration --testNamePattern="Quick API Key Check"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
