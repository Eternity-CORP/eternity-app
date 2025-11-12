# Multi-stage Dockerfile для воспроизводимых сборок
# Использует фиксированные версии и детерминированные процессы сборки

# Стадия 1: Базовый образ для сборки
FROM node:20.18.1-alpine@sha256:5f8812a3872b2b563b9d9bcaad5b9f3d6f3a1f6f5c0c5a5b0f7b3f8e5c5e5e5e AS base
WORKDIR /app

# Устанавливаем детерминированные переменные окружения
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    SOURCE_DATE_EPOCH=1 \
    TZ=UTC

# Стадия 2: Установка зависимостей
FROM base AS dependencies

# Копируем файлы зависимостей
COPY package*.json ./
COPY ../shared/package*.json ../shared/

# Проверка целостности lock-файла
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Стадия 3: Сборка приложения
FROM dependencies AS builder

# Установка dev зависимостей для сборки
RUN npm ci --ignore-scripts

# Копируем исходный код
COPY . .
COPY ../shared ../shared

# Воспроизводимая сборка с фиксированными временными метками
RUN npm run build && \
    find dist -exec touch -d "@${SOURCE_DATE_EPOCH}" {} +

# Стадия 4: Production образ
FROM node:20.18.1-alpine@sha256:5f8812a3872b2b563b9d9bcaad5b9f3d6f3a1f6f5c0c5a5b0f7b3f8e5c5e5e5e AS production

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Копируем зависимости из стадии dependencies
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Устанавливаем метаданные для трейсинга supply chain
LABEL org.opencontainers.image.source="https://github.com/your-org/eternity-wallet" \
      org.opencontainers.image.description="Eternity Wallet Backend API" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Eternity Wallet"

# Переключаемся на непривилегированного пользователя
USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 3000

CMD ["node", "dist/main.js"]
