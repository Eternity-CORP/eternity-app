import { useState, useEffect, useCallback } from 'react';
import {
  getTokenPreferences,
  setTokenPreference,
  deleteTokenPreference,
  TokenPreference,
} from '../services/api/identityService';
import { loginWithWallet } from '../services/authService';
import { useWallet } from '../context/WalletContext';

/**
 * Hook для управления token chain preferences
 */
export function useTokenChainPreferences() {
  const { activeAccount } = useWallet();
  const [preferences, setPreferences] = useState<TokenPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!activeAccount?.address) {
        throw new Error('No active account');
      }

      const token = await loginWithWallet(activeAccount.address, 10000);
      if (!token) {
        throw new Error('Not authenticated');
      }

      const prefs = await getTokenPreferences(token);
      setPreferences(prefs);
    } catch (err: any) {
      console.error('Failed to load token preferences:', err);
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [activeAccount?.address]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Set preference for a token
   */
  const setPreference = async (tokenSymbol: string, chainId: string) => {
    try {
      if (!activeAccount?.address) throw new Error('No active account');

      const token = await loginWithWallet(activeAccount.address, 10000);
      if (!token) throw new Error('Not authenticated');

      await setTokenPreference(token, tokenSymbol, chainId);
      await loadPreferences(); // Reload after update
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to set preference');
    }
  };

  /**
   * Remove preference for a token
   */
  const removePreference = async (preferenceId: number) => {
    try {
      if (!activeAccount?.address) throw new Error('No active account');

      const token = await loginWithWallet(activeAccount.address, 10000);
      if (!token) throw new Error('Not authenticated');

      await deleteTokenPreference(token, preferenceId);
      await loadPreferences(); // Reload after deletion
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to remove preference');
    }
  };

  /**
   * Get preferred chain for a specific token
   */
  const getPreferenceForToken = (tokenSymbol: string): string | null => {
    const pref = preferences.find(
      (p) => p.tokenSymbol.toUpperCase() === tokenSymbol.toUpperCase()
    );
    return pref ? pref.preferredChainId : null;
  };

  return {
    preferences,
    loading,
    error,
    reload: loadPreferences,
    setPreference,
    removePreference,
    getPreferenceForToken,
  };
}
