# Story S-24: Duress PIN

**Story ID:** S-24
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P1
**Estimate:** 8 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user under physical threat
**I want** to enter a special PIN that shows a fake wallet
**So that** I can protect my real assets if forced to unlock my phone

---

## Acceptance Criteria

- [ ] User can set a "Duress PIN" different from normal PIN
- [ ] Entering Duress PIN shows fake wallet with small balance
- [ ] Fake wallet has realistic-looking transaction history
- [ ] No visual indication that it's a fake wallet
- [ ] Real wallet remains hidden until correct PIN entered
- [ ] Duress PIN triggers silent alert (optional future: to trusted contact)
- [ ] Works with biometric fallback (enter duress PIN when biometric fails)

---

## Design Specifications

### Setup Flow

```
Settings > Security > Duress PIN

┌─────────────────────────────────────┐
│ 🛡️ Duress PIN                       │
│                                     │
│ Set a secondary PIN that opens a    │
│ decoy wallet with fake balance.     │
│ Use this if forced to unlock.       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Set Duress PIN: [ • • • • ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Fake Balance: $150.00               │
│ [Edit fake balance]                 │
│                                     │
│ ⚠️ The duress wallet looks real.    │
│    There's no way to tell it apart. │
└─────────────────────────────────────┘
```

### Normal vs Duress Wallet

```
NORMAL WALLET (Real PIN)        DURESS WALLET (Duress PIN)
┌─────────────────┐             ┌─────────────────┐
│ Total: $12,450  │             │ Total: $150.00  │
│                 │             │                 │
│ ETH   3.5       │             │ ETH   0.05      │
│ USDC  1,200     │             │ USDC  100       │
│                 │             │                 │
│ [Real History]  │             │ [Fake History]  │
└─────────────────┘             └─────────────────┘
```

### Fake Transaction History

Pre-generated realistic transactions:
- Small amounts ($5-$50)
- Common tokens (ETH, USDC)
- Dated within last 30 days
- Mix of sends/receives

---

## Technical Implementation

### Duress PIN Service

```typescript
// mobile/src/services/duressService.ts

import * as SecureStore from 'expo-secure-store';

const DURESS_PIN_KEY = 'duress_pin';
const DURESS_CONFIG_KEY = 'duress_config';

interface DuressConfig {
  fakeBalance: number;
  fakeTxHistory: FakeTransaction[];
  isEnabled: boolean;
}

interface FakeTransaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  token: string;
  date: string;
  address: string;
}

export const duressService = {
  async setDuressPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(DURESS_PIN_KEY, pin);
  },

  async verifyDuressPin(pin: string): Promise<boolean> {
    const storedPin = await SecureStore.getItemAsync(DURESS_PIN_KEY);
    return storedPin === pin;
  },

  async isDuressEnabled(): Promise<boolean> {
    const pin = await SecureStore.getItemAsync(DURESS_PIN_KEY);
    return pin !== null;
  },

  async getDuressConfig(): Promise<DuressConfig> {
    const config = await SecureStore.getItemAsync(DURESS_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    return {
      fakeBalance: 150,
      fakeTxHistory: generateFakeHistory(),
      isEnabled: false,
    };
  },

  async setDuressConfig(config: Partial<DuressConfig>): Promise<void> {
    const current = await this.getDuressConfig();
    const updated = { ...current, ...config };
    await SecureStore.setItemAsync(DURESS_CONFIG_KEY, JSON.stringify(updated));
  },
};

// Generate realistic-looking fake transactions
function generateFakeHistory(): FakeTransaction[] {
  const now = Date.now();
  return [
    {
      id: 'fake-1',
      type: 'receive',
      amount: '0.02',
      token: 'ETH',
      date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      address: '0x742d...3f4a',
    },
    {
      id: 'fake-2',
      type: 'send',
      amount: '25',
      token: 'USDC',
      date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      address: '0x8f3c...9b2e',
    },
    {
      id: 'fake-3',
      type: 'receive',
      amount: '50',
      token: 'USDC',
      date: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
      address: '0x2a1b...7c8d',
    },
  ];
}
```

### Auth Context Update

```typescript
// mobile/src/contexts/AuthContext.tsx (modification)

interface AuthState {
  isAuthenticated: boolean;
  isDuressMode: boolean;  // NEW
}

const verifyPin = async (enteredPin: string): Promise<boolean> => {
  // Check duress PIN first
  const isDuress = await duressService.verifyDuressPin(enteredPin);
  if (isDuress) {
    setAuthState({ isAuthenticated: true, isDuressMode: true });
    // Optional: trigger silent alert
    await triggerDuressAlert();
    return true;
  }

  // Check normal PIN
  const isValid = await pinService.verifyPin(enteredPin);
  if (isValid) {
    setAuthState({ isAuthenticated: true, isDuressMode: false });
    return true;
  }

  return false;
};
```

### Fake Wallet Provider

```typescript
// mobile/src/contexts/FakeWalletContext.tsx

export const FakeWalletProvider: React.FC = ({ children }) => {
  const { isDuressMode } = useAuth();
  const [fakeData, setFakeData] = useState<DuressConfig | null>(null);

  useEffect(() => {
    if (isDuressMode) {
      duressService.getDuressConfig().then(setFakeData);
    }
  }, [isDuressMode]);

  // Override balance/history hooks when in duress mode
  const contextValue = {
    isDuressMode,
    fakeBalance: fakeData?.fakeBalance,
    fakeHistory: fakeData?.fakeTxHistory,
  };

  return (
    <FakeWalletContext.Provider value={contextValue}>
      {children}
    </FakeWalletContext.Provider>
  );
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/services/duressService.ts` | CREATE | Duress PIN logic |
| `mobile/src/contexts/FakeWalletContext.tsx` | CREATE | Fake wallet data |
| `mobile/src/screens/DuressSetupScreen.tsx` | CREATE | Setup screen |
| `mobile/src/contexts/AuthContext.tsx` | MODIFY | Add duress mode |
| `mobile/src/screens/SecuritySettingsScreen.tsx` | MODIFY | Add duress option |
| `mobile/src/hooks/useBalance.ts` | MODIFY | Return fake when duress |
| `mobile/src/hooks/useTransactionHistory.ts` | MODIFY | Return fake when duress |

---

## Security Considerations

1. **No Visual Difference**: The fake wallet MUST look identical to real wallet
2. **Secure Storage**: Duress PIN stored with same security as real PIN
3. **No Logging**: Never log when duress mode is activated
4. **Transaction Blocking**: In duress mode, transactions fail silently with realistic error
5. **Reset Protection**: Cannot reset duress PIN without authenticating with real PIN first

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Enter real PIN | Real wallet opens, isDuressMode = false |
| 2 | Enter duress PIN | Fake wallet opens, isDuressMode = true |
| 3 | View balance in duress | Shows fake balance |
| 4 | View history in duress | Shows fake history |
| 5 | Try to send in duress | Transaction fails with generic error |
| 6 | No visual indicator | UI looks identical in both modes |

---

## Definition of Done

- [ ] Duress PIN can be set separately from normal PIN
- [ ] Entering duress PIN shows fake wallet
- [ ] Fake wallet has realistic balance and history
- [ ] No visual difference between real and fake
- [ ] Transactions blocked in duress mode
- [ ] State never leaks to logs or analytics
- [ ] Unit tests pass
