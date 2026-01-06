# S-19: Реализовать Demo/Live Mode переключатель

**Epic:** EPIC-05 (Demo/Live Mode)  
**Приоритет:** High  
**Оценка:** 4 часа  
**Статус:** ✅ Done

---

## Задача

Реализовать переключатель режимов приложения между Demo (тестовые сети) и Live (mainnet с реальными деньгами).

## Acceptance Criteria

- [x] Создать сервис управления режимом (networkModeService)
- [x] Добавить UI переключателя в Settings
- [x] При выборе Demo — доступны только Sepolia и Holesky
- [x] При выборе Live — доступен только Mainnet
- [x] При переключении на Live — показывать предупреждение с подтверждением
- [x] Автоматически переключать сеть при смене режима
- [x] Показывать индикатор текущего режима на HomeScreen

## Существующие файлы

- `mobile/src/services/networkModeService.ts` — сервис управления режимом
- `mobile/src/features/network/NetworkModeSwitcher.tsx` — UI переключателя
- `mobile/src/features/network/NetworkSwitcher.tsx` — обновлён для фильтрации по режиму
- `mobile/src/screens/SettingsScreen.tsx` — добавлен пункт Wallet Mode
- `mobile/src/screens/HomeScreen.tsx` — индикатор режима в хедере

## Технические заметки

- Режим сохраняется в AsyncStorage
- По умолчанию — Demo Mode (безопасно для новых пользователей)
- При переключении на Live Mode — принудительно меняем сеть на mainnet
- При переключении на Demo Mode — принудительно меняем на sepolia

## Дата завершения

2025-12-18
