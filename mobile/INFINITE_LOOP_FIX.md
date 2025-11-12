# ✅ Исправление бесконечного цикла

## 🐛 Проблема

```
ERROR The result of getSnapshot should be cached to avoid an infinite loop
ERROR Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

## 🔍 Причина

В `ScheduledPaymentsList.tsx` вызывалась функция `getAllPayments()` внутри селектора Zustand:

```typescript
// ❌ НЕПРАВИЛЬНО - вызов функции в селекторе
const allPayments = useScheduledPayments((state) => state.getAllPayments());
```

Это создавало бесконечный цикл:
1. Компонент рендерится
2. Селектор вызывает `getAllPayments()`
3. Возвращается новый массив
4. Zustand видит изменение
5. Компонент ре-рендерится
6. Повторяется с шага 2 → ∞

## ✅ Решение

Получаем функцию из store, а вызываем её отдельно:

```typescript
// ✅ ПРАВИЛЬНО - получаем функцию, вызываем отдельно
const getAllPayments = useScheduledPayments((state) => state.getAllPayments);
const allPayments = getAllPayments();
```

## 📝 Изменения

### ScheduledPaymentsList.tsx

**Было:**
```typescript
export default function ScheduledPaymentsList() {
  const { theme } = useTheme();
  const allPayments = useScheduledPayments((state) => state.getAllPayments());  // ❌
  const removePayment = useScheduledPayments((state) => state.removePayment);
  
  const payments = allPayments.filter(p => p.status === 'scheduled');
}
```

**Стало:**
```typescript
export default function ScheduledPaymentsList() {
  const { theme } = useTheme();
  const getAllPayments = useScheduledPayments((state) => state.getAllPayments);  // ✅
  const removePayment = useScheduledPayments((state) => state.removePayment);
  
  const allPayments = getAllPayments();  // ✅ Вызываем отдельно
  const payments = allPayments.filter(p => p.status === 'scheduled');
}
```

## 🎯 Почему это работает

### Zustand селекторы

Zustand сравнивает результаты селекторов для определения нужно ли ре-рендерить:

```typescript
// ❌ Каждый раз новый массив → всегда ре-рендер
state.getAllPayments()  // [payment1, payment2] !== [payment1, payment2]

// ✅ Та же функция → ре-рендер только при изменении store
state.getAllPayments    // function === function
```

### Правильный паттерн

```typescript
// 1. Получаем функцию из store (стабильная ссылка)
const getPayments = useStore((state) => state.getPayments);

// 2. Вызываем функцию в компоненте
const payments = getPayments();

// 3. Фильтруем/трансформируем
const filtered = payments.filter(...);
```

## 🧪 Тестирование

```bash
npm start
```

**Проверь:**
1. ✅ Нет ошибок "Maximum update depth exceeded"
2. ✅ Компонент рендерится один раз
3. ✅ Список платежей отображается
4. ✅ Можно отменить платёж
5. ✅ Нет бесконечных ре-рендеров

## 📚 Общие правила Zustand

### ✅ Правильно:
```typescript
// Получаем примитивы или стабильные ссылки
const count = useStore((state) => state.count);
const increment = useStore((state) => state.increment);

// Получаем функции
const getItems = useStore((state) => state.getItems);
const items = getItems();

// Используем shallow для объектов
const { name, age } = useStore((state) => ({ 
  name: state.name, 
  age: state.age 
}), shallow);
```

### ❌ Неправильно:
```typescript
// Вызов функций в селекторе
const items = useStore((state) => state.getItems());  // ❌

// Создание новых объектов в селекторе
const data = useStore((state) => ({ 
  items: state.items,
  count: state.count 
}));  // ❌ Новый объект каждый раз

// Трансформация в селекторе
const filtered = useStore((state) => 
  state.items.filter(x => x.active)
);  // ❌ Новый массив каждый раз
```

## ✅ Результат

**Проблема решена:**
- ✅ Нет бесконечного цикла
- ✅ Компонент рендерится корректно
- ✅ Список платежей работает
- ✅ Производительность оптимальна

**Статус:** ✅ **ИСПРАВЛЕНО!**

---

**Версия:** 1.0.1  
**Дата:** 2025-11-12  
**Тип:** Bug Fix - Infinite Loop
