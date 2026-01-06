# Story S-21: Item Card Component

**Story ID:** S-21
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P0
**Estimate:** 6 hours
**Status:** 📋 Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** to see transactions as visual cards
**So that** I can quickly understand and trust what I'm signing

---

## Acceptance Criteria

- [ ] Card displays: recipient, amount, fee, network
- [ ] 3 color states: 🟢 Safe (green), 🟡 Caution (yellow), 🔴 Warning (red)
- [ ] Tap to flip reveals detailed stats
- [ ] Flip animation smooth (60fps)
- [ ] Haptic feedback on render (different vibration per color)
- [ ] Card is swipeable (for Reply-to-Pay gesture)

---

## Design Specifications

### Front Face (Summary)

```
┌─────────────────────────────────┐
│  🟢 SAFE TRANSACTION            │  ← Color-coded header
│                                 │
│  To: @alice                     │  ← Recipient (resolved)
│      (0x7a3...known)            │  ← Address preview
│                                 │
│  Amount: 0.5 ETH                │  ← Amount in token
│          (~$1,600)              │  ← Fiat equivalent
│                                 │
│  Fee: ~$0.50                    │  ← Gas estimate
│  Network: Ethereum              │  ← Chain name
│                                 │
│  ┌─────────────────────────┐    │
│  │   Tap to see details    │    │  ← Flip hint
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Back Face (Stats)

```
┌─────────────────────────────────┐
│  📊 TRANSACTION STATS           │
│                                 │
│  Power:      $1,600             │  ← Amount in USD
│  Cost:       21,000 gas         │  ← Gas units
│  Slippage:   0.5%               │  ← For swaps
│  Contract:   ✅ Verified         │  ← Etherscan status
│  Address:    2 years old        │  ← First tx age
│  Your TXs:   5 previous         │  ← History with addr
│                                 │
│  ┌─────────────────────────┐    │
│  │   Tap to go back        │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Color States

| State | Color | Header Text | Trigger Conditions |
|-------|-------|-------------|-------------------|
| Safe | `#22C55E` (green) | "SAFE TRANSACTION" | Known recipient, verified contract, normal amount |
| Caution | `#EAB308` (yellow) | "REVIEW CAREFULLY" | New recipient OR amount >5x average |
| Warning | `#EF4444` (red) | "HIGH RISK" | Unknown contract OR amount >10x average OR blacklisted |

---

## Technical Implementation

### Component Structure

```typescript
// mobile/src/components/ItemCard/ItemCard.tsx

interface ItemCardProps {
  transaction: TransactionIntent;
  riskLevel: 'safe' | 'caution' | 'warning';
  riskReasons?: string[];
  onFlip?: () => void;
  onSwipeLeft?: () => void;   // Cancel
  onSwipeRight?: () => void;  // Confirm
}

export const ItemCard: React.FC<ItemCardProps> = ({
  transaction,
  riskLevel,
  riskReasons,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useSharedValue(0);

  // Haptic feedback on mount based on risk level
  useEffect(() => {
    triggerHaptic(riskLevel);
  }, [riskLevel]);

  const handleFlip = () => {
    flipAnimation.value = withSpring(isFlipped ? 0 : 180);
    setIsFlipped(!isFlipped);
    onFlip?.();
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Front and Back faces */}
      </Animated.View>
    </GestureDetector>
  );
};
```

### Haptic Feedback

```typescript
// mobile/src/utils/haptics.ts

import * as Haptics from 'expo-haptics';

export const triggerHaptic = (riskLevel: 'safe' | 'caution' | 'warning') => {
  switch (riskLevel) {
    case 'safe':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'caution':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
};
```

### Animation (Flip)

```typescript
// Using react-native-reanimated for smooth 60fps animation

const frontAnimatedStyle = useAnimatedStyle(() => {
  const rotateY = interpolate(
    flipAnimation.value,
    [0, 180],
    [0, 180]
  );
  return {
    transform: [{ rotateY: `${rotateY}deg` }],
    backfaceVisibility: 'hidden',
  };
});

const backAnimatedStyle = useAnimatedStyle(() => {
  const rotateY = interpolate(
    flipAnimation.value,
    [0, 180],
    [180, 360]
  );
  return {
    transform: [{ rotateY: `${rotateY}deg` }],
    backfaceVisibility: 'hidden',
  };
});
```

---

## Files to Create

| File | Description |
|------|-------------|
| `mobile/src/components/ItemCard/ItemCard.tsx` | Main component |
| `mobile/src/components/ItemCard/ItemCardFront.tsx` | Front face |
| `mobile/src/components/ItemCard/ItemCardBack.tsx` | Back face (stats) |
| `mobile/src/components/ItemCard/styles.ts` | Styled components |
| `mobile/src/components/ItemCard/index.ts` | Export barrel |
| `mobile/src/utils/haptics.ts` | Haptic feedback utility |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Render with `riskLevel='safe'` | Green header, light haptic |
| 2 | Render with `riskLevel='warning'` | Red header, warning haptic |
| 3 | Tap card | Flip animation plays, back shows |
| 4 | Tap flipped card | Flips back to front |
| 5 | Animation FPS | >55 FPS during flip |

---

## Definition of Done

- [ ] Component renders all transaction data
- [ ] 3 color states work correctly
- [ ] Flip animation is smooth (60fps)
- [ ] Haptic feedback triggers on mount
- [ ] Component is accessible (screen reader support)
- [ ] Storybook story created for design review
