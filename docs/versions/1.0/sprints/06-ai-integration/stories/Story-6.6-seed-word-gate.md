# Story S-25: Seed Word Gate

**Story ID:** S-25
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P0
**Estimate:** 6 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** extra security for large or suspicious transactions
**So that** even if someone has my phone unlocked, they can't drain my wallet

---

## Acceptance Criteria

- [ ] Triggers for: amount >$500 OR new recipient address
- [ ] Requires entering 3 random words from seed phrase
- [ ] Words are randomly selected each time
- [ ] Clear UI showing which words to enter (e.g., "Enter word #3, #8, #11")
- [ ] Failed attempts: 3 max, then cooldown
- [ ] User can configure threshold amount in settings
- [ ] Can be disabled entirely (not recommended)

---

## Design Specifications

### Trigger Conditions

| Condition | Default | Configurable |
|-----------|---------|--------------|
| Amount > threshold | $500 | Yes |
| New recipient | Always | No |
| First-time token | Always | No |
| Cross-chain transfer | Always | No |

### Seed Word Entry UI

```
┌─────────────────────────────────────┐
│ 🔐 Additional Verification          │
│                                     │
│ This transaction requires extra     │
│ security. Please enter 3 words      │
│ from your recovery phrase.          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Word #3:  [ _____________ ]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Word #8:  [ _____________ ]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Word #11: [ _____________ ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Attempts remaining: 3               │
│                                     │
│ [Cancel]              [Verify]      │
└─────────────────────────────────────┘
```

### Settings UI

```
Security > Seed Word Gate

┌─────────────────────────────────────┐
│ 🌱 Seed Word Gate                   │
│                                     │
│ Require seed words for:             │
│                                     │
│ [x] Large transactions              │
│     Threshold: [$500 ▼]             │
│                                     │
│ [x] New recipients                  │
│     (first-time addresses)          │
│                                     │
│ [x] Cross-chain transfers           │
│                                     │
│ [ ] Disable seed word gate          │
│     ⚠️ Not recommended              │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### Seed Word Gate Service

```typescript
// mobile/src/services/seedWordGateService.ts

import * as SecureStore from 'expo-secure-store';

const GATE_CONFIG_KEY = 'seed_word_gate_config';
const COOLDOWN_KEY = 'seed_word_gate_cooldown';

interface GateConfig {
  enabled: boolean;
  threshold: number;  // USD
  requireForNewRecipient: boolean;
  requireForCrossChain: boolean;
}

interface GateChallenge {
  wordIndices: number[];  // e.g., [3, 8, 11]
  transactionId: string;
}

export const seedWordGateService = {
  async getConfig(): Promise<GateConfig> {
    const config = await SecureStore.getItemAsync(GATE_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    return {
      enabled: true,
      threshold: 500,
      requireForNewRecipient: true,
      requireForCrossChain: true,
    };
  },

  async setConfig(config: Partial<GateConfig>): Promise<void> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await SecureStore.setItemAsync(GATE_CONFIG_KEY, JSON.stringify(updated));
  },

  shouldTriggerGate(
    config: GateConfig,
    amountUsd: number,
    isNewRecipient: boolean,
    isCrossChain: boolean
  ): boolean {
    if (!config.enabled) return false;

    if (amountUsd >= config.threshold) return true;
    if (isNewRecipient && config.requireForNewRecipient) return true;
    if (isCrossChain && config.requireForCrossChain) return true;

    return false;
  },

  generateChallenge(transactionId: string): GateChallenge {
    // Generate 3 random word indices (1-12 or 1-24)
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 12) + 1);  // 1-12 for 12-word phrase
    }

    return {
      wordIndices: Array.from(indices).sort((a, b) => a - b),
      transactionId,
    };
  },

  async verifyChallenge(
    challenge: GateChallenge,
    providedWords: string[]
  ): Promise<boolean> {
    // Get actual seed phrase
    const mnemonic = await SecureStore.getItemAsync('wallet_mnemonic');
    if (!mnemonic) return false;

    const words = mnemonic.split(' ');

    // Verify each word
    for (let i = 0; i < challenge.wordIndices.length; i++) {
      const index = challenge.wordIndices[i] - 1;  // Convert to 0-indexed
      if (words[index].toLowerCase() !== providedWords[i].toLowerCase()) {
        return false;
      }
    }

    return true;
  },

  async checkCooldown(): Promise<{ blocked: boolean; remainingSeconds: number }> {
    const cooldownData = await SecureStore.getItemAsync(COOLDOWN_KEY);
    if (!cooldownData) {
      return { blocked: false, remainingSeconds: 0 };
    }

    const { until } = JSON.parse(cooldownData);
    const remaining = Math.ceil((until - Date.now()) / 1000);

    if (remaining > 0) {
      return { blocked: true, remainingSeconds: remaining };
    }

    await SecureStore.deleteItemAsync(COOLDOWN_KEY);
    return { blocked: false, remainingSeconds: 0 };
  },

  async triggerCooldown(seconds: number = 300): Promise<void> {
    await SecureStore.setItemAsync(COOLDOWN_KEY, JSON.stringify({
      until: Date.now() + seconds * 1000,
    }));
  },
};
```

### Seed Word Gate Screen

```typescript
// mobile/src/screens/SeedWordGateScreen.tsx

interface SeedWordGateScreenProps {
  challenge: GateChallenge;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SeedWordGateScreen: React.FC<SeedWordGateScreenProps> = ({
  challenge,
  onSuccess,
  onCancel,
}) => {
  const [words, setWords] = useState<string[]>(['', '', '']);
  const [attempts, setAttempts] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    const isValid = await seedWordGateService.verifyChallenge(challenge, words);

    if (isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } else {
      const remaining = attempts - 1;
      setAttempts(remaining);

      if (remaining <= 0) {
        await seedWordGateService.triggerCooldown(300);  // 5 min cooldown
        setError('Too many attempts. Try again in 5 minutes.');
      } else {
        setError(`Incorrect words. ${remaining} attempts remaining.`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Additional Verification</Text>
      <Text style={styles.subtitle}>
        Enter 3 words from your recovery phrase
      </Text>

      {challenge.wordIndices.map((wordNum, i) => (
        <View key={wordNum} style={styles.inputContainer}>
          <Text style={styles.label}>Word #{wordNum}:</Text>
          <TextInput
            style={styles.input}
            value={words[i]}
            onChangeText={(text) => {
              const newWords = [...words];
              newWords[i] = text;
              setWords(newWords);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.attempts}>Attempts remaining: {attempts}</Text>

      <View style={styles.buttons}>
        <Button title="Cancel" onPress={onCancel} variant="secondary" />
        <Button title="Verify" onPress={handleVerify} variant="primary" />
      </View>
    </SafeAreaView>
  );
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/services/seedWordGateService.ts` | CREATE | Gate logic |
| `mobile/src/screens/SeedWordGateScreen.tsx` | CREATE | Verification UI |
| `mobile/src/screens/SeedWordGateSettingsScreen.tsx` | CREATE | Settings UI |
| `mobile/src/hooks/useTransactionGuard.ts` | CREATE | Hook to check gate |
| `mobile/src/screens/SecuritySettingsScreen.tsx` | MODIFY | Add gate settings link |
| `mobile/src/services/transactionService.ts` | MODIFY | Integrate gate check |

---

## Security Considerations

1. **Word Storage**: Never log or transmit the provided words
2. **Rate Limiting**: 3 attempts max, then 5-minute cooldown
3. **Random Selection**: Words must be truly random each time
4. **Secure Input**: Use secureTextEntry, no autocomplete
5. **Clear After Use**: Clear word inputs from memory after verification

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Send $600 to known address | Gate triggers |
| 2 | Send $100 to known address | Gate does NOT trigger |
| 3 | Send $100 to NEW address | Gate triggers |
| 4 | Enter correct 3 words | Transaction proceeds |
| 5 | Enter wrong words 3 times | 5-min cooldown |
| 6 | Disable gate in settings | Gate no longer triggers |

---

## Definition of Done

- [ ] Gate triggers for configured conditions
- [ ] 3 random words required
- [ ] Verification works correctly
- [ ] Rate limiting after 3 failed attempts
- [ ] Settings screen for configuration
- [ ] Integrates with transaction flow
- [ ] Unit tests pass
