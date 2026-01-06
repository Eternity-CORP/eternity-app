# Story S-22: Reply-to-Pay Confirmation

**Story ID:** S-22
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P0
**Estimate:** 8 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** to confirm transactions with swipe gestures or text commands
**So that** I feel like I'm chatting with a smart assistant, not filling forms

---

## Acceptance Criteria

- [ ] Swipe right to confirm, swipe left to cancel
- [ ] Text commands work: "OK", "Send it", "Confirm", "Cancel", "No"
- [ ] Swipe threshold: 40% of card width
- [ ] Haptic feedback on swipe threshold reached
- [ ] Animation: card slides off screen on confirm
- [ ] Works in both EN and RU locales
- [ ] Integrates with Item Card component (S-21)

---

## Design Specifications

### Swipe Gestures

```
┌─────────────────────────────────────┐
│                                     │
│   ← SWIPE LEFT (Cancel)             │
│      Card turns red, slides left    │
│                                     │
│   SWIPE RIGHT (Confirm) →           │
│      Card turns green, slides right │
│                                     │
└─────────────────────────────────────┘
```

### Text Commands (Voice-like)

| Command (EN) | Command (RU) | Action |
|--------------|--------------|--------|
| "OK" | "ОК" | Confirm |
| "Send it" | "Отправь" | Confirm |
| "Confirm" | "Подтвердить" | Confirm |
| "Yes" | "Да" | Confirm |
| "Cancel" | "Отмена" | Cancel |
| "No" | "Нет" | Cancel |
| "Wait" | "Подожди" | Dismiss (keep pending) |

---

## Technical Implementation

### Gesture Handler

```typescript
// mobile/src/components/ItemCard/SwipeableCard.tsx

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';

interface SwipeableCardProps {
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  onConfirm,
  onCancel,
  children,
}) => {
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - Confirm
        translateX.value = withSpring(SCREEN_WIDTH);
        runOnJS(onConfirm)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - Cancel
        translateX.value = withSpring(-SCREEN_WIDTH);
        runOnJS(onCancel)();
      } else {
        // Return to center
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      ['#EF4444', '#1F2937', '#22C55E']
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
```

### Text Command Parser

```typescript
// mobile/src/utils/confirmationParser.ts

const CONFIRM_COMMANDS = {
  en: ['ok', 'send', 'send it', 'confirm', 'yes', 'do it', 'go'],
  ru: ['ок', 'окей', 'отправь', 'отправить', 'подтвердить', 'да', 'давай'],
};

const CANCEL_COMMANDS = {
  en: ['cancel', 'no', 'stop', 'wait', 'nevermind'],
  ru: ['отмена', 'нет', 'стоп', 'подожди', 'отменить'],
};

export const parseConfirmationCommand = (
  text: string,
  locale: 'en' | 'ru' = 'en'
): 'confirm' | 'cancel' | 'unknown' => {
  const normalized = text.toLowerCase().trim();

  if (CONFIRM_COMMANDS[locale].some(cmd => normalized.includes(cmd))) {
    return 'confirm';
  }

  if (CANCEL_COMMANDS[locale].some(cmd => normalized.includes(cmd))) {
    return 'cancel';
  }

  return 'unknown';
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/components/ItemCard/SwipeableCard.tsx` | CREATE | Swipeable wrapper |
| `mobile/src/utils/confirmationParser.ts` | CREATE | Text command parsing |
| `mobile/src/components/ItemCard/ItemCard.tsx` | MODIFY | Integrate swipe |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Swipe right >40% | Card slides right, onConfirm called |
| 2 | Swipe left >40% | Card slides left, onCancel called |
| 3 | Swipe <40% and release | Card returns to center |
| 4 | Type "OK" | Returns 'confirm' |
| 5 | Type "Cancel" | Returns 'cancel' |
| 6 | Type "Hello" | Returns 'unknown' |
| 7 | Type "ОК" (Russian) | Returns 'confirm' with ru locale |

---

## Definition of Done

- [ ] Swipe gestures work on iOS and Android
- [ ] Text commands work in EN and RU
- [ ] Haptic feedback on threshold
- [ ] Animation is smooth (60fps)
- [ ] Integrates with Item Card (S-21)
- [ ] Unit tests pass
