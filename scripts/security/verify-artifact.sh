#!/bin/bash
# Скрипт для проверки целостности артефактов сборки
# Использование: ./verify-artifact.sh <artifact-file> <signature-file> <certificate-file>

set -euo pipefail

ARTIFACT_FILE="${1:-}"
SIGNATURE_FILE="${2:-}"
CERTIFICATE_FILE="${3:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_dependencies() {
    log_info "Проверка зависимостей..."

    if ! command -v cosign &> /dev/null; then
        log_error "cosign не установлен. Установите его: https://docs.sigstore.dev/cosign/installation/"
        exit 1
    fi

    if ! command -v sha256sum &> /dev/null; then
        log_error "sha256sum не установлен"
        exit 1
    fi

    log_info "Все зависимости установлены"
}

verify_artifact_exists() {
    if [[ -z "$ARTIFACT_FILE" ]]; then
        log_error "Не указан файл артефакта"
        echo "Использование: $0 <artifact-file> <signature-file> <certificate-file>"
        exit 1
    fi

    if [[ ! -f "$ARTIFACT_FILE" ]]; then
        log_error "Файл артефакта не найден: $ARTIFACT_FILE"
        exit 1
    fi

    log_info "Артефакт найден: $ARTIFACT_FILE"
}

calculate_hash() {
    log_info "Вычисление SHA256 хеша артефакта..."
    local hash
    hash=$(sha256sum "$ARTIFACT_FILE" | cut -d' ' -f1)
    echo "$hash" > "${ARTIFACT_FILE}.sha256"
    log_info "SHA256: $hash"
    echo "$hash"
}

verify_signature() {
    if [[ -z "$SIGNATURE_FILE" ]] || [[ -z "$CERTIFICATE_FILE" ]]; then
        log_warning "Подпись или сертификат не предоставлены. Пропуск проверки подписи."
        return 0
    fi

    if [[ ! -f "$SIGNATURE_FILE" ]]; then
        log_error "Файл подписи не найден: $SIGNATURE_FILE"
        return 1
    fi

    if [[ ! -f "$CERTIFICATE_FILE" ]]; then
        log_error "Файл сертификата не найден: $CERTIFICATE_FILE"
        return 1
    fi

    log_info "Проверка подписи с помощью cosign..."

    if cosign verify-blob \
        --certificate "$CERTIFICATE_FILE" \
        --signature "$SIGNATURE_FILE" \
        --certificate-identity-regexp=".*" \
        --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
        "$ARTIFACT_FILE"; then
        log_info "✓ Подпись действительна!"
        return 0
    else
        log_error "✗ Подпись недействительна!"
        return 1
    fi
}

verify_provenance() {
    log_info "Проверка provenance (если доступна)..."

    local attestation_file="${ARTIFACT_FILE}.attestation"

    if [[ -f "$attestation_file" ]]; then
        log_info "Найден файл attestation"

        if command -v jq &> /dev/null; then
            log_info "Содержимое attestation:"
            jq '.' "$attestation_file"
        else
            cat "$attestation_file"
        fi
    else
        log_warning "Файл attestation не найден: $attestation_file"
    fi
}

generate_verification_report() {
    local hash="$1"
    local report_file="${ARTIFACT_FILE}.verification-report.txt"

    log_info "Генерация отчета о верификации..."

    cat > "$report_file" <<EOF
==============================================
ОТЧЕТ О ВЕРИФИКАЦИИ АРТЕФАКТА
==============================================

Дата проверки: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Артефакт: $ARTIFACT_FILE
Размер: $(stat -f%z "$ARTIFACT_FILE" 2>/dev/null || stat -c%s "$ARTIFACT_FILE" 2>/dev/null) bytes
SHA256: $hash

Статус проверки подписи: ${SIGNATURE_STATUS:-"Не выполнена"}
Статус проверки provenance: ${PROVENANCE_STATUS:-"Не выполнена"}

==============================================
EOF

    log_info "Отчет сохранен: $report_file"
    cat "$report_file"
}

main() {
    log_info "=== Начало проверки артефакта ==="

    check_dependencies
    verify_artifact_exists

    local hash
    hash=$(calculate_hash)

    SIGNATURE_STATUS="✗ Не пройдена"
    if verify_signature; then
        SIGNATURE_STATUS="✓ Пройдена"
    fi

    PROVENANCE_STATUS="Проверена"
    verify_provenance

    generate_verification_report "$hash"

    log_info "=== Проверка завершена ==="

    if [[ "$SIGNATURE_STATUS" == "✓ Пройдена" ]]; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
