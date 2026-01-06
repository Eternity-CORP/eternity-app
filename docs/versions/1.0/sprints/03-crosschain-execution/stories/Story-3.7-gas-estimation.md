# S-12: Gas estimation + fee breakdown

**Epic:** EPIC-03 (Cross-Chain выполнение)  
**Приоритет:** Medium  
**Оценка:** 6 часов

---

## Задача

Показывать точную разбивку комиссий перед cross-chain транзакцией.

## Acceptance Criteria

- [ ] Показывать: Source gas + Bridge fee + Dest gas = Total
- [ ] Сравнение fees между агрегаторами
- [ ] Warning если fees >10% от суммы
- [ ] Block если fees >50% от суммы
- [ ] Обновление fees каждые 30 сек

## Fee Breakdown UI

```
Source gas (Polygon):  $0.50
Bridge fee:            $1.20
Dest gas (Arbitrum):   $0.30
─────────────────────────────
Total fees:            $2.00
```

## Aggregator Comparison

```
LiFi:   $2.00 (Fastest - 2 min)
Rango:  $1.50 (Cheapest - 5 min)
Socket: $1.80 (Balanced - 3 min)
```

## Warnings

- fees >10%: "⚠️ Высокие комиссии. Отправьте больше чтобы снизить %."
- fees >50%: "❌ Очень высокие комиссии. Подождите или используйте ту же сеть."
