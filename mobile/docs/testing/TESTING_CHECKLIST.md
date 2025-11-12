# Testing Checklist - Send Native ETH

## 🧪 Pre-Testing Setup

### Environment Configuration
- [ ] Alchemy API key настроен в `.env`
  ```bash
  EXPO_PUBLIC_ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
  ```
- [ ] Тестовый кошелек имеет баланс Sepolia ETH
  - Faucet: https://sepoliafaucet.com/
  - Минимум: 0.01 tETH
- [ ] RPC подключение работает
  ```bash
  npm start
  # Проверить в логах подключение к Sepolia
  ```

## 📋 Unit Tests

### Run Tests
```bash
cd mobile
npm test -- transactions.test.ts
```

### Expected Results
- [ ] ✅ All 16 unit tests pass
- [ ] ✅ Address validation tests (4/4)
- [ ] ✅ Amount validation tests (5/5)
- [ ] ✅ Balance checking tests (2/2)
- [ ] ✅ RPC error handling tests (3/3)
- [ ] ✅ Gas fee level tests (2/2)

### Coverage Check
```bash
npm test -- transactions.test.ts --coverage
```
- [ ] ✅ Coverage > 80%

## 🌐 Integration Tests (Sepolia)

### Run Integration Tests
```bash
cd mobile
INTEGRATION_TESTS=true npm test -- transactions.integration.test.ts
```

### Expected Results
- [ ] ✅ All 10 integration tests pass
- [ ] ✅ Send with low fee (test 1)
- [ ] ✅ Send with medium fee (test 2)
- [ ] ✅ Send with high fee (test 3)
- [ ] ✅ Wait for 2 confirmations (test 4)
- [ ] ✅ Already confirmed transaction (test 5)
- [ ] ✅ sendNativeAndWait (test 6)
- [ ] ✅ Insufficient funds error (test 7)
- [ ] ✅ Invalid address error (test 8)
- [ ] ✅ Zero amount error (test 9)
- [ ] ✅ Gas estimation (test 10)

### Manual Verification
После каждого теста проверить в Etherscan:
- [ ] Транзакция появилась: https://sepolia.etherscan.io/
- [ ] Статус: Success
- [ ] Gas использован корректно
- [ ] Сумма соответствует ожидаемой

## 📱 UI Testing

### Navigation
- [ ] Экран `SendEthScreen` доступен через навигацию
- [ ] Кнопка "Back" работает
- [ ] Заголовок отображается корректно

### Form Validation

#### Address Input
- [ ] Пустой адрес - нет ошибки
- [ ] Невалидный адрес - красная рамка + сообщение об ошибке
- [ ] Валидный адрес - зеленая рамка
- [ ] Lowercase адрес конвертируется в EIP-55 checksum
- [ ] Адрес можно вставить из буфера обмена

#### Amount Input
- [ ] Пустая сумма - нет ошибки
- [ ] Сумма "0" - ошибка
- [ ] Отрицательная сумма - ошибка
- [ ] Валидная сумма - принимается
- [ ] Decimal separator работает (0.001)
- [ ] Очень маленькие суммы работают (0.000001)

#### Balance Check
- [ ] Баланс отображается корректно
- [ ] Предупреждение при недостаточном балансе
- [ ] Учитывается комиссия газа
- [ ] Кнопка Send заблокирована при недостаточном балансе

### Gas Fee Selection

#### Fee Levels
- [ ] Low fee отображается с ценой
- [ ] Medium fee отображается с ценой (выбран по умолчанию)
- [ ] High fee отображается с ценой
- [ ] Переключение между уровнями работает
- [ ] Цены различаются (low < medium < high)

#### Advanced Options
- [ ] Кнопка "Show Advanced Options" работает
- [ ] Gas Limit поле отображается
- [ ] Max Fee поле отображается
- [ ] Priority Fee поле отображается
- [ ] Placeholder значения корректны
- [ ] Кастомные значения принимаются
- [ ] Кнопка "Hide Advanced Options" работает

### Transaction Flow

#### Sending
- [ ] Swipe-to-confirm работает
- [ ] Форма блокируется во время отправки
- [ ] Статус "Sending..." отображается
- [ ] Индикатор загрузки показывается

#### Status Display
- [ ] Статус-карточка появляется после отправки
- [ ] Hash отображается корректно
- [ ] Статус "Pending" показывается
- [ ] Иконка соответствует статусу

#### Confirmations
- [ ] Статус меняется на "Confirming"
- [ ] Количество подтверждений обновляется
- [ ] Статус меняется на "Confirmed" после 2 блоков
- [ ] Финальный alert показывается

### Error Handling

#### UI Errors
- [ ] Insufficient funds - alert с сообщением
- [ ] Invalid address - alert с сообщением
- [ ] Invalid amount - alert с сообщением
- [ ] Network error - alert с сообщением
- [ ] Timeout - alert с сообщением

#### Recovery
- [ ] После ошибки можно повторить отправку
- [ ] Форма разблокируется после ошибки
- [ ] Статус сбрасывается

## 🔄 Real Transaction Test

### Test Scenario 1: Basic Send
```
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Amount: 0.001 tETH
Fee Level: Medium
```

**Steps:**
1. [ ] Открыть SendEthScreen
2. [ ] Ввести адрес получателя
3. [ ] Ввести сумму 0.001
4. [ ] Проверить оценку газа (~0.00015 ETH)
5. [ ] Swipe to confirm
6. [ ] Дождаться статуса "Sent"
7. [ ] Дождаться 2 подтверждений
8. [ ] Проверить в Etherscan

**Expected:**
- [ ] Транзакция отправлена успешно
- [ ] Hash получен
- [ ] Подтверждена в течение 30 секунд
- [ ] Баланс уменьшился на 0.001 + gas

### Test Scenario 2: High Fee Send
```
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Amount: 0.001 tETH
Fee Level: High
```

**Steps:**
1. [ ] Открыть SendEthScreen
2. [ ] Ввести адрес и сумму
3. [ ] Выбрать "High" fee level
4. [ ] Проверить что комиссия выше чем Medium
5. [ ] Отправить транзакцию
6. [ ] Проверить что подтверждается быстрее

**Expected:**
- [ ] Комиссия выше чем в Scenario 1
- [ ] Подтверждается быстрее (обычно)

### Test Scenario 3: Custom Gas
```
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Amount: 0.001 tETH
Gas Limit: 25000
Max Fee: 50 Gwei
Priority Fee: 2 Gwei
```

**Steps:**
1. [ ] Открыть SendEthScreen
2. [ ] Ввести адрес и сумму
3. [ ] Открыть Advanced Options
4. [ ] Ввести кастомные параметры газа
5. [ ] Отправить транзакцию
6. [ ] Проверить в Etherscan что использованы кастомные параметры

**Expected:**
- [ ] Транзакция использует указанные параметры
- [ ] Gas limit = 25000
- [ ] Max fee ≈ 50 Gwei

### Test Scenario 4: Error - Insufficient Funds
```
Amount: 1000 tETH (больше чем баланс)
```

**Steps:**
1. [ ] Ввести очень большую сумму
2. [ ] Попытаться отправить

**Expected:**
- [ ] Alert: "Insufficient funds"
- [ ] Детали ошибки показаны
- [ ] Форма остается доступной

### Test Scenario 5: Error - Invalid Address
```
Address: 0xinvalid
```

**Steps:**
1. [ ] Ввести невалидный адрес
2. [ ] Попытаться отправить

**Expected:**
- [ ] Alert: "Invalid Ethereum address"
- [ ] Красная рамка вокруг поля адреса
- [ ] Кнопка Send заблокирована

## 📊 Performance Testing

### Load Time
- [ ] Экран загружается < 1 секунды
- [ ] Баланс загружается < 2 секунд
- [ ] Gas estimation < 1 секунды

### Response Time
- [ ] Валидация адреса мгновенная
- [ ] Переключение fee levels мгновенное
- [ ] Отправка транзакции < 3 секунд

### Memory
- [ ] Нет утечек памяти при многократном использовании
- [ ] Форма корректно очищается при unmount

## 🔍 Edge Cases

### Network Issues
- [ ] Отключить WiFi - показать network error
- [ ] Медленное соединение - показать timeout
- [ ] RPC недоступен - переключиться на fallback

### Concurrent Transactions
- [ ] Отправить 2 транзакции подряд
- [ ] Проверить что nonce корректный
- [ ] Обе транзакции подтверждаются

### Very Small Amounts
- [ ] 0.000001 ETH работает
- [ ] 1 wei работает
- [ ] Gas оценивается корректно

### Very Large Amounts
- [ ] Максимальная сумма (весь баланс - gas)
- [ ] Проверка что остается на gas
- [ ] Корректная обработка

## ✅ Final Checklist

### Code Quality
- [ ] Нет TypeScript ошибок
- [ ] Нет ESLint warnings
- [ ] Код отформатирован (Prettier)
- [ ] Все imports корректны

### Documentation
- [ ] README обновлен
- [ ] API документация полная
- [ ] Примеры использования добавлены
- [ ] Комментарии в коде

### Git
- [ ] Все файлы добавлены в git
- [ ] Коммит с описательным сообщением
- [ ] Branch создан (если нужно)

### Deployment Ready
- [ ] .env.example обновлен
- [ ] Dependencies в package.json
- [ ] Нет hardcoded secrets
- [ ] Production-ready error handling

## 📝 Test Results

### Date: _____________

### Tester: _____________

### Environment:
- [ ] iOS Simulator
- [ ] Android Emulator
- [ ] Real iOS Device
- [ ] Real Android Device

### Results Summary:
- Unit Tests: ___/16 passed
- Integration Tests: ___/10 passed
- UI Tests: ___/___ passed
- Real Transactions: ___/___ successful

### Issues Found:
1. ________________________________
2. ________________________________
3. ________________________________

### Notes:
________________________________
________________________________
________________________________

### Sign-off:
- [ ] All critical tests passed
- [ ] All blockers resolved
- [ ] Ready for production

**Signature:** _________________ **Date:** _____________
