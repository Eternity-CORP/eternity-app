import * as SecureStore from 'expo-secure-store';

const DURESS_PIN_KEY = 'duress_pin';
const DURESS_CONFIG_KEY = 'duress_config';

export interface FakeTransaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  token: string;
  date: string;
  address: string;
}

export interface DuressConfig {
  fakeBalance: number;
  fakeTxHistory: FakeTransaction[];
  isEnabled: boolean;
}

/**
 * Generate realistic-looking fake transactions
 */
const generateFakeHistory = (): FakeTransaction[] => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'fake-1',
      type: 'receive',
      amount: '0.02',
      token: 'ETH',
      date: new Date(now - 2 * DAY).toISOString(),
      address: '0x742d...3f4a',
    },
    {
      id: 'fake-2',
      type: 'send',
      amount: '25',
      token: 'USDC',
      date: new Date(now - 5 * DAY).toISOString(),
      address: '0x8f3c...9b2e',
    },
    {
      id: 'fake-3',
      type: 'receive',
      amount: '50',
      token: 'USDC',
      date: new Date(now - 12 * DAY).toISOString(),
      address: '0x2a1b...7c8d',
    },
    {
      id: 'fake-4',
      type: 'send',
      amount: '0.01',
      token: 'ETH',
      date: new Date(now - 18 * DAY).toISOString(),
      address: '0x5e9d...2f1a',
    },
    {
      id: 'fake-5',
      type: 'receive',
      amount: '15',
      token: 'USDC',
      date: new Date(now - 25 * DAY).toISOString(),
      address: '0x3c7b...8e4f',
    },
  ];
};

export const duressService = {
  /**
   * Set the duress PIN
   */
  async setDuressPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(DURESS_PIN_KEY, pin);
    // Enable duress mode when PIN is set
    await this.setDuressConfig({ isEnabled: true });
  },

  /**
   * Remove the duress PIN
   */
  async removeDuressPin(): Promise<void> {
    await SecureStore.deleteItemAsync(DURESS_PIN_KEY);
    await this.setDuressConfig({ isEnabled: false });
  },

  /**
   * Verify if entered PIN matches duress PIN
   */
  async verifyDuressPin(pin: string): Promise<boolean> {
    const storedPin = await SecureStore.getItemAsync(DURESS_PIN_KEY);
    return storedPin !== null && storedPin === pin;
  },

  /**
   * Check if duress mode is enabled
   */
  async isDuressEnabled(): Promise<boolean> {
    const pin = await SecureStore.getItemAsync(DURESS_PIN_KEY);
    return pin !== null;
  },

  /**
   * Get duress configuration
   */
  async getDuressConfig(): Promise<DuressConfig> {
    try {
      const config = await SecureStore.getItemAsync(DURESS_CONFIG_KEY);
      if (config) {
        return JSON.parse(config);
      }
    } catch (error) {
      console.error('Failed to load duress config:', error);
    }

    return {
      fakeBalance: 150,
      fakeTxHistory: generateFakeHistory(),
      isEnabled: false,
    };
  },

  /**
   * Update duress configuration
   */
  async setDuressConfig(config: Partial<DuressConfig>): Promise<void> {
    const current = await this.getDuressConfig();
    const updated = { ...current, ...config };
    await SecureStore.setItemAsync(DURESS_CONFIG_KEY, JSON.stringify(updated));
  },

  /**
   * Set custom fake balance
   */
  async setFakeBalance(balance: number): Promise<void> {
    await this.setDuressConfig({ fakeBalance: balance });
  },

  /**
   * Regenerate fake transaction history
   */
  async regenerateFakeHistory(): Promise<void> {
    await this.setDuressConfig({ fakeTxHistory: generateFakeHistory() });
  },

  /**
   * Get fake token balances for duress mode
   */
  getFakeTokenBalances(totalBalance: number): Array<{ symbol: string; balance: string; usdValue: number }> {
    // Distribute balance across common tokens
    const ethBalance = (totalBalance * 0.4) / 2000; // Assume $2000/ETH
    const usdcBalance = totalBalance * 0.6;

    return [
      { symbol: 'ETH', balance: ethBalance.toFixed(4), usdValue: totalBalance * 0.4 },
      { symbol: 'USDC', balance: usdcBalance.toFixed(2), usdValue: totalBalance * 0.6 },
    ];
  },
};

export default duressService;
