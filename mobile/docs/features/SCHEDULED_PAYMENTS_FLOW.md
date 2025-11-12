# 📅 Как работают отложенные платежи

Подробное объяснение логики отложенных платежей в приложении.

## 🎯 Задумка

**Пользовательский сценарий:**
1. Пользователь выбирает получателя
2. Вводит сумму (например, 0.01 ETH)
3. Выбирает время отправки (например, через 5 минут)
4. Нажимает "Отправить"
5. **Через 5 минут** деньги автоматически списываются и отправляются получателю

## 🔄 Текущая реализация

### Архитектура

Система состоит из нескольких компонентов:

```
┌─────────────────────────────────────────────────────────────┐
│                    Пользователь                              │
│  (выбирает время, сумму, получателя, нажимает "Отправить")  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              scheduledPaymentService.ts                      │
│  • Сохраняет платёж в AsyncStorage                          │
│  • Создаёт уведомление на нужное время                       │
│  • Статус: "pending"                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   JobRunner.ts                               │
│  • Проверяет каждые 20 секунд: есть ли платежи к отправке?  │
│  • Если время пришло → выполняет транзакцию                  │
│  • Обновляет статус: "running" → "completed"/"failed"        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain (Ethereum/Polygon/etc)               │
│  • Транзакция отправлена                                     │
│  • Деньги списаны с кошелька                                 │
│  • Получатель получает средства                              │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Пошаговый процесс

### Шаг 1: Создание отложенного платежа

**Файл:** `src/services/scheduledPaymentService.ts`

```typescript
// Пользователь нажал "Отправить"
const payment = createScheduledPayment(
  recipientAddress,  // Адрес получателя
  amount,            // Сумма (например, "0.01")
  scheduledFor,      // Время отправки (Date через 5 минут)
  message,           // Опциональное сообщение
  emoji              // Опциональная эмодзи
);

// Сохраняем в AsyncStorage
await saveScheduledPayment(payment);
```

**Что происходит:**
1. Генерируется уникальный ID платежа
2. Создаётся объект с данными:
   ```typescript
   {
     id: "scheduled_1731369600000_abc123",
     recipientAddress: "0x742d35Cc...",
     amount: "0.01",
     currency: "ETH",
     scheduledFor: 1731369900000,  // Timestamp через 5 минут
     status: "pending",
     createdAt: 1731369600000
   }
   ```
3. Сохраняется в локальное хранилище (AsyncStorage)
4. Создаётся системное уведомление на нужное время

### Шаг 2: Планирование уведомления

**Функция:** `scheduleNotification()`

```typescript
// Создаём уведомление
const notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: '⏰ Scheduled Payment',
    body: `Time to send 0.01 ETH`,
    sound: true,
  },
  trigger: { 
    type: 'date', 
    date: new Date(scheduledFor)  // Через 5 минут
  },
});
```

**Что происходит:**
- iOS/Android создаёт системное уведомление
- Уведомление сработает ровно в указанное время
- Пользователь увидит push-уведомление: "⏰ Time to send 0.01 ETH"

### Шаг 3: Автоматическая проверка (JobRunner)

**Файл:** `src/features/schedule/JobRunner.ts`

```typescript
// JobRunner запускается при старте приложения
const jobRunner = new JobRunner();
jobRunner.start();

// Каждые 20 секунд проверяет:
setInterval(() => {
  tick();  // Проверить, есть ли платежи к отправке
}, 20000);
```

**Функция `tick()`:**
```typescript
async tick(now: number = Date.now()): Promise<void> {
  // 1. Получить все платежи со статусом "pending"
  const duePayments = getDuePayments(now);
  
  // 2. Найти те, у которых scheduledFor <= now
  // Например: scheduledFor = 14:05, now = 14:06 → платёж готов!
  
  // 3. Выполнить каждый платёж
  for (const payment of duePayments) {
    await executePayment(payment);
  }
}
```

**Что происходит:**
- JobRunner работает в фоне
- Каждые 20 секунд проверяет: "Пришло ли время отправить платёж?"
- Если `scheduledFor <= текущее время` → выполняет транзакцию

### Шаг 4: Выполнение транзакции

**Функция:** `executePayment()`

```typescript
async executePayment(payment: ScheduledPayment): Promise<void> {
  // 1. Обновить статус
  payment.status = 'running';
  
  try {
    // 2. Отправить транзакцию в блокчейн
    const { txHash } = await sendETH(
      payment.recipientAddress,  // Куда
      payment.amount,            // Сколько
      defaultNetwork             // Какая сеть
    );
    
    // 3. Дождаться подтверждения (2 блока)
    await waitForConfirmations(txHash, 2);
    
    // 4. Обновить статус на "completed"
    payment.status = 'completed';
    payment.txHash = txHash;
    payment.executedAt = Date.now();
    
    // 5. Показать уведомление об успехе
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Payment Sent!',
        body: `Sent 0.01 ETH`,
      },
      trigger: null,  // Показать сразу
    });
    
  } catch (error) {
    // Ошибка! Обновить статус на "failed"
    payment.status = 'failed';
    payment.errorMessage = error.message;
    
    // Показать уведомление об ошибке
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❌ Payment Failed',
        body: `Failed to send: ${error.message}`,
      },
      trigger: null,
    });
  }
  
  // 6. Сохранить обновлённый платёж
  await saveScheduledPayment(payment);
}
```

**Что происходит:**
1. **Статус → "running"** - платёж выполняется
2. **Отправка транзакции** - вызов `sendETH()` → блокчейн
3. **Ожидание подтверждения** - ждём 2 блока (~30 секунд)
4. **Успех:**
   - Статус → "completed"
   - Сохраняем txHash
   - Показываем уведомление "✅ Payment Sent!"
5. **Ошибка:**
   - Статус → "failed"
   - Сохраняем текст ошибки
   - Показываем уведомление "❌ Payment Failed"

## 📊 Статусы платежа

```typescript
type PaymentStatus = 
  | 'pending'    // Ожидает выполнения
  | 'running'    // Выполняется сейчас
  | 'completed'  // Успешно отправлен
  | 'failed'     // Ошибка при отправке
  | 'cancelled'; // Отменён пользователем
```

**Жизненный цикл:**
```
pending → running → completed ✅
                 ↘ failed ❌
```

## ⏰ Временная линия (пример)

```
14:00:00 - Пользователь создаёт платёж на 14:05
           • Платёж сохранён со статусом "pending"
           • Уведомление запланировано на 14:05

14:00:20 - JobRunner: tick() → нет платежей (14:05 > 14:00:20)
14:00:40 - JobRunner: tick() → нет платежей
14:01:00 - JobRunner: tick() → нет платежей
...
14:04:40 - JobRunner: tick() → нет платежей
14:05:00 - JobRunner: tick() → ЕСТЬ ПЛАТЁЖ! (14:05 <= 14:05)
           • Статус → "running"
           • Отправка транзакции в блокчейн
           • TX Hash: 0xabc123...

14:05:05 - iOS показывает уведомление: "⏰ Time to send 0.01 ETH"

14:05:30 - Транзакция подтверждена (2 блока)
           • Статус → "completed"
           • Уведомление: "✅ Payment Sent!"

14:05:31 - Деньги получены адресатом
```

## 🔧 Ключевые компоненты

### 1. scheduledPaymentService.ts

**Отвечает за:**
- ✅ Создание платежей
- ✅ Сохранение в AsyncStorage
- ✅ Планирование уведомлений
- ✅ Отмена платежей
- ✅ Удаление платежей

**Основные функции:**
```typescript
createScheduledPayment()      // Создать новый платёж
saveScheduledPayment()         // Сохранить в хранилище
getScheduledPayments()         // Получить все платежи
getPendingScheduledPayments()  // Получить ожидающие
executeScheduledPayment()      // Выполнить платёж
cancelScheduledPayment()       // Отменить платёж
deleteScheduledPayment()       // Удалить платёж
checkAndExecutePendingPayments() // Проверить и выполнить
```

### 2. JobRunner.ts

**Отвечает за:**
- ✅ Автоматическую проверку каждые 20 секунд
- ✅ Выполнение транзакций в нужное время
- ✅ Обработку ошибок и retry
- ✅ Обновление статусов

**Основные методы:**
```typescript
start()           // Запустить JobRunner
stop()            // Остановить JobRunner
tick()            // Проверить и выполнить платежи
executePayment()  // Выполнить один платёж
```

### 3. Notifications (expo-notifications)

**Отвечает за:**
- ✅ Системные уведомления iOS/Android
- ✅ Планирование на конкретное время
- ✅ Push-уведомления пользователю

## 🚨 Важные моменты

### ✅ Что работает:

1. **Сохранение платежей** - данные сохраняются локально
2. **Уведомления** - iOS/Android показывают уведомление в нужное время
3. **Автоматическая проверка** - JobRunner проверяет каждые 20 секунд
4. **Выполнение транзакций** - отправка в блокчейн работает
5. **Обработка ошибок** - если транзакция не прошла, статус = "failed"

### ⚠️ Ограничения:

1. **Приложение должно быть запущено**
   - JobRunner работает только когда приложение активно
   - Если приложение закрыто → платёж не выполнится автоматически
   - **Решение:** Background tasks (см. ниже)

2. **Точность времени**
   - Проверка каждые 20 секунд
   - Платёж может выполниться с задержкой до 20 секунд
   - Например: scheduledFor = 14:05:00, выполнится в 14:05:00-14:05:20

3. **Интернет соединение**
   - Нужен интернет для отправки транзакции
   - Если нет интернета → статус "failed"

4. **Баланс кошелька**
   - Должно быть достаточно ETH для транзакции + gas
   - Если недостаточно → статус "failed"

## 🔄 Background Execution

Для выполнения платежей когда приложение закрыто:

### BackgroundFetchAdapter.ts

```typescript
// Регистрация фоновой задачи
TaskManager.defineTask('SCHEDULED_PAYMENTS_TASK', async () => {
  // Проверить и выполнить платежи
  await checkAndExecutePendingPayments();
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Запуск каждые 15 минут (минимум)
await BackgroundFetch.registerTaskAsync('SCHEDULED_PAYMENTS_TASK', {
  minimumInterval: 15 * 60, // 15 минут
});
```

**Ограничения iOS/Android:**
- iOS: минимум 15 минут между проверками
- Android: может быть ограничено системой для экономии батареи
- Не гарантируется точное время выполнения

## 📱 Пример использования

### Создание платежа в UI

```typescript
// CreateScheduledPaymentScreen.tsx
const handleSchedulePayment = async () => {
  // 1. Создать платёж
  const payment = createScheduledPayment(
    recipientAddress,
    amount,
    scheduledDate,  // Через 5 минут
    message,
    emoji
  );
  
  // 2. Сохранить
  await saveScheduledPayment(payment);
  
  // 3. Показать подтверждение
  Alert.alert(
    'Payment Scheduled',
    `Will send ${amount} ETH at ${scheduledDate.toLocaleTimeString()}`
  );
  
  // 4. Вернуться назад
  navigation.goBack();
};
```

### Отображение списка платежей

```typescript
// ScheduledPaymentsScreen.tsx
const [payments, setPayments] = useState<ScheduledPayment[]>([]);

useEffect(() => {
  loadPayments();
}, []);

const loadPayments = async () => {
  const allPayments = await getScheduledPayments();
  setPayments(allPayments);
};

return (
  <FlatList
    data={payments}
    renderItem={({ item }) => (
      <PaymentCard
        payment={item}
        onCancel={() => cancelScheduledPayment(item.id)}
        onDelete={() => deleteScheduledPayment(item.id)}
      />
    )}
  />
);
```

## 🎯 Итог

**Как это работает сейчас:**

1. ✅ Пользователь создаёт платёж → сохраняется локально
2. ✅ Система создаёт уведомление на нужное время
3. ✅ JobRunner проверяет каждые 20 секунд
4. ✅ Когда время пришло → отправляет транзакцию
5. ✅ Деньги списываются и отправляются получателю
6. ✅ Пользователь получает уведомление об успехе/ошибке

**Что нужно для работы:**
- Приложение должно быть запущено (или background task)
- Интернет соединение
- Достаточный баланс ETH
- Разрешение на уведомления

**Статус:** ✅ Работает как задумано!
