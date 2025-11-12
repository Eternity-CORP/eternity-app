# 🔧 Исправление: Замена Swipe на кнопку

## Что было сделано

Заменил `SwipeToConfirm` на обычную кнопку `TouchableOpacity`, так как свайп не работал.

## Изменения

### SendEthScreen.tsx

**Было:**
```tsx
<SwipeToConfirm
  onConfirm={handleSend}
  text={sending ? 'Sending...' : 'Slide to send'}
  disabled={!isFormValid()}
/>
```

**Стало:**
```tsx
<TouchableOpacity
  style={[styles.sendButton, { backgroundColor: !isFormValid() ? theme.colors.border : theme.colors.success }]}
  onPress={handleSend}
  disabled={!isFormValid() || sending}
>
  {sending ? (
    <ActivityIndicator size="small" color="#FFFFFF" />
  ) : (
    <Text style={styles.sendButtonText}>Send ETH</Text>
  )}
</TouchableOpacity>
```

## Преимущества новой кнопки

✅ **Работает сразу** - просто нажми
✅ **Индикатор загрузки** - видно когда отправляется
✅ **Визуальная обратная связь** - кнопка меняет цвет
✅ **Блокируется** когда форма невалидна

## Как использовать

1. Заполни форму (адрес + сумма)
2. Выбери gas fee level
3. **Просто нажми кнопку "Send ETH"**
4. Дождись подтверждения

## Внешний вид

- **Активна** (зелёная) - форма валидна, можно отправлять
- **Неактивна** (серая) - форма невалидна
- **Загрузка** (спиннер) - транзакция отправляется

Теперь всё должно работать! 🚀
