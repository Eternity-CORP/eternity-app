# Story S-23: Ghost Mode

**Story ID:** S-23
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P1
**Estimate:** 6 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** to hide my balances when in public
**So that** nobody can see how much crypto I have

---

## Acceptance Criteria

- [ ] Toggle Ghost Mode from settings or quick action
- [ ] When ON: all balances show "***" or skeleton
- [ ] When ON: transaction amounts are hidden
- [ ] Quick gesture to toggle (e.g., 3-finger tap or shake)
- [ ] Status bar indicator when Ghost Mode is active
- [ ] Persists across app restarts
- [ ] Can still send/receive while in Ghost Mode

---

## Design Specifications

### Normal Mode vs Ghost Mode

```
NORMAL MODE                    GHOST MODE
┌─────────────────┐            ┌─────────────────┐
│ Total Balance   │            │ Total Balance   │
│ $12,450.00      │     →      │ ••••••          │
│                 │            │                 │
│ ETH   3.5       │            │ ETH   •••       │
│ USDC  1,200     │            │ USDC  •••       │
│ ARB   500       │            │ ARB   •••       │
└─────────────────┘            └─────────────────┘
                               │ 👻 Ghost Mode   │
```

### Quick Toggle Options

| Method | Description |
|--------|-------------|
| 3-finger tap | Tap anywhere with 3 fingers |
| Shake device | Shake phone to toggle |
| Settings toggle | Privacy > Ghost Mode |
| Status bar tap | Tap ghost icon to disable |

### Status Indicator

```
┌─────────────────────────────────────┐
│ 👻  E-Y Wallet         [Ghost Mode] │  ← Header indicator
├─────────────────────────────────────┤
│                                     │
│         Balances Hidden             │
│                                     │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### Ghost Mode Context

```typescript
// mobile/src/contexts/GhostModeContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GhostModeContextType {
  isGhostMode: boolean;
  toggleGhostMode: () => void;
  enableGhostMode: () => void;
  disableGhostMode: () => void;
}

const GHOST_MODE_KEY = '@ghost_mode_enabled';

export const GhostModeContext = createContext<GhostModeContextType | null>(null);

export const GhostModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGhostMode, setIsGhostMode] = useState(false);

  useEffect(() => {
    loadGhostModeState();
  }, []);

  const loadGhostModeState = async () => {
    const stored = await AsyncStorage.getItem(GHOST_MODE_KEY);
    if (stored !== null) {
      setIsGhostMode(JSON.parse(stored));
    }
  };

  const toggleGhostMode = async () => {
    const newState = !isGhostMode;
    setIsGhostMode(newState);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(newState));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const enableGhostMode = async () => {
    setIsGhostMode(true);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(true));
  };

  const disableGhostMode = async () => {
    setIsGhostMode(false);
    await AsyncStorage.setItem(GHOST_MODE_KEY, JSON.stringify(false));
  };

  return (
    <GhostModeContext.Provider value={{ isGhostMode, toggleGhostMode, enableGhostMode, disableGhostMode }}>
      {children}
    </GhostModeContext.Provider>
  );
};

export const useGhostMode = () => {
  const context = useContext(GhostModeContext);
  if (!context) throw new Error('useGhostMode must be used within GhostModeProvider');
  return context;
};
```

### Hidden Balance Component

```typescript
// mobile/src/components/HiddenValue.tsx

import { useGhostMode } from '../contexts/GhostModeContext';

interface HiddenValueProps {
  value: string | number;
  placeholder?: string;
}

export const HiddenValue: React.FC<HiddenValueProps> = ({
  value,
  placeholder = '••••••'
}) => {
  const { isGhostMode } = useGhostMode();

  return (
    <Text style={styles.value}>
      {isGhostMode ? placeholder : value}
    </Text>
  );
};
```

### Shake Detection

```typescript
// mobile/src/hooks/useShakeDetector.ts

import { useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';

export const useShakeDetector = (onShake: () => void) => {
  useEffect(() => {
    const SHAKE_THRESHOLD = 1.5;
    let lastUpdate = 0;

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (now - lastUpdate > 200) {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        if (acceleration > SHAKE_THRESHOLD) {
          onShake();
        }
        lastUpdate = now;
      }
    });

    Accelerometer.setUpdateInterval(100);

    return () => subscription.remove();
  }, [onShake]);
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/contexts/GhostModeContext.tsx` | CREATE | Ghost mode state |
| `mobile/src/components/HiddenValue.tsx` | CREATE | Hidden value display |
| `mobile/src/hooks/useShakeDetector.ts` | CREATE | Shake detection |
| `mobile/src/screens/HomeScreen.tsx` | MODIFY | Use HiddenValue |
| `mobile/src/screens/SettingsScreen.tsx` | MODIFY | Add toggle |
| `mobile/App.tsx` | MODIFY | Add provider |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Enable Ghost Mode | All balances show "••••••" |
| 2 | Disable Ghost Mode | Balances show real values |
| 3 | Shake device | Ghost Mode toggles |
| 4 | Restart app with Ghost ON | Ghost Mode persists |
| 5 | Send while Ghost ON | Can still send (amounts hidden in confirmation) |

---

## Definition of Done

- [ ] Ghost Mode toggle works
- [ ] All balance displays respect Ghost Mode
- [ ] Shake detection works on iOS and Android
- [ ] State persists across app restarts
- [ ] Status indicator visible
- [ ] Can still transact in Ghost Mode
