# Supply Chain Security - Документация

## Оглавление

1. [Обзор](#обзор)
2. [Компоненты системы](#компоненты-системы)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Воспроизводимые сборки](#воспроизводимые-сборки)
5. [Подпись артефактов](#подпись-артефактов)
6. [Software Composition Analysis (SCA)](#software-composition-analysis-sca)
7. [SBOM Generation](#sbom-generation)
8. [Проверка целостности](#проверка-целостности)
9. [Локальное использование](#локальное-использование)
10. [Настройка и конфигурация](#настройка-и-конфигурация)
11. [Troubleshooting](#troubleshooting)

---

## Обзор

Система Supply Chain Security обеспечивает:

- **Воспроизводимые сборки** - идентичные бинарные артефакты при повторных сборках
- **Подпись артефактов** - криптографическое подтверждение происхождения с использованием Cosign
- **SCA (Software Composition Analysis)** - автоматическое сканирование зависимостей на уязвимости
- **SBOM (Software Bill of Materials)** - полная спецификация всех компонентов
- **Integrity Guards** - сторожевые проверки целостности на всех этапах

### Ключевые преимущества

✅ Защита от атак на supply chain
✅ Прозрачность происхождения артефактов
✅ Автоматическое обнаружение уязвимостей
✅ Соответствие стандартам безопасности (SLSA, NIST)
✅ Аудируемость всех изменений

---

## Компоненты системы

### 1. GitHub Actions Workflows

**Файл:** `.github/workflows/ci-cd.yml`

Основной CI/CD pipeline включает следующие jobs:

#### verify-dependencies
- Проверка целостности `package-lock.json`
- Верификация подписей npm пакетов
- Проверка на dependency confusion атаки

#### sca-scan
- npm audit для поиска известных уязвимостей
- OWASP Dependency-Check для глубокого SCA анализа
- Snyk Security Scan (опционально)
- Генерация отчетов о найденных уязвимостях

#### generate-sbom
- Генерация SBOM в формате CycloneDX
- Генерация SBOM в формате SPDX
- Публикация SBOM как артефакты

#### build-backend
- Воспроизводимая сборка backend с фиксированными параметрами
- Создание детерминированного tar.gz архива
- Вычисление SHA256 хеша

#### sign-artifacts
- Подпись артефактов с помощью Cosign (keyless signing)
- Генерация provenance attestations
- Создание файлов подписей (.sig) и сертификатов (.pem)

#### build-docker
- Сборка Docker образов с SBOM и provenance
- Подпись Docker образов через Cosign
- Публикация в GitHub Container Registry

#### integrity-guard
- Финальная проверка всех подписей
- Генерация отчета о целостности релиза
- Верификация всей цепочки сборки

#### test
- Запуск unit и integration тестов
- Генерация coverage отчетов

---

## CI/CD Pipeline

### Схема работы

```
┌──────────────────────────────────────────────────────────────┐
│  Push to main/develop or Pull Request                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  verify-dependencies                                          │
│  - Проверка package-lock.json                                │
│  - npm audit signatures                                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  sca-scan     │         │ generate-sbom│
│  - npm audit  │         │ - CycloneDX  │
│  - OWASP DC   │         │ - SPDX       │
│  - Snyk       │         │              │
└───────┬───────┘         └──────┬───────┘
        │                         │
        └────────────┬────────────┘
                     ▼
        ┌────────────────────────┐
        │  build-backend         │
        │  - Reproducible build  │
        │  - SHA256 hash         │
        └────────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│ sign-artifacts│         │ build-docker │
│ - Cosign sign │         │ - SBOM       │
│ - Attestation │         │ - Sign image │
└───────┬───────┘         └──────┬───────┘
        │                         │
        └────────────┬────────────┘
                     ▼
        ┌────────────────────────┐
        │  integrity-guard       │
        │  - Verify signatures   │
        │  - Generate report     │
        └────────────────────────┘
```

### Триггеры pipeline

- **Push** на ветки `main` или `develop`
- **Pull Request** в `main` или `develop`
- **Ручной запуск** через `workflow_dispatch`

---

## Воспроизводимые сборки

### Принципы

Воспроизводимая сборка гарантирует, что при одинаковых входных данных всегда получается идентичный бинарный артефакт.

### Ключевые компоненты

1. **Фиксированные временные метки**
   ```bash
   SOURCE_DATE_EPOCH=1
   TZ=UTC
   ```

2. **Детерминированный порядок файлов**
   ```bash
   tar --sort=name --mtime="1970-01-01" ...
   ```

3. **Фиксированные версии зависимостей**
   - Использование `package-lock.json`
   - npm ci вместо npm install

4. **Нормализация метаданных**
   ```bash
   find dist -exec touch -d "@${SOURCE_DATE_EPOCH}" {} +
   ```

### Использование

#### Локально

```bash
./scripts/security/reproducible-build.sh
```

Скрипт:
- Настраивает детерминированное окружение
- Очищает предыдущие артефакты
- Устанавливает зависимости с проверкой целостности
- Собирает backend
- Создает tar.gz с нормализованными метками времени
- Вычисляет SHA256
- Генерирует манифест сборки

#### В CI/CD

Воспроизводимая сборка автоматически выполняется в job `build-backend`.

### Верификация воспроизводимости

Запустите сборку дважды и сравните хеши:

```bash
./scripts/security/reproducible-build.sh
# SHA256: abc123...

./scripts/security/reproducible-build.sh
# SHA256: abc123...  (должен совпадать!)
```

---

## Подпись артефактов

### Cosign

Используется [Sigstore Cosign](https://docs.sigstore.dev/cosign/overview/) для подписи артефактов.

#### Keyless Signing

Вместо хранения приватных ключей используется keyless signing через OIDC:

```yaml
- name: Sign backend artifact with keyless signing
  run: |
    cosign sign-blob --yes backend-build.tar.gz \
      --output-signature backend-build.tar.gz.sig \
      --output-certificate backend-build.tar.gz.pem
```

**Преимущества:**
- Нет необходимости управлять секретными ключами
- Identity привязан к GitHub Actions OIDC token
- Полная прозрачность через публичный Rekor transparency log

#### Подпись Docker образов

```bash
cosign sign --yes ghcr.io/your-org/backend@sha256:...
```

### Провенанс (Provenance)

GitHub Actions автоматически генерирует attestation:

```yaml
- name: Generate provenance attestation
  uses: actions/attest-build-provenance@v1
  with:
    subject-path: backend-build.tar.gz
```

Attestation содержит:
- Commit SHA
- Workflow run ID
- Временные метки
- Параметры окружения сборки

---

## Software Composition Analysis (SCA)

### Инструменты

#### 1. npm audit

Базовая проверка через официальный npm registry:

```bash
npm audit --audit-level=moderate
```

#### 2. OWASP Dependency-Check

Глубокий анализ зависимостей:

```yaml
- name: OWASP Dependency-Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: 'Eternity-Wallet'
    format: 'ALL'
```

**Возможности:**
- Проверка по базам CVE, NVD
- Анализ транзитивных зависимостей
- Поддержка множества форматов отчетов (HTML, JSON, XML)

**Конфигурация:** `dependency-check-suppressions.xml`

#### 3. Snyk (опционально)

Коммерческий SCA сервис с расширенными возможностями:

```yaml
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Отчеты

Все отчеты публикуются как GitHub Actions artifacts:
- `dependency-check-report/` - OWASP DC отчеты
- `npm-audit-*.json` - npm audit результаты

### Локальное сканирование

```bash
./scripts/security/check-dependencies.sh
```

Скрипт проверяет:
- Целостность lock-файлов
- npm audit
- npm audit signatures
- Устаревшие пакеты
- Лицензии
- Dependency confusion риски

---

## SBOM Generation

### Форматы

#### CycloneDX

Современный стандарт для SBOM:

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom-cyclonedx.json
```

**Содержит:**
- Список всех компонентов
- Версии и лицензии
- Зависимости между компонентами
- Vulnerability information

#### SPDX

ISO/IEC стандарт:

```bash
npx @microsoft/sbom-tool generate \
  -b ./sbom \
  -bc . \
  -pn "Eternity-Wallet" \
  -pv "1.0.0"
```

### Использование SBOM

1. **Аудит зависимостей**
   ```bash
   jq '.components[] | {name: .name, version: .version, licenses}' sbom-cyclonedx.json
   ```

2. **Поиск уязвимых компонентов**
   ```bash
   grep "CVE-" sbom-cyclonedx.json
   ```

3. **Compliance проверки**
   - Проверка лицензий
   - Верификация происхождения компонентов

---

## Проверка целостности

### Integrity Guard

Финальный этап pipeline - проверка всей цепочки:

```yaml
integrity-guard:
  - Проверка подписи артефактов
  - Верификация provenance
  - Генерация отчета о релизе
```

### Локальная верификация

#### Проверка подписи артефакта

```bash
./scripts/security/verify-artifact.sh \
  backend-build.tar.gz \
  backend-build.tar.gz.sig \
  backend-build.tar.gz.pem
```

Скрипт:
1. Проверяет наличие cosign
2. Вычисляет SHA256 хеш
3. Верифицирует подпись через Cosign
4. Проверяет provenance attestation
5. Генерирует отчет о верификации

#### Проверка Docker образа

```bash
cosign verify ghcr.io/your-org/backend:latest \
  --certificate-identity-regexp="https://github.com/your-org/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

### Отчет о целостности

После каждого релиза генерируется отчет:

```
==============================================
ОТЧЕТ О ВЕРИФИКАЦИИ АРТЕФАКТА
==============================================

Дата проверки: 2024-11-04 12:00:00 UTC
Артефакт: backend-build.tar.gz
SHA256: abc123...

Статус проверки подписи: ✓ Пройдена
Статус проверки provenance: ✓ Проверена

Supply Chain Security:
- Dependencies Verified: ✓ Yes
- SBOM Generated: ✓ Yes
- Vulnerability Scan: ✓ Completed
- Reproducible Build: ✓ Yes
==============================================
```

---

## Локальное использование

### Предварительные требования

```bash
# Node.js 20+
node --version

# npm 9+
npm --version

# Cosign (для подписи)
cosign version

# Docker (для сборки образов)
docker --version

# jq (опционально, для парсинга JSON)
jq --version
```

### Установка Cosign

**macOS:**
```bash
brew install cosign
```

**Linux:**
```bash
wget https://github.com/sigstore/cosign/releases/download/v2.2.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

### Запуск проверок

#### Полная проверка зависимостей

```bash
./scripts/security/check-dependencies.sh
```

Результаты в `security-reports/`:
- `npm-audit-*.json` - уязвимости
- `audit-signatures-*.txt` - подписи пакетов
- `outdated-*.json` - устаревшие пакеты
- `licenses-*.json` - лицензии
- `security-summary-*.md` - сводный отчет

#### Воспроизводимая сборка

```bash
./scripts/security/reproducible-build.sh
```

Результаты:
- `backend/backend-build-*.tar.gz` - архив сборки
- `backend/backend-build-*.tar.gz.sha256` - хеш
- `backend/backend-build-*.tar.gz.manifest.json` - манифест

#### Верификация артефакта

```bash
./scripts/security/verify-artifact.sh \
  path/to/artifact.tar.gz \
  path/to/artifact.tar.gz.sig \
  path/to/artifact.tar.gz.pem
```

### Сборка Docker образа

```bash
cd backend
docker build -t eternity-backend:local .
```

Особенности Dockerfile:
- Multi-stage build для минимизации размера
- Детерминированные переменные окружения
- Непривилегированный пользователь
- Healthcheck
- SBOM labels

---

## Настройка и конфигурация

### GitHub Secrets

Для полной функциональности настройте secrets:

```
SNYK_TOKEN - (опционально) токен для Snyk сканирования
```

Все остальное работает через GitHub Actions OIDC без дополнительных секретов.

### npm Configuration

**Файл:** `.npmrc`

```ini
package-lock=true
audit=true
ci=true
audit-level=moderate
```

### OWASP Dependency-Check Suppressions

**Файл:** `dependency-check-suppressions.xml`

Для подавления false positives:

```xml
<suppress>
   <notes><![CDATA[
   Обоснование почему это false positive
   ]]></notes>
   <packageUrl regex="true">^pkg:npm/package-name@.*$</packageUrl>
   <cve>CVE-2021-12345</cve>
</suppress>
```

### Workflow Permissions

В `.github/workflows/ci-cd.yml` настроены минимально необходимые права:

```yaml
permissions:
  contents: read          # Чтение кода
  packages: write         # Публикация Docker образов
  id-token: write         # OIDC для Cosign
  security-events: write  # Публикация security отчетов
  attestations: write     # Создание attestations
```

---

## Troubleshooting

### Проблема: npm audit signatures fails

**Ошибка:**
```
npm audit signatures
# Invalid signature for some packages
```

**Решение:**
- Обновите npm до версии 9+
- Проверьте целостность package-lock.json
- Удалите node_modules и выполните `npm ci`

### Проблема: Cosign verification fails

**Ошибка:**
```
Error: unable to verify signature
```

**Причины:**
1. Неверный certificate identity regexp
2. Артефакт не был подписан через GitHub Actions
3. Устаревшая версия cosign

**Решение:**
```bash
# Обновите cosign
cosign version

# Проверьте, что certificate-identity правильный
cosign verify-blob ... \
  --certificate-identity-regexp="https://github.com/YOUR-ORG/.*"
```

### Проблема: Build не воспроизводим

**Симптомы:**
Разные хеши при повторных сборках

**Причины:**
- Временные метки не нормализованы
- Случайность в процессе сборки
- Различия в окружении

**Решение:**
1. Убедитесь, что используется `SOURCE_DATE_EPOCH=1`
2. Проверьте, что TZ=UTC
3. Используйте `tar --sort=name --mtime="1970-01-01"`
4. Нормализуйте временные метки файлов после сборки

### Проблема: OWASP Dependency-Check слишком медленный

**Решение:**
- Используйте кэширование NVD базы
- Ограничьте scope сканирования
- Запускайте только на критичных ветках (main)

### Проблема: Docker build не детерминирован

**Причины:**
- Использование `latest` тегов
- apt-get update без фиксации версий
- Нефиксированные временные метки

**Решение:**
Используйте в Dockerfile:
```dockerfile
FROM node:20.18.1-alpine@sha256:fixed-hash
ENV SOURCE_DATE_EPOCH=1
```

---

## Best Practices

### 1. Dependency Management

- ✅ Всегда используйте package-lock.json
- ✅ Регулярно обновляйте зависимости
- ✅ Проверяйте подписи пакетов
- ✅ Используйте npm ci в CI/CD
- ❌ Не используйте `*` или `^` для критичных зависимостей

### 2. Security Scanning

- ✅ Сканируйте на каждом PR
- ✅ Блокируйте merge при critical уязвимостях
- ✅ Настройте автоматические alerts
- ✅ Регулярно проверяйте transitive dependencies

### 3. Artifact Signing

- ✅ Подписывайте все релизы
- ✅ Используйте keyless signing где возможно
- ✅ Храните подписи вместе с артефактами
- ✅ Верифицируйте подписи при деплое

### 4. Build Reproducibility

- ✅ Фиксируйте все версии (Node, npm, OS)
- ✅ Используйте детерминированные процессы
- ✅ Документируйте окружение сборки
- ✅ Верифицируйте воспроизводимость регулярно

### 5. SBOM Management

- ✅ Генерируйте SBOM на каждый релиз
- ✅ Используйте стандартные форматы (CycloneDX, SPDX)
- ✅ Публикуйте SBOM вместе с артефактами
- ✅ Используйте SBOM для compliance и аудита

---

## Compliance & Standards

### SLSA (Supply-chain Levels for Software Artifacts)

Текущий уровень: **SLSA Level 3**

✅ Provenance generation
✅ Signed provenance
✅ Hermetic builds
✅ Hosted build platform (GitHub Actions)

### NIST SP 800-218 (SSDF)

Соответствие Secure Software Development Framework:
- ✅ PO.3: Protect software integrity
- ✅ PS.1: Protect software supply chain
- ✅ PW.4: Review code
- ✅ RV.1: Identify vulnerabilities

### OWASP Top 10 CI/CD Security Risks

Защита от:
- ✅ CICD-SEC-1: Insufficient pipeline access controls
- ✅ CICD-SEC-3: Dependency chain abuse
- ✅ CICD-SEC-6: Insufficient credential hygiene
- ✅ CICD-SEC-8: Ungoverned usage of 3rd party services

---

## Дополнительные ресурсы

### Документация

- [Sigstore Cosign](https://docs.sigstore.dev/cosign/overview/)
- [SLSA Framework](https://slsa.dev/)
- [CycloneDX](https://cyclonedx.org/)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [GitHub Supply Chain Security](https://docs.github.com/en/code-security/supply-chain-security)

### Инструменты

- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Trivy](https://github.com/aquasecurity/trivy)
- [Syft](https://github.com/anchore/syft)
- [Grype](https://github.com/anchore/grype)

### Community

- [OpenSSF](https://openssf.org/)
- [Sigstore Community](https://www.sigstore.dev/community)
- [SLSA Community](https://slsa.dev/community)

---

## Контакты и поддержка

По вопросам Supply Chain Security:
- Создайте issue в репозитории
- Обратитесь к security team
- Проверьте [security policy](../SECURITY.md)

---

**Версия документа:** 1.0.0
**Последнее обновление:** 2024-11-04
**Статус:** Производственная готовность ✅
