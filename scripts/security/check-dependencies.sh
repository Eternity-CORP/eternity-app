#!/bin/bash
# Скрипт для комплексной проверки безопасности зависимостей
# Включает: npm audit, проверку lock-файлов, SCA сканирование

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPORT_DIR="security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

setup_reports_dir() {
    mkdir -p "$REPORT_DIR"
    log_info "Отчеты будут сохранены в: $REPORT_DIR"
}

check_lockfile_integrity() {
    log_section "Проверка целостности package-lock.json"

    local exit_code=0

    for workspace in . backend mobile shared; do
        if [[ -f "$workspace/package-lock.json" ]]; then
            log_info "Проверка $workspace/package-lock.json..."

            cd "$workspace"

            if npm ci --dry-run --ignore-scripts > /dev/null 2>&1; then
                log_info "✓ Lock-файл в $workspace корректен"
            else
                log_error "✗ Lock-файл в $workspace некорректен или не синхронизирован"
                exit_code=1
            fi

            cd - > /dev/null
        fi
    done

    return $exit_code
}

run_npm_audit() {
    log_section "Запуск npm audit"

    local report_file="$REPORT_DIR/npm-audit-${TIMESTAMP}.json"

    if npm audit --json > "$report_file" 2>&1; then
        log_info "✓ Уязвимости не обнаружены"
    else
        local vulnerabilities
        vulnerabilities=$(jq -r '.metadata.vulnerabilities | to_entries[] | select(.value > 0) | "\(.key): \(.value)"' "$report_file" 2>/dev/null || echo "Не удалось распарсить отчет")

        if [[ -n "$vulnerabilities" ]]; then
            log_warning "Обнаружены уязвимости:"
            echo "$vulnerabilities"
        fi

        log_info "Полный отчет: $report_file"
    fi

    # Генерация человекочитаемого отчета
    npm audit > "$REPORT_DIR/npm-audit-${TIMESTAMP}.txt" 2>&1 || true
}

check_audit_signatures() {
    log_section "Проверка подписей пакетов (npm audit signatures)"

    local report_file="$REPORT_DIR/audit-signatures-${TIMESTAMP}.txt"

    if npm audit signatures > "$report_file" 2>&1; then
        log_info "✓ Все подписи пакетов валидны"
    else
        log_warning "Обнаружены проблемы с подписями пакетов"
        log_info "Отчет: $report_file"
    fi
}

check_outdated_packages() {
    log_section "Проверка устаревших пакетов"

    local report_file="$REPORT_DIR/outdated-${TIMESTAMP}.json"

    npm outdated --json > "$report_file" 2>&1 || true

    if [[ -s "$report_file" ]] && [[ "$(cat "$report_file")" != "{}" ]]; then
        log_warning "Найдены устаревшие пакеты. См. $report_file"
        npm outdated || true
    else
        log_info "✓ Все пакеты актуальны"
    fi
}

check_license_compliance() {
    log_section "Проверка лицензий"

    if ! command -v npx &> /dev/null; then
        log_warning "npx не найден, пропуск проверки лицензий"
        return 0
    fi

    local report_file="$REPORT_DIR/licenses-${TIMESTAMP}.json"

    log_info "Генерация отчета о лицензиях..."

    npx license-checker --json --out "$report_file" 2>&1 || {
        log_warning "Не удалось сгенерировать отчет о лицензиях"
        return 0
    }

    log_info "Отчет о лицензиях: $report_file"

    # Проверка на запрещенные лицензии
    local forbidden_licenses=("GPL-2.0" "GPL-3.0" "AGPL-3.0")
    local found_forbidden=false

    for license in "${forbidden_licenses[@]}"; do
        if grep -q "$license" "$report_file" 2>/dev/null; then
            log_error "✗ Обнаружена запрещенная лицензия: $license"
            found_forbidden=true
        fi
    done

    if [[ "$found_forbidden" == false ]]; then
        log_info "✓ Запрещенные лицензии не обнаружены"
    fi
}

check_dependency_confusion() {
    log_section "Проверка на dependency confusion атаки"

    log_info "Проверка на потенциальные угрозы dependency confusion..."

    # Проверка package.json на наличие scope и private флагов
    for workspace in . backend mobile shared; do
        if [[ -f "$workspace/package.json" ]]; then
            local is_private
            is_private=$(jq -r '.private // false' "$workspace/package.json")

            if [[ "$is_private" != "true" ]]; then
                log_warning "Пакет $workspace не помечен как private"
            fi
        fi
    done

    log_info "✓ Проверка завершена"
}

generate_summary_report() {
    log_section "Генерация сводного отчета"

    local summary_file="$REPORT_DIR/security-summary-${TIMESTAMP}.md"

    cat > "$summary_file" <<EOF
# Отчет о безопасности зависимостей

**Дата:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Результаты проверок

- **Целостность lock-файлов:** ${LOCKFILE_STATUS:-"Не проверялась"}
- **npm audit:** См. \`npm-audit-${TIMESTAMP}.json\`
- **Подписи пакетов:** См. \`audit-signatures-${TIMESTAMP}.txt\`
- **Устаревшие пакеты:** См. \`outdated-${TIMESTAMP}.json\`
- **Лицензии:** См. \`licenses-${TIMESTAMP}.json\`
- **Dependency Confusion:** ${CONFUSION_STATUS:-"Проверено"}

## Рекомендации

1. Регулярно обновляйте зависимости
2. Используйте npm audit для проверки уязвимостей
3. Проверяйте подписи пакетов перед установкой
4. Мониторьте новые CVE для используемых пакетов
5. Используйте инструменты SCA в CI/CD

## Детали

Все подробные отчеты находятся в директории: \`$REPORT_DIR/\`

EOF

    log_info "Сводный отчет: $summary_file"
    cat "$summary_file"
}

main() {
    log_info "=== Начало проверки безопасности зависимостей ==="

    setup_reports_dir

    LOCKFILE_STATUS="✓ Пройдена"
    if ! check_lockfile_integrity; then
        LOCKFILE_STATUS="✗ Не пройдена"
    fi

    run_npm_audit
    check_audit_signatures
    check_outdated_packages
    check_license_compliance

    CONFUSION_STATUS="✓ Проверено"
    check_dependency_confusion

    generate_summary_report

    log_info "=== Проверка завершена ==="
    log_info "Отчеты сохранены в: $REPORT_DIR"
}

main "$@"
