# E-Y Integration Test Coverage

Документ описывает все тестовые сценарии, покрытые интеграционными тестами.

---

## 1. Health Check (3 теста)

### Базовая доступность API
- **GET /health возвращает 200** — проверка что API запущен и отвечает
- **Структура ответа корректна** — ответ содержит поля `status`, `timestamp`, `service`
- **Имя сервиса корректно** — поле `service` равно `e-y-api`

---

## 2. Username Service (15 тестов)

### Проверка доступности
- **Новый username доступен** — GET /api/username/check/:name возвращает `available: true` для нового имени

### Поиск (Lookup)
- **Несуществующий username → 404** — GET /api/username/:name для незарегистрированного имени
- **Зарегистрированный username → данные** — GET /api/username/:name возвращает `address`, `username`
- **Обратный поиск по адресу** — GET /api/username/address/:address возвращает username
- **Поиск регистронезависим** — `USERNAME` и `username` находят одну запись

### Регистрация
- **Регистрация с валидной подписью** — POST /api/username с корректными данными создает запись
- **Занятый username → ошибка** — повторная регистрация того же имени возвращает 400/409
- **Невалидный формат → 400** — имя начинающееся с цифры отклоняется
- **Просроченный timestamp** — старый timestamp может быть принят или отклонен (документируем поведение)
- **Невалидная подпись → 400/500** — некорректный формат подписи отклоняется
- **Второй кошелек может зарегистрировать свой username** — разные адреса могут иметь разные имена

### Обновление
- **Обновление username с валидной подписью** — PUT /api/username меняет имя на новое

### Удаление
- **Удаление с валидной подписью** — DELETE /api/username удаляет запись (204)
- **После удаления username не найден** — GET /api/username/address/:address возвращает 404

---

## 3. Network Preferences (12 тестов)

### Чтение preferences
- **Несуществующий адрес → 404** — GET /api/preferences/:address для нового адреса
- **Невалидный формат адреса → 400** — не-Ethereum адрес отклоняется
- **Чтение созданных preferences** — GET возвращает ранее сохраненные данные
- **Поиск регистронезависим** — адреса в разном регистре находят одну запись

### Создание/Обновление
- **Создание с валидной подписью** — PUT /api/preferences создает запись
- **Обновление существующих** — повторный PUT меняет значения
- **Изменения сохраняются** — GET после PUT возвращает новые данные
- **null как defaultNetwork допустим** — можно установить `defaultNetwork: null`

### Валидация
- **Невалидная подпись → 400** — некорректная подпись отклоняется
- **Просроченный timestamp → 400** — старый timestamp отклоняется
- **Невалидный network ID → 400** — несуществующая сеть отклоняется
- **Подпись от другого кошелька → 400** — нельзя изменить чужие preferences

---

## 4. Scheduled Payments (15 тестов)

### Создание
- **Создание scheduled payment** — POST /api/scheduled с будущей датой создает запись
- **Создание recurring payment** — с полем `recurringInterval: 'weekly'`
- **Отрицательная сумма** — API может принять или отклонить (документируем)
- **Прошедшая дата** — API может принять или отклонить (документируем)

### Чтение
- **Получение по ID** — GET /api/scheduled/:id возвращает детали платежа
- **Список по создателю** — GET /api/scheduled с заголовком x-wallet-address
- **Список pending платежей** — GET /api/scheduled/pending
- **Upcoming платежи** — GET /api/scheduled/upcoming?days=7
- **Несуществующий платеж → 404/500** — GET для несуществующего ID

### Обновление
- **Обновление своего платежа** — PUT /api/scheduled/:id меняет сумму/дату
- **Обновление чужого платежа → 400/403** — не-создатель не может изменить

### Выполнение
- **Выполнение платежа** — POST /api/scheduled/:id/execute с txHash меняет статус на `executed`
- **Повторное выполнение → 400** — уже выполненный платеж нельзя выполнить снова

### Отмена и удаление
- **Отмена платежа** — POST /api/scheduled/:id/cancel меняет статус на `cancelled`
- **Удаление платежа** — DELETE /api/scheduled/:id удаляет запись

---

## 5. Split Bills (15 тестов)

### Создание
- **Создание split с участниками** — POST /api/splits с 3 участниками
- **Без участников → 400** — пустой массив participants отклоняется
- **Разные токены** — можно создать split в ETH или USDC
- **Валидные суммы** — суммы участников могут совпадать или не совпадать с total

### Чтение
- **Получение по ID** — GET /api/splits/:id возвращает split с участниками
- **Несуществующий split → 404** — GET для несуществующего UUID
- **Список по создателю** — GET /api/splits/creator/:address
- **Pending splits для участника** — GET /api/splits/pending/:address

### Оплата участников
- **Отметить участника оплатившим** — POST /api/splits/:id/pay с participantAddress и txHash
- **Статус оплаты сохраняется** — повторный GET показывает `status: 'paid'` и txHash
- **Повторная оплата → 400** — уже оплатившего участника нельзя отметить снова
- **Все оплатили → completed** — когда все участники оплатили, статус split меняется
- **Несуществующий участник → 404** — попытка отметить адрес не из списка

### Отмена
- **Создатель может отменить** — DELETE /api/splits/:id?address=creator меняет статус на `cancelled`
- **Не-создатель не может отменить → 400/403** — чужой адрес в query param

---

## 6. BLIK WebSocket (12 тестов)

### Подключение
- **Подключение к WebSocket** — socket.io подключается к /blik namespace
- **Регистрация адреса** — emit 'register' с адресом кошелька

### Создание кода
- **Создание BLIK кода** — emit 'create-code' → получаем 'code-created' с 6-значным кодом
- **Множественные коды** — один адрес может создать несколько активных кодов
- **Невалидная сумма** — отрицательная сумма игнорируется или возвращает ошибку

### Поиск кода
- **Lookup существующего кода** — emit 'lookup-code' → получаем 'code-info' с данными
- **Lookup несуществующего → code-not-found** — код '000000' не найден
- **Lookup оплаченного кода** — после оплаты код не находится

### Оплата
- **Подтверждение платежа** — emit 'confirm-payment' с txHash → receiver получает 'payment-confirmed'

### Отмена
- **Отмена кода** — emit 'cancel-code' → получаем 'code-cancelled'

### TTL
- **Код имеет TTL 2 минуты** — проверяем что expiresAt установлен (полный тест требует ожидания)

---

## 7. AI Assistant (14 тестов)

### Health и метаданные
- **Health check** — GET /ai/health возвращает статус (healthy/degraded/unhealthy)
- **Список tools** — GET /ai/tools возвращает массив доступных инструментов
- **Список providers** — GET /ai/providers возвращает available и active provider

### Валидация чата
- **Без userAddress → 400** — POST /ai/chat без адреса отклоняется
- **Пустой content → 400** — пустое сообщение отклоняется

### Чат (зависит от наличия AI provider)
- **Простое сообщение** — POST /ai/chat с 'Hello' возвращает ответ или ошибку конфигурации
- **Сообщение на русском** — POST /ai/chat с 'Привет' поддерживается
- **Запрос баланса** — может триггерить tool call
- **Запрос отправки** — 'Send 10 USDC to 0x...' может триггерить prepare_send

### Прямое выполнение tools
- **Выполнение get_balance** — POST /ai/tool с tool='get_balance'
- **Невалидный tool** — POST /ai/tool с несуществующим tool возвращает 400 или success: false

### Suggestions
- **Получение suggestions** — GET /ai/suggestions?address=0x... возвращает массив
- **Без адреса → 400** — GET /ai/suggestions без query param отклоняется

### Security alerts
- **Создание security alert** — POST /ai/security/alert создает suggestion с типом alert

---

## Не покрытые сценарии (для review)

### Username
- [ ] Максимальная длина username (20 символов)
- [ ] Минимальная длина username (3 символа)
- [ ] Специальные символы (только `_` разрешен)
- [ ] Rate limiting на регистрацию
- [ ] Concurrent регистрация одного имени

### Preferences
- [ ] tokenOverrides с несколькими токенами
- [ ] Максимальное количество overrides
- [ ] Валидация chainId в tokenOverrides

### Scheduled
- [ ] Recurring intervals (daily, weekly, monthly)
- [ ] Автоматическое выполнение по расписанию
- [ ] Notification при приближении срока
- [ ] Множественные платежи одному получателю

### Split
- [ ] Максимальное количество участников
- [ ] Частичная оплата (если поддерживается)
- [ ] Reminder для неоплативших
- [ ] Split с username вместо адреса

### BLIK
- [ ] Истечение кода (полный тест 2 минуты)
- [ ] Concurrent lookup одного кода
- [ ] Reconnection handling
- [ ] Максимальное количество активных кодов

### AI
- [ ] Rate limiting (requests per minute)
- [ ] Conversation history/context
- [ ] Tool chaining (несколько tools в одном запросе)
- [ ] Error recovery в tool execution
- [ ] Localization (uk, en, ru)

### Общее
- [ ] Authentication/Authorization
- [ ] Database persistence после перезапуска
- [ ] Error logging и monitoring
- [ ] Performance под нагрузкой
- [ ] WebSocket reconnection

---

## Запуск тестов

```bash
# Все тесты
pnpm test:all

# Отдельный модуль
pnpm test:module <module>

# Где module: health | username | preferences | scheduled | split | blik | ai
```
