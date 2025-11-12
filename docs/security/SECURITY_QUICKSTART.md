# Supply Chain Security - Быстрый старт

## 🚀 Быстрая настройка (5 минут)

### 1. Предварительные требования

```bash
# Проверьте версии
node --version    # Требуется 20+
npm --version     # Требуется 9+
docker --version  # Для сборки образов
```

### 2. Установка Cosign

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

**Проверка:**
```bash
cosign version
```

### 3. Первый запуск

#### Проверка зависимостей

```bash
cd /path/to/project
./scripts/security/check-dependencies.sh
```

Результат в `security-reports/`:
- npm-audit отчет
- проверка подписей пакетов
- список устаревших пакетов
- анализ лицензий

#### Воспроизводимая сборка

```bash
./scripts/security/reproducible-build.sh
```

Получите:
- `backend/backend-build-*.tar.gz` - артефакт
- `.sha256` - хеш для верификации
- `.manifest.json` - метаданные сборки

#### Проверка артефакта

```bash
./scripts/security/verify-artifact.sh \
  backend/backend-build-*.tar.gz
```

---

## 🔄 CI/CD Pipeline

### Автоматический запуск

Pipeline запускается автоматически при:
- Push в `main` или `develop`
- Pull Request в эти ветки

### Этапы pipeline

1. **verify-dependencies** - проверка целостности зависимостей
2. **sca-scan** - поиск уязвимостей (npm audit, OWASP DC)
3. **generate-sbom** - генерация Software Bill of Materials
4. **build-backend** - воспроизводимая сборка
5. **sign-artifacts** - подпись с Cosign
6. **build-docker** - сборка и подпись Docker образов
7. **integrity-guard** - финальная проверка целостности

### Просмотр результатов

В GitHub Actions:
1. Перейдите в раздел **Actions**
2. Выберите workflow run
3. Скачайте artifacts:
   - `dependency-check-report` - отчет о уязвимостях
   - `sbom-files` - SBOM в форматах CycloneDX и SPDX
   - `backend-signed` - подписанные артефакты
   - `integrity-report` - отчет о целостности

---

## 🔐 Основные команды

### Проверка безопасности зависимостей

```bash
# Быстрая проверка
npm audit

# Проверка подписей
npm audit signatures

# Полная проверка (скрипт)
./scripts/security/check-dependencies.sh
```

### Работа с артефактами

```bash
# Создать воспроизводимую сборку
./scripts/security/reproducible-build.sh

# Проверить артефакт
./scripts/security/verify-artifact.sh artifact.tar.gz signature.sig certificate.pem

# Вычислить хеш
sha256sum artifact.tar.gz
```

### Работа с Docker

```bash
# Собрать образ
docker build -t backend:local ./backend

# Подписать образ (требуется настройка)
cosign sign --yes backend:local

# Проверить подпись образа
cosign verify backend:local \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

### Генерация SBOM

```bash
# CycloneDX формат
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# SPDX формат
npx @microsoft/sbom-tool generate -b ./sbom -bc . -pn "Project"
```

---

## 📊 Интерпретация результатов

### npm audit

```
Severity: high
Package: example-package
Vulnerability: CVE-2024-12345
Recommendation: Upgrade to version 2.0.0
```

**Действия:**
1. Оцените критичность (high/critical = немедленно)
2. Проверьте доступность патча
3. Обновите зависимость: `npm update example-package`
4. Повторите проверку: `npm audit`

### OWASP Dependency-Check

Отчет в `reports/dependency-check-report.html`

**Приоритеты:**
- 🔴 Critical (10.0) - немедленное исправление
- 🟠 High (7.0-9.9) - в течение недели
- 🟡 Medium (4.0-6.9) - в течение месяца
- 🟢 Low (0.1-3.9) - по возможности

### Подписи артефактов

✅ **Валидная подпись:**
```
Verification successful!
Certificate identity: https://github.com/your-org/repo/.github/workflows/ci-cd.yml
```

❌ **Невалидная подпись:**
```
Error: signature verification failed
```
→ Не используйте этот артефакт!

---

## 🛠️ Настройка для вашего проекта

### 1. Обновите GitHub workflow

В `.github/workflows/ci-cd.yml`:

```yaml
# Замените your-org/repo на ваш репозиторий
images: ghcr.io/your-org/your-repo/backend
```

### 2. Настройте GitHub Secrets (опционально)

Для Snyk сканирования:
```
Settings → Secrets → New repository secret
Name: SNYK_TOKEN
Value: your-snyk-token
```

### 3. Обновите OWASP DC suppressions

Если есть false positives:

`dependency-check-suppressions.xml`:
```xml
<suppress>
   <notes>Обоснование</notes>
   <packageUrl regex="true">^pkg:npm/package-name@.*$</packageUrl>
   <cve>CVE-2024-12345</cve>
</suppress>
```

### 4. Настройте package.json

Убедитесь, что `private: true` для предотвращения dependency confusion:

```json
{
  "name": "@your-org/backend",
  "private": true,
  ...
}
```

---

## 🚨 Типичные проблемы

### Problem: npm audit находит уязвимости

```bash
npm audit fix          # Автоматическое исправление
npm audit fix --force  # Если выше не помогло (осторожно!)
```

### Problem: package-lock.json не синхронизирован

```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem: Cosign не может проверить подпись

```bash
# Проверьте версию
cosign version  # Требуется 2.0+

# Обновите
brew upgrade cosign  # macOS
```

### Problem: Docker build занимает много времени

```bash
# Используйте BuildKit
export DOCKER_BUILDKIT=1
docker build ...

# Очистите кэш если нужно
docker builder prune
```

---

## 📈 Метрики и мониторинг

### KPI для отслеживания

1. **Время обнаружения уязвимостей** - от появления CVE до обнаружения
2. **Время устранения** - от обнаружения до исправления
3. **% подписанных релизов** - должно быть 100%
4. **Успешность воспроизводимых сборок** - должно быть 100%

### Где смотреть

- **GitHub Security tab** - обнаруженные уязвимости
- **Actions tab** - статус CI/CD
- **Dependabot alerts** - обновления зависимостей
- **Insights → Dependency graph** - зависимости проекта

---

## 📚 Дальнейшее изучение

После освоения базовых команд:

1. Прочитайте [полную документацию](./SUPPLY_CHAIN_SECURITY.md)
2. Изучите [SLSA framework](https://slsa.dev/)
3. Настройте [Dependabot](https://docs.github.com/en/code-security/dependabot)
4. Интегрируйте дополнительные инструменты (Trivy, Grype)

---

## ✅ Checklist перед production

- [ ] CI/CD pipeline работает на всех ветках
- [ ] Все релизы подписаны
- [ ] SBOM генерируется автоматически
- [ ] SCA сканирование проходит без critical уязвимостей
- [ ] Воспроизводимые сборки верифицированы
- [ ] Документация актуальна
- [ ] Team обучена процедурам
- [ ] Настроены alerts на уязвимости
- [ ] Определен процесс реагирования на инциденты

---

## 🆘 Получить помощь

- 📖 [Полная документация](./SUPPLY_CHAIN_SECURITY.md)
- 🐛 [Сообщить о проблеме](../SECURITY.md)
- 💬 Обратитесь к команде безопасности

---

**Готовы начать? Запустите первую проверку:**

```bash
./scripts/security/check-dependencies.sh
```

🎉 Успехов в обеспечении безопасности supply chain!
