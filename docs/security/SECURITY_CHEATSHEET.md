# Supply Chain Security - Шпаргалка команд

## 🚀 Быстрый запуск

### Проверка зависимостей
```bash
./scripts/security/check-dependencies.sh
```

### Воспроизводимая сборка
```bash
./scripts/security/reproducible-build.sh
```

### Проверка артефакта
```bash
./scripts/security/verify-artifact.sh artifact.tar.gz [signature.sig] [certificate.pem]
```

---

## 📦 Работа с зависимостями

### npm audit
```bash
# Базовая проверка
npm audit

# Проверка с определенным уровнем
npm audit --audit-level=high

# Автоматическое исправление
npm audit fix

# Принудительное исправление (осторожно!)
npm audit fix --force

# JSON отчет
npm audit --json > audit-report.json
```

### Проверка подписей пакетов (npm 9+)
```bash
npm audit signatures
```

### Проверка устаревших пакетов
```bash
npm outdated

# JSON формат
npm outdated --json
```

### Чистая установка (для CI/CD)
```bash
npm ci
```

---

## 🔐 Подпись артефактов

### Подпись файла с Cosign
```bash
# Keyless signing (рекомендуется для CI/CD)
cosign sign-blob --yes artifact.tar.gz \
  --output-signature artifact.tar.gz.sig \
  --output-certificate artifact.tar.gz.pem
```

### Проверка подписи
```bash
cosign verify-blob artifact.tar.gz \
  --signature artifact.tar.gz.sig \
  --certificate artifact.tar.gz.pem \
  --certificate-identity-regexp="https://github.com/YOUR-ORG/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

### Подпись Docker образа
```bash
# Подпись
cosign sign --yes ghcr.io/org/image:tag

# Проверка
cosign verify ghcr.io/org/image:tag \
  --certificate-identity-regexp="https://github.com/YOUR-ORG/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

---

## 📊 SBOM Generation

### CycloneDX формат
```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom-cyclonedx.json
```

### SPDX формат
```bash
npx @microsoft/sbom-tool generate \
  -b ./sbom \
  -bc . \
  -pn "Eternity-Wallet" \
  -pv "1.0.0" \
  -ps "Eternity" \
  -nsb https://sbom.eternity-wallet.com
```

### Просмотр SBOM
```bash
# Список всех компонентов
jq '.components[] | {name: .name, version: .version}' sbom-cyclonedx.json

# Поиск конкретного пакета
jq '.components[] | select(.name | contains("express"))' sbom-cyclonedx.json

# Все лицензии
jq '.components[] | .licenses' sbom-cyclonedx.json
```

---

## 🔍 Проверка целостности

### Вычисление хеша
```bash
# SHA256
sha256sum artifact.tar.gz

# Сохранить в файл
sha256sum artifact.tar.gz > artifact.tar.gz.sha256

# Проверить хеш
sha256sum -c artifact.tar.gz.sha256
```

### Проверка целостности lock-файла
```bash
npm ci --dry-run
```

---

## 🐳 Docker

### Воспроизводимая сборка
```bash
# С BuildKit
DOCKER_BUILDKIT=1 docker build -t backend:reproducible ./backend

# С фиксированными параметрами
docker build \
  --build-arg SOURCE_DATE_EPOCH=1 \
  --build-arg TZ=UTC \
  -t backend:reproducible \
  ./backend
```

### Инспекция образа
```bash
# Просмотр layers
docker history backend:latest

# SBOM образа (если встроен)
docker sbom backend:latest

# Scan образа
docker scan backend:latest
```

### Экспорт образа
```bash
docker save backend:latest | gzip > backend-image.tar.gz
sha256sum backend-image.tar.gz > backend-image.tar.gz.sha256
```

---

## 🧪 Тестирование воспроизводимости

### Двойная сборка
```bash
# Первая сборка
./scripts/security/reproducible-build.sh
HASH1=$(cat backend/backend-build-*.tar.gz.sha256)

# Вторая сборка
./scripts/security/reproducible-build.sh
HASH2=$(cat backend/backend-build-*.tar.gz.sha256)

# Сравнение
if [ "$HASH1" == "$HASH2" ]; then
  echo "✓ Сборка воспроизводима!"
else
  echo "✗ Хеши не совпадают"
fi
```

---

## 📈 Мониторинг и отчеты

### Генерация сводного отчета
```bash
# Запустить все проверки
./scripts/security/check-dependencies.sh

# Отчеты в
ls -la security-reports/
```

### GitHub Actions artifacts
```bash
# Скачать с помощью gh CLI
gh run download <run-id> -n dependency-check-report
gh run download <run-id> -n sbom-files
gh run download <run-id> -n backend-signed
gh run download <run-id> -n integrity-report
```

### Просмотр логов workflow
```bash
gh run view <run-id> --log
```

---

## 🔧 Troubleshooting

### Очистка кэша npm
```bash
npm cache clean --force
```

### Переустановка зависимостей
```bash
rm -rf node_modules package-lock.json
npm install
```

### Обновление npm
```bash
npm install -g npm@latest
```

### Установка Cosign
```bash
# macOS
brew install cosign

# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.2.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

### Очистка Docker
```bash
# Удалить все неиспользуемые образы
docker system prune -a

# Очистить build cache
docker builder prune
```

---

## 📋 Pre-commit checklist

```bash
# 1. Проверить зависимости
npm audit

# 2. Проверить подписи
npm audit signatures

# 3. Проверить lock-файл
npm ci --dry-run

# 4. Запустить тесты
npm test

# 5. Проверить линтинг
npm run lint

# 6. Локальная сборка
./scripts/security/reproducible-build.sh
```

---

## 🚀 Pre-release checklist

```bash
# 1. Все проверки безопасности
./scripts/security/check-dependencies.sh

# 2. Воспроизводимая сборка
./scripts/security/reproducible-build.sh

# 3. Проверка артефакта
./scripts/security/verify-artifact.sh backend/backend-build-*.tar.gz

# 4. Генерация SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# 5. Docker сборка
docker build -t backend:release ./backend

# 6. Запуск тестов
npm test

# 7. Проверка документации
# Убедитесь, что все обновлено

# 8. Tag и push
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 🔗 Полезные ссылки

- [Полная документация](./docs/SUPPLY_CHAIN_SECURITY.md)
- [Быстрый старт](./docs/SECURITY_QUICKSTART.md)
- [Cosign Docs](https://docs.sigstore.dev/cosign/overview/)
- [SLSA Framework](https://slsa.dev/)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)

---

**Сохраните эту шпаргалку в закладки для быстрого доступа!**
