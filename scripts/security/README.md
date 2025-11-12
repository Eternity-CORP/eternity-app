# Security Scripts

Скрипты для обеспечения Supply Chain Security.

## 📋 Доступные скрипты

### 1. check-dependencies.sh

**Назначение:** Комплексная проверка безопасности зависимостей

**Что проверяет:**
- Целостность package-lock.json
- npm audit (уязвимости)
- npm audit signatures (подписи пакетов)
- Устаревшие пакеты
- Лицензии
- Dependency confusion риски

**Использование:**
```bash
./scripts/security/check-dependencies.sh
```

**Результат:**
- Отчеты в `security-reports/`
- Сводный отчет в `security-summary-*.md`

---

### 2. reproducible-build.sh

**Назначение:** Воспроизводимая сборка backend

**Особенности:**
- Детерминированное окружение
- Фиксированные временные метки
- Идентичные хеши при повторных сборках

**Использование:**
```bash
./scripts/security/reproducible-build.sh
```

**Результат:**
- `backend/backend-build-*.tar.gz` - архив
- `backend/backend-build-*.tar.gz.sha256` - хеш
- `backend/backend-build-*.tar.gz.manifest.json` - манифест

**Верификация воспроизводимости:**
```bash
# Запустите дважды и сравните хеши
./scripts/security/reproducible-build.sh
HASH1=$(cat backend/backend-build-*.tar.gz.sha256 | tail -1)

./scripts/security/reproducible-build.sh
HASH2=$(cat backend/backend-build-*.tar.gz.sha256 | tail -1)

# Они должны совпадать!
```

---

### 3. verify-artifact.sh

**Назначение:** Проверка целостности и подписи артефактов

**Использование:**

```bash
# Только хеш
./scripts/security/verify-artifact.sh artifact.tar.gz

# С проверкой подписи
./scripts/security/verify-artifact.sh \
  artifact.tar.gz \
  artifact.tar.gz.sig \
  artifact.tar.gz.pem
```

**Что проверяет:**
- SHA256 хеш
- Подпись Cosign (если предоставлена)
- Provenance attestation
- Генерирует отчет о верификации

**Результат:**
- `artifact.tar.gz.sha256` - хеш файл
- `artifact.tar.gz.verification-report.txt` - отчет

---

## 🔧 Предварительные требования

### Обязательные

```bash
node --version    # 20+
npm --version     # 9+
sha256sum         # Обычно предустановлен
```

### Опциональные (для подписи)

```bash
cosign version    # Для проверки подписей

# Установка cosign
# macOS:
brew install cosign

# Linux:
wget https://github.com/sigstore/cosign/releases/download/v2.2.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

---

## 🚀 Быстрый старт

### Первый запуск

```bash
# 1. Проверить зависимости
./scripts/security/check-dependencies.sh

# 2. Создать воспроизводимую сборку
./scripts/security/reproducible-build.sh

# 3. Проверить артефакт
./scripts/security/verify-artifact.sh backend/backend-build-*.tar.gz
```

### Интеграция в workflow

```bash
# В вашем CI/CD скрипте
./scripts/security/check-dependencies.sh || exit 1
./scripts/security/reproducible-build.sh || exit 1
./scripts/security/verify-artifact.sh artifact.tar.gz || exit 1
```

---

## 📊 Интерпретация результатов

### check-dependencies.sh

**Успех:**
```
[INFO] ✓ Lock-файл корректен
[INFO] ✓ Уязвимости не обнаружены
[INFO] ✓ Все подписи пакетов валидны
```

**Проблема:**
```
[WARNING] Обнаружены уязвимости
[ERROR] ✗ Lock-файл некорректен
```

→ Проверьте `security-reports/security-summary-*.md`

### reproducible-build.sh

**Успех:**
```
[INFO] SHA256: abc123...
[INFO] === Сборка завершена ===
```

**Проверка воспроизводимости:**
Два запуска должны дать идентичные хеши.

### verify-artifact.sh

**Успех:**
```
[INFO] ✓ Подпись действительна!
[INFO] === Проверка завершена ===
Exit code: 0
```

**Проблема:**
```
[ERROR] ✗ Подпись недействительна!
Exit code: 1
```

→ НЕ используйте этот артефакт!

---

## 🔒 Безопасность

### Best Practices

1. **Всегда проверяйте подписи** перед использованием артефактов
2. **Запускайте check-dependencies.sh** перед каждым коммитом
3. **Верифицируйте воспроизводимость** регулярно
4. **Не игнорируйте critical уязвимости**
5. **Храните отчеты** для аудита

### Что НЕ делать

- ❌ Не коммитьте артефакты в git
- ❌ Не пропускайте проверки безопасности
- ❌ Не используйте артефакты с невалидными подписями
- ❌ Не игнорируйте предупреждения скриптов

---

## 🐛 Troubleshooting

### Проблема: Permission denied

```bash
chmod +x scripts/security/*.sh
```

### Проблема: cosign not found

```bash
# Установите cosign
brew install cosign  # macOS
# или
wget ... # см. выше
```

### Проблема: npm ci fails

```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблема: Разные хеши при воспроизводимой сборке

Причины:
- Различия в версиях Node.js
- Различия в окружении
- Нестабильные зависимости

Решение:
```bash
# Проверьте версии
node --version
npm --version

# Очистите и пересоберите
rm -rf backend/dist backend/node_modules
./scripts/security/reproducible-build.sh
```

---

## 📚 Дополнительные ресурсы

- [Supply Chain Security Documentation](../../docs/SUPPLY_CHAIN_SECURITY.md)
- [Quick Start Guide](../../docs/SECURITY_QUICKSTART.md)
- [Security Cheatsheet](../../SECURITY_CHEATSHEET.md)

---

## 🤝 Вклад в разработку

При внесении изменений в скрипты:

1. Тестируйте локально
2. Обновляйте документацию
3. Добавляйте примеры использования
4. Проверяйте обратную совместимость

---

**Версия:** 1.0.0
**Дата:** 2024-11-04
