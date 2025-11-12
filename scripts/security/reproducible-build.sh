#!/bin/bash
# Скрипт для воспроизводимой сборки
# Обеспечивает идентичные бинарные артефакты при повторных сборках

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Устанавливаем детерминированные переменные окружения
setup_reproducible_env() {
    log_section "Настройка окружения для воспроизводимой сборки"

    # Фиксированная временная метка (epoch)
    export SOURCE_DATE_EPOCH=1
    export TZ=UTC

    # Node.js специфичные настройки
    export NODE_ENV=production
    export NPM_CONFIG_UPDATE_NOTIFIER=false
    export NPM_CONFIG_FUND=false

    # Отключаем случайность в процессах сборки
    export PYTHONHASHSEED=0

    log_info "SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH"
    log_info "TZ=$TZ"
    log_info "NODE_ENV=$NODE_ENV"
}

# Очистка перед сборкой
clean_before_build() {
    log_section "Очистка предыдущих артефактов"

    rm -rf backend/dist
    rm -rf backend/node_modules/.cache

    log_info "Очистка завершена"
}

# Установка зависимостей
install_dependencies() {
    log_section "Установка зависимостей"

    log_info "Установка зависимостей с проверкой целостности..."

    npm ci --ignore-scripts

    log_info "Зависимости установлены"
}

# Сборка backend
build_backend() {
    log_section "Сборка backend"

    cd backend

    log_info "Запуск сборки..."
    npm run build

    log_info "Нормализация временных меток..."
    # Устанавливаем фиксированные временные метки для всех файлов
    find dist -type f -exec touch -d "@${SOURCE_DATE_EPOCH}" {} +

    cd ..

    log_info "Сборка backend завершена"
}

# Создание архива с детерминированным порядком
create_reproducible_archive() {
    log_section "Создание воспроизводимого архива"

    local archive_name="backend-build-$(date +%Y%m%d%H%M%S).tar.gz"

    cd backend/dist

    # tar с сортировкой и фиксированными метками времени
    tar \
        --sort=name \
        --mtime="1970-01-01 00:00:00 UTC" \
        --owner=0 \
        --group=0 \
        --numeric-owner \
        -czf "../${archive_name}" \
        .

    cd ../..

    log_info "Архив создан: backend/${archive_name}"
    echo "backend/${archive_name}"
}

# Вычисление хеша
calculate_hash() {
    local archive="$1"

    log_section "Вычисление хеша"

    local hash
    hash=$(sha256sum "$archive" | cut -d' ' -f1)

    echo "$hash" > "${archive}.sha256"

    log_info "SHA256: $hash"
    log_info "Хеш сохранен в: ${archive}.sha256"

    echo "$hash"
}

# Генерация манифеста сборки
generate_build_manifest() {
    local archive="$1"
    local hash="$2"

    log_section "Генерация манифеста сборки"

    local manifest_file="${archive}.manifest.json"

    cat > "$manifest_file" <<EOF
{
  "artifact": "$(basename "$archive")",
  "sha256": "$hash",
  "build_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_date_epoch": $SOURCE_DATE_EPOCH,
  "environment": {
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)",
    "os": "$(uname -s)",
    "arch": "$(uname -m)",
    "tz": "$TZ"
  },
  "git": {
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "dirty": $(git diff --quiet 2>/dev/null && echo 'false' || echo 'true')
  },
  "reproducible": true
}
EOF

    log_info "Манифест создан: $manifest_file"

    if command -v jq &> /dev/null; then
        jq '.' "$manifest_file"
    else
        cat "$manifest_file"
    fi
}

# Проверка воспроизводимости (опционально)
verify_reproducibility() {
    log_section "Проверка воспроизводимости"

    log_info "Для проверки воспроизводимости:"
    log_info "1. Запустите этот скрипт повторно"
    log_info "2. Сравните хеши двух артефактов"
    log_info "3. Они должны быть идентичны"
}

main() {
    log_info "=== Начало воспроизводимой сборки ==="

    setup_reproducible_env
    clean_before_build
    install_dependencies
    build_backend

    local archive
    archive=$(create_reproducible_archive)

    local hash
    hash=$(calculate_hash "$archive")

    generate_build_manifest "$archive" "$hash"
    verify_reproducibility

    log_info "=== Сборка завершена ==="
    log_info "Артефакт: $archive"
    log_info "SHA256: $hash"
}

main "$@"
