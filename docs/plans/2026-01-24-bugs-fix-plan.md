# Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 15 bugs reported in BUGS.md to improve UX and stability of E-Y mobile app

**Architecture:** Incremental fixes grouped by complexity and component area. Each bug is a separate task with clear acceptance criteria.

**Tech Stack:** React Native, Expo Router, Redux Toolkit, TypeScript, Socket.IO

---

## Bug Summary

| # | Bug | Priority | Complexity | Files |
|---|-----|----------|------------|-------|
| 1 | Bottom tab bar не реагирует на нажатия | HIGH | Medium | `_layout.tsx`, root layout |
| 2 | Двойная @ перед username в Pending Payment | LOW | Easy | `split/[id].tsx` |
| 3 | Чёрный текст "Total" при подтверждении транзакции | LOW | Easy | `send/confirm.tsx` |
| 4 | Анимация ожидания + Done кнопка внизу | MEDIUM | Medium | Multiple screens |
| 5 | Улучшить FAB кнопку чата | MEDIUM | Easy | `AiFab.tsx` |
| 6 | Показать username в меню выбора аккаунтов | LOW | Medium | `home.tsx` |
| 7 | Валидация ввода суммы в BLIK | HIGH | Medium | `blik/receive/amount.tsx`, `blik/request.tsx` |
| 8 | Убрать BLIK из Receive | LOW | Easy | `receive/index.tsx` |
| 9 | Добавить выбор токена перед генерацией BLIK кода | MEDIUM | Medium | `blik/receive/` flow |
| 10 | UI для сетевых настроек | HIGH | High | New screens needed |
| 11 | Унифицировать экраны отправки токенов | MEDIUM | High | Send, Scheduled flows |
| 12 | UI для отображения scheduled payments | MEDIUM | Medium | `home.tsx`, `scheduled/` |
| 13 | Защита от спама split bill | HIGH | Medium | Backend + UI |
| 14 | Ошибки AI WebSocket | HIGH | Medium | `ai-service.ts`, hook |
| 15 | Custom split bill логика | MEDIUM | Medium | `split/create/` flow |

---

## Task 1: Fix Bottom Tab Bar Touch Issues

**Priority:** HIGH | **Complexity:** Medium

**Problem:** Bottom tab bar не реагирует на нажатия, пока не перейдёшь на другую страницу каким-то образом.

**Root Cause Analysis:**
- Вероятно, AiFab или другой overlay блокирует touch события
- Возможно, z-index конфликт с tab bar
- Может быть проблема с gesture handler или pointerEvents

**Files:**
- Investigate: `apps/mobile/app/(tabs)/_layout.tsx`
- Investigate: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/components/ai/AiFab.tsx` (lines 67-97)

**Step 1: Investigate root layout**

Check root layout for potential blockers:
```bash
cat apps/mobile/app/_layout.tsx
```

**Step 2: Fix AiFab pointerEvents**

In `apps/mobile/src/components/ai/AiFab.tsx`, ensure the container doesn't block touches outside the FAB:

```typescript
// Change container style to only intercept touches on the FAB itself
<Animated.View
  style={[
    styles.container,
    { bottom: actualBottom, transform: [{ scale: scaleAnim }] },
  ]}
  pointerEvents="box-none" // Add this - allows touches to pass through except on children
>
```

**Step 3: Verify fix**

Test:
1. Open app fresh
2. Try tapping Home, AI, Shard tabs
3. Verify all tabs respond immediately

**Step 4: Commit**
```bash
git add apps/mobile/src/components/ai/AiFab.tsx
git commit -m "fix: tab bar touch handling by adding pointerEvents to AiFab"
```

---

## Task 2: Fix Double @ in Pending Payment Participants

**Priority:** LOW | **Complexity:** Easy

**Problem:** В Pending payment перед никнеймом стоит две собачки (@@username), а должна одна.

**Files:**
- Modify: `apps/mobile/app/split/[id].tsx` (lines 202-206)

**Step 1: Fix the displayName logic**

Current code (line 202-206):
```typescript
const displayName = participant.username
  ? `@${participant.username}`  // Problem: username already has @
  : participant.name
    ? participant.name
    : truncateAddress(participant.address);
```

Fix - remove @ if username already starts with @:
```typescript
const displayName = participant.username
  ? participant.username.startsWith('@')
    ? participant.username
    : `@${participant.username}`
  : participant.name
    ? participant.name
    : truncateAddress(participant.address);
```

**Step 2: Verify fix**

Test:
1. Create split bill with participant that has username
2. View split details
3. Verify username shows as @username (not @@username)

**Step 3: Commit**
```bash
git add apps/mobile/app/split/[id].tsx
git commit -m "fix: remove duplicate @ in split bill participant display"
```

---

## Task 3: Fix Black "Total" Text in Transaction Confirm

**Priority:** LOW | **Complexity:** Easy

**Problem:** При подтверждении транзакции текст "Total" чёрный, должен быть белым.

**Files:**
- Modify: `apps/mobile/app/send/confirm.tsx` (line 239)

**Step 1: Fix Total text color**

Current code (line 239):
```typescript
<Text style={[styles.detailLabel, theme.typography.heading]}>Total</Text>
```

Fix - add explicit color:
```typescript
<Text style={[styles.detailLabel, theme.typography.heading, { color: theme.colors.textPrimary }]}>Total</Text>
```

**Step 2: Also fix the Total value color if needed**

Check line 240:
```typescript
<Text style={[styles.detailValue, theme.typography.heading]}>
```

Should have color set - check if `styles.detailValue` includes color.

**Step 3: Verify fix**

Test:
1. Go through send flow to confirm screen
2. Verify "Total" text is white

**Step 4: Commit**
```bash
git add apps/mobile/app/send/confirm.tsx
git commit -m "fix: ensure Total label has white text color"
```

---

## Task 4: Add Loading Animation + Fixed Done Button

**Priority:** MEDIUM | **Complexity:** Medium

**Problem:** Нужна анимация при ожидании подтверждения транзакции, и кнопка Done должна всегда быть внизу экрана.

**Files:**
- Identify: All screens with "waiting" or "success" states
- Create: Reusable loading animation component
- Modify: Success/waiting screens

**Step 1: Create TransactionPendingAnimation component**

Create `apps/mobile/src/components/TransactionPendingAnimation.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { theme } from '@/src/constants/theme';

interface Props {
  message?: string;
}

export function TransactionPendingAnimation({ message = 'Processing...' }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.outerCircle,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.innerCircle,
            { transform: [{ rotate }] },
          ]}
        >
          <View style={styles.dot} />
        </Animated.View>
      </Animated.View>
      <Text style={[styles.message, theme.typography.body]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  outerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: theme.colors.accent,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
```

**Step 2: Create reusable layout with fixed bottom button**

Create `apps/mobile/src/components/ScreenWithFixedButton.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/constants/theme';

interface Props {
  children: React.ReactNode;
  buttonText: string;
  onButtonPress: () => void;
  buttonDisabled?: boolean;
}

export function ScreenWithFixedButton({
  children,
  buttonText,
  onButtonPress,
  buttonDisabled = false,
}: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {children}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, buttonDisabled && styles.buttonDisabled]}
          onPress={onButtonPress}
          disabled={buttonDisabled}
        >
          <Text style={[styles.buttonText, theme.typography.heading]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  buttonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
```

**Step 3: Update success/waiting screens to use new components**

Apply to relevant screens:
- `apps/mobile/app/send/success.tsx`
- `apps/mobile/app/blik/waiting.tsx`
- Other transaction completion screens

**Step 4: Commit**
```bash
git add apps/mobile/src/components/TransactionPendingAnimation.tsx
git add apps/mobile/src/components/ScreenWithFixedButton.tsx
git add apps/mobile/app/send/success.tsx
git add apps/mobile/app/blik/waiting.tsx
git commit -m "feat: add transaction pending animation and fixed bottom button layout"
```

---

## Task 5: Improve AI FAB Button Design

**Priority:** MEDIUM | **Complexity:** Easy

**Problem:** Кнопку с чатом нужно сделать красивее в цветовой гамме проекта, возможно с градиентом и эффектами при нажатии.

**Files:**
- Modify: `apps/mobile/src/components/ai/AiFab.tsx`

**Step 1: Enhance FAB with better gradient and effects**

Update the FAB with theme-consistent gradient and pulse animation:

```typescript
// Add new imports
import { useRef, useEffect } from 'react';

// In component, add pulse animation
const pulseAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  // Subtle pulse animation when there are suggestions
  if (suggestions.length > 0) {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  } else {
    pulseAnim.setValue(1);
  }
}, [suggestions.length]);

// Update gradient to use theme colors
<LinearGradient
  colors={[theme.colors.accent, theme.colors.accentCyan]} // Blue to cyan gradient
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.fab}
>
```

**Step 2: Update styles with glow effect**

```typescript
fab: {
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: 'center',
  justifyContent: 'center',
  ...theme.shadows.glow, // Use theme's glow shadow
},
```

**Step 3: Commit**
```bash
git add apps/mobile/src/components/ai/AiFab.tsx
git commit -m "feat: enhance AI FAB with theme gradient and pulse animation"
```

---

## Task 6: Show Username in Account Selector

**Priority:** LOW | **Complexity:** Medium

**Problem:** Добавить отображение username в меню выбора аккаунтов, если он есть.

**Files:**
- Modify: `apps/mobile/app/(tabs)/home.tsx` (account selector section)

**Step 1: Add username fetching for accounts**

Add state and effect to fetch usernames:
```typescript
const [accountUsernames, setAccountUsernames] = useState<Record<string, string | null>>({});

// In openAccountSelector function, fetch usernames:
const usernamePromises = wallet.accounts.map(async (account) => {
  try {
    const username = await getUsernameByAddress(account.address);
    return { address: account.address, username };
  } catch {
    return { address: account.address, username: null };
  }
});

Promise.all(usernamePromises).then((results) => {
  const usernames: Record<string, string | null> = {};
  results.forEach(({ address, username }) => {
    usernames[address] = username;
  });
  setAccountUsernames(usernames);
});
```

**Step 2: Display username in account list item**

Update the account item render to show username:
```typescript
<View style={styles.accountListInfo}>
  <Text style={styles.accountListName}>
    {account.label || `Account ${account.accountIndex + 1}`}
  </Text>
  {accountUsernames[account.address] && (
    <Text style={[styles.accountUsername, theme.typography.caption, { color: theme.colors.success }]}>
      @{accountUsernames[account.address]}
    </Text>
  )}
  <Text style={styles.accountListBalance}>{accountBalance}</Text>
</View>
```

**Step 3: Add style for username**
```typescript
accountUsername: {
  marginTop: 2,
},
```

**Step 4: Commit**
```bash
git add apps/mobile/app/\(tabs\)/home.tsx
git commit -m "feat: show username in account selector menu"
```

---

## Task 7: Fix Amount Input Validation in BLIK

**Priority:** HIGH | **Complexity:** Medium

**Problem:** При вводе суммы можно ввести нереальные числа (000000001). Нужно ограничить нормальным поведением.

**Files:**
- Modify: `apps/mobile/app/blik/receive/amount.tsx`
- Modify: `apps/mobile/app/blik/request.tsx`
- Use: `apps/mobile/src/utils/format.ts` (sanitizeAmountInput already exists!)

**Step 1: Update BLIK receive amount screen**

In `apps/mobile/app/blik/receive/amount.tsx`, use sanitizeAmountInput:

```typescript
import { sanitizeAmountInput } from '@/src/utils/format';

const handleNumberPress = (num: string) => {
  const newInput = amount + num;
  const sanitized = sanitizeAmountInput(newInput, amount);
  if (sanitized === null) return;
  setAmount(sanitized);
};
```

**Step 2: Update BLIK request screen**

In `apps/mobile/app/blik/request.tsx`, apply same fix:

```typescript
import { sanitizeAmountInput } from '@/src/utils/format';

const handleNumberPress = (num: string) => {
  const newInput = amount + num;
  const sanitized = sanitizeAmountInput(newInput, amount);
  if (sanitized === null) return;
  setAmount(sanitized);
};
```

**Step 3: Also add minimum amount validation**

Add validation for minimum amount (e.g., 0.0001):
```typescript
const MIN_AMOUNT = 0.0001;

const canGenerate = amount && parseFloat(amount) >= MIN_AMOUNT && !isLoading;

// Show hint if amount is too small
{amount && parseFloat(amount) > 0 && parseFloat(amount) < MIN_AMOUNT && (
  <Text style={[styles.hintText, theme.typography.caption, { color: theme.colors.warning }]}>
    Minimum amount: {MIN_AMOUNT}
  </Text>
)}
```

**Step 4: Commit**
```bash
git add apps/mobile/app/blik/receive/amount.tsx
git add apps/mobile/app/blik/request.tsx
git commit -m "fix: validate amount input in BLIK screens with minimum amount"
```

---

## Task 8: Remove BLIK Tab from Receive Screen

**Priority:** LOW | **Complexity:** Easy

**Problem:** Убрать BLIK из Receive, оставить только для перехода из доп. меню (3 точки).

**Files:**
- Modify: `apps/mobile/app/receive/index.tsx`

**Step 1: Remove BLIK tab**

Remove BLIK from the Tab type:
```typescript
type Tab = 'address' | 'qr'; // Remove 'blik'
```

Remove BLIK tab button (lines 116-134):
```typescript
// DELETE this block:
<TouchableOpacity
  style={[styles.tab, activeTab === 'blik' && styles.tabActive]}
  onPress={() => setActiveTab('blik')}
>
  ...
</TouchableOpacity>
```

Remove BLIK tab content (lines 217-238):
```typescript
// DELETE this block:
{activeTab === 'blik' && (
  ...
)}
```

**Step 2: Verify BLIK is still accessible from actions menu**

Confirm `/blik` route exists in home.tsx actions menu (line 511) - it does.

**Step 3: Commit**
```bash
git add apps/mobile/app/receive/index.tsx
git commit -m "refactor: remove BLIK tab from Receive, keep in actions menu only"
```

---

## Task 9: Add Token Selection Before BLIK Code Generation

**Priority:** MEDIUM | **Complexity:** Medium

**Problem:** Перед генерацией BLIK кода нужно добавить шаг выбора токена.

**Note:** The current flow at `/blik/receive/` already has token selection as first step, and `/blik/request.tsx` has inline token selector. Need to verify if this is actually missing or if user didn't notice existing functionality.

**Files:**
- Investigate: `apps/mobile/app/blik/receive/_layout.tsx`
- Investigate: `apps/mobile/app/blik/receive/token.tsx`

**Step 1: Verify existing flow**

Check if `/blik/receive/token.tsx` exists and works:
```bash
ls -la apps/mobile/app/blik/receive/
```

If it exists, the flow is: token.tsx → amount.tsx → waiting.tsx

**Step 2: If missing, create token selection screen**

Create `apps/mobile/app/blik/receive/token.tsx` similar to `/send/token.tsx`.

**Step 3: Update blik/request.tsx to use full-screen token selector**

Instead of inline token chips, redirect to token selection screen first:
```typescript
// Remove inline token selector
// Navigate to: /blik/receive (which starts with token selection)
```

**Step 4: Commit**
```bash
git add apps/mobile/app/blik/
git commit -m "feat: ensure token selection step before BLIK code generation"
```

---

## Task 10: Network Preferences UI

**Priority:** HIGH | **Complexity:** High

**Problem:** Нету UI для абстракции сетей, где можно выбирать сети.

**Note:** This is a larger feature. Reference existing plan: `docs/plans/2026-01-20-network-preferences-design.md`

**Files:**
- Create: `apps/mobile/app/settings/networks.tsx`
- Create: `apps/mobile/src/components/NetworkSelector.tsx`
- Modify: Profile/settings flow

**Step 1: Read existing design document**

```bash
cat docs/plans/2026-01-20-network-preferences-design.md
```

**Step 2: Implement based on design**

This task is complex and should follow the existing design document.

**Step 3: Commit**
```bash
git add apps/mobile/app/settings/
git add apps/mobile/src/components/NetworkSelector.tsx
git commit -m "feat: add network preferences UI"
```

---

## Task 11: Unify Send Token Screens

**Priority:** MEDIUM | **Complexity:** High

**Problem:** Нужно унифицировать все экраны для отправки токенов (Send, Scheduled Payment).

**Files:**
- Analyze: `apps/mobile/app/send/` flow
- Analyze: `apps/mobile/app/scheduled/create/` flow
- Create: Shared components

**Step 1: Analyze differences**

Compare send flow vs scheduled flow:
- Both have: recipient, token, amount, confirm
- Scheduled adds: schedule step
- They should share: RecipientInput, TokenSelector, AmountInput, ConfirmCard

**Step 2: Create shared components**

Create in `apps/mobile/src/components/send/`:
- `RecipientInput.tsx`
- `TokenSelector.tsx`
- `AmountInput.tsx`
- `TransactionSummary.tsx`

**Step 3: Refactor screens to use shared components**

Update both flows to use shared components.

**Step 4: Commit**
```bash
git add apps/mobile/src/components/send/
git add apps/mobile/app/send/
git add apps/mobile/app/scheduled/
git commit -m "refactor: unify send token screens with shared components"
```

---

## Task 12: Show Pending Scheduled Payments in UI

**Priority:** MEDIUM | **Complexity:** Medium

**Problem:** Нужно добавить отображение отложенных платежей которые запланированы и в стадии ожидания.

**Files:**
- Modify: `apps/mobile/app/(tabs)/home.tsx`
- Modify: `apps/mobile/app/scheduled/index.tsx`

**Step 1: Add scheduled payments banner to home screen**

Similar to pending split banner, add scheduled payments section:

```typescript
// In home.tsx, after pendingBanner
{scheduled.payments.filter(p => new Date(p.scheduledAt) > new Date()).length > 0 && (
  <TouchableOpacity
    style={styles.scheduledBanner}
    onPress={() => router.push('/scheduled')}
  >
    <FontAwesome name="calendar" size={16} color={theme.colors.accent} />
    <Text style={styles.scheduledBannerText}>
      {scheduled.payments.filter(p => new Date(p.scheduledAt) > new Date()).length} scheduled payment{...}
    </Text>
    <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
  </TouchableOpacity>
)}
```

**Step 2: Add styles for scheduled banner**

```typescript
scheduledBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: theme.colors.accent + '15',
  borderRadius: theme.borderRadius.md,
  padding: theme.spacing.md,
  marginTop: theme.spacing.md,
  gap: theme.spacing.sm,
  borderWidth: 1,
  borderColor: theme.colors.accent + '30',
},
scheduledBannerText: {
  ...theme.typography.caption,
  color: theme.colors.accent,
  flex: 1,
},
```

**Step 3: Commit**
```bash
git add apps/mobile/app/\(tabs\)/home.tsx
git commit -m "feat: show pending scheduled payments on home screen"
```

---

## Task 13: Add Split Bill Spam Protection

**Priority:** HIGH | **Complexity:** Medium

**Problem:** Нужна защита от того, чтобы кто-угодно не мог отправить запрос на split bill.

**Proposed Solutions:**
1. Require mutual contacts (only people you've sent to before)
2. Add "Allow split requests from anyone" setting
3. Require approval before showing split request
4. Rate limiting on backend

**Files:**
- Modify: Backend split-bill controller (if accessible)
- Create: `apps/mobile/app/settings/privacy.tsx`
- Modify: Split bill notification handling

**Step 1: Add privacy setting**

Create setting: "Who can send me split requests"
Options:
- "Anyone" (default for now)
- "Contacts only"
- "No one"

**Step 2: Add setting to user preferences**

Store in AsyncStorage and sync with backend.

**Step 3: Filter incoming split requests based on setting**

In split slice, filter requests before displaying.

**Step 4: Commit**
```bash
git add apps/mobile/app/settings/
git add apps/mobile/src/store/slices/
git commit -m "feat: add split bill spam protection with privacy settings"
```

---

## Task 14: Fix AI WebSocket Errors

**Priority:** HIGH | **Complexity:** Medium

**Problem:** Ошибки при общении с AI ассистентом (CHAT_ERROR).

**Files:**
- Modify: `apps/mobile/src/services/ai-service.ts`
- Modify: `apps/mobile/src/hooks/useAiChat.ts`
- Investigate: Backend AI controller

**Step 1: Add better error handling and retry logic**

In `ai-service.ts`:

```typescript
// Add retry mechanism
private retryCount = 0;
private maxRetries = 3;

sendMessage(content: string): void {
  if (!this.socket?.connected) {
    // Try to reconnect before failing
    this.connect(this.userAddress || '')
      .then(() => this.sendMessageInternal(content))
      .catch(() => {
        this.callbacks.onError?.({
          code: 'NOT_CONNECTED',
          message: 'Unable to connect to AI server. Please try again.',
        });
      });
    return;
  }
  this.sendMessageInternal(content);
}

private sendMessageInternal(content: string): void {
  // existing sendMessage logic
}
```

**Step 2: Add connection health check**

```typescript
// Ping server periodically to check connection health
private startHealthCheck(): void {
  setInterval(() => {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }, 30000);
}
```

**Step 3: Add user-friendly error messages**

Map error codes to user-friendly messages in the UI.

**Step 4: Commit**
```bash
git add apps/mobile/src/services/ai-service.ts
git add apps/mobile/src/hooks/useAiChat.ts
git commit -m "fix: improve AI WebSocket error handling and retry logic"
```

---

## Task 15: Fix Custom Split Bill Amount Logic

**Priority:** MEDIUM | **Complexity:** Medium

**Problem:** При custom split можно ввести сумму для участника больше общего счёта.

**Proposed Fix:**
- If custom mode, skip total amount step
- OR validate that sum of custom amounts doesn't exceed total
- OR show remaining amount to distribute

**Files:**
- Modify: `apps/mobile/app/split/create/mode.tsx`
- Modify: `apps/mobile/app/split/create/participants.tsx`
- Modify: `apps/mobile/src/store/slices/split-create-slice.ts`

**Step 1: Add validation in participants screen**

When mode is 'custom', validate amounts:

```typescript
// Calculate total of custom amounts
const totalCustomAmount = participants.reduce(
  (sum, p) => sum + parseFloat(p.amount || '0'),
  0
);

// Show warning if exceeds total
{splitCreate.splitMode === 'custom' && totalCustomAmount > parseFloat(splitCreate.totalAmount) && (
  <View style={styles.warningBanner}>
    <Text style={styles.warningText}>
      Total custom amounts ({totalCustomAmount}) exceed the bill total ({splitCreate.totalAmount})
    </Text>
  </View>
)}

// Disable continue if invalid
const canContinue = splitCreate.splitMode !== 'custom' ||
  totalCustomAmount <= parseFloat(splitCreate.totalAmount);
```

**Step 2: Alternative: Skip total for custom mode**

Change flow so custom mode asks for individual amounts first, then calculates total.

**Step 3: Commit**
```bash
git add apps/mobile/app/split/create/
git add apps/mobile/src/store/slices/split-create-slice.ts
git commit -m "fix: validate custom split amounts don't exceed total"
```

---

## Implementation Order (Recommended)

### Phase 1: Quick Wins (Tasks 2, 3, 8)
Easy fixes that can be done quickly.

### Phase 2: Critical UX (Tasks 1, 7, 14)
High-priority bugs affecting core functionality.

### Phase 3: Enhancements (Tasks 4, 5, 6, 12)
UI improvements and new features.

### Phase 4: Complex Features (Tasks 9, 10, 11, 13, 15)
Larger refactors requiring more planning.

---

## Testing Checklist

For each bug fix:
- [ ] Reproduces original bug
- [ ] Fix resolves the issue
- [ ] No regression in related functionality
- [ ] Works on iOS simulator
- [ ] Works on Android emulator (if applicable)
