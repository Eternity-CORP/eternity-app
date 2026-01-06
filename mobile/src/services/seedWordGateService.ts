import * as SecureStore from 'expo-secure-store';
import { STORAGE_SEED_KEY } from '../config/env';

const GATE_CONFIG_KEY = 'seed_word_gate_config';
const COOLDOWN_KEY = 'seed_word_gate_cooldown';
const FAILED_ATTEMPTS_KEY = 'seed_word_gate_attempts';

export interface GateConfig {
  enabled: boolean;
  threshold: number;
  requireForNewRecipient: boolean;
  requireForCrossChain: boolean;
}

export interface GateChallenge {
  wordIndices: number[];
  transactionId: string;
  createdAt: number;
}

export interface CooldownStatus {
  blocked: boolean;
  remainingSeconds: number;
}

const DEFAULT_CONFIG: GateConfig = {
  enabled: true,
  threshold: 500,
  requireForNewRecipient: true,
  requireForCrossChain: true,
};

export const seedWordGateService = {
  /**
   * Get gate configuration
   */
  async getConfig(): Promise<GateConfig> {
    try {
      const config = await SecureStore.getItemAsync(GATE_CONFIG_KEY);
      if (config) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(config) };
      }
    } catch (error) {
      console.error('Failed to load gate config:', error);
    }
    return DEFAULT_CONFIG;
  },

  /**
   * Update gate configuration
   */
  async setConfig(config: Partial<GateConfig>): Promise<void> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await SecureStore.setItemAsync(GATE_CONFIG_KEY, JSON.stringify(updated));
  },

  /**
   * Check if gate should trigger for transaction
   */
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

  /**
   * Generate a challenge with random word indices
   */
  generateChallenge(transactionId: string, phraseLength: number = 12): GateChallenge {
    const indices = new Set<number>();

    while (indices.size < 3) {
      const randomIndex = Math.floor(Math.random() * phraseLength) + 1;
      indices.add(randomIndex);
    }

    return {
      wordIndices: Array.from(indices).sort((a, b) => a - b),
      transactionId,
      createdAt: Date.now(),
    };
  },

  /**
   * Verify challenge with provided words
   */
  async verifyChallenge(
    challenge: GateChallenge,
    providedWords: string[]
  ): Promise<boolean> {
    try {
      const mnemonic = await SecureStore.getItemAsync(STORAGE_SEED_KEY);
      if (!mnemonic) {
        console.error('No mnemonic found');
        return false;
      }

      const words = mnemonic.split(' ');

      // Verify each word
      for (let i = 0; i < challenge.wordIndices.length; i++) {
        const index = challenge.wordIndices[i] - 1;
        const expectedWord = words[index]?.toLowerCase().trim();
        const providedWord = providedWords[i]?.toLowerCase().trim();

        if (expectedWord !== providedWord) {
          return false;
        }
      }

      // Clear failed attempts on success
      await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
      return true;
    } catch (error) {
      console.error('Challenge verification error:', error);
      return false;
    }
  },

  /**
   * Check if currently in cooldown
   */
  async checkCooldown(): Promise<CooldownStatus> {
    try {
      const cooldownData = await SecureStore.getItemAsync(COOLDOWN_KEY);
      if (!cooldownData) {
        return { blocked: false, remainingSeconds: 0 };
      }

      const { until } = JSON.parse(cooldownData);
      const remaining = Math.ceil((until - Date.now()) / 1000);

      if (remaining > 0) {
        return { blocked: true, remainingSeconds: remaining };
      }

      // Cooldown expired, clean up
      await SecureStore.deleteItemAsync(COOLDOWN_KEY);
      await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
      return { blocked: false, remainingSeconds: 0 };
    } catch (error) {
      console.error('Cooldown check error:', error);
      return { blocked: false, remainingSeconds: 0 };
    }
  },

  /**
   * Record failed attempt and trigger cooldown if needed
   */
  async recordFailedAttempt(): Promise<{ attemptsRemaining: number; cooldownTriggered: boolean }> {
    try {
      const attemptsData = await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY);
      let attempts = attemptsData ? parseInt(attemptsData, 10) : 0;
      attempts += 1;

      await SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, attempts.toString());

      if (attempts >= 3) {
        await this.triggerCooldown(300); // 5 minutes
        return { attemptsRemaining: 0, cooldownTriggered: true };
      }

      return { attemptsRemaining: 3 - attempts, cooldownTriggered: false };
    } catch (error) {
      console.error('Failed to record attempt:', error);
      return { attemptsRemaining: 2, cooldownTriggered: false };
    }
  },

  /**
   * Trigger cooldown period
   */
  async triggerCooldown(seconds: number = 300): Promise<void> {
    await SecureStore.setItemAsync(
      COOLDOWN_KEY,
      JSON.stringify({ until: Date.now() + seconds * 1000 })
    );
  },

  /**
   * Reset failed attempts (call after successful verification)
   */
  async resetAttempts(): Promise<void> {
    await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
    await SecureStore.deleteItemAsync(COOLDOWN_KEY);
  },

  /**
   * Get number of remaining attempts
   */
  async getRemainingAttempts(): Promise<number> {
    try {
      const attemptsData = await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY);
      const attempts = attemptsData ? parseInt(attemptsData, 10) : 0;
      return Math.max(0, 3 - attempts);
    } catch {
      return 3;
    }
  },
};

export default seedWordGateService;
