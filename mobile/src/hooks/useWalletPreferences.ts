import { useState, useEffect, useCallback } from 'react';
import {
  getWallets,
  getActiveWallets,
  updateWallet,
  getPrimaryChain,
  UserWallet,
} from '../services/api/identityService';
import { loginWithWallet } from '../services/authService';
import { useWallet } from '../context/WalletContext';

/**
 * Hook для управления wallet preferences (active networks, primary chain)
 */
export function useWalletPreferences() {
  const { activeAccount } = useWallet();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [activeWallets, setActiveWallets] = useState<UserWallet[]>([]);
  const [primaryChainId, setPrimaryChainId] = useState<string | null>(null);
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

      // Load all data in parallel for better performance
      const [allWallets, active, primary] = await Promise.all([
        getWallets(token),
        getActiveWallets(token),
        getPrimaryChain(token),
      ]);

      setWallets(allWallets);
      setActiveWallets(active);
      setPrimaryChainId(primary);
    } catch (err: any) {
      console.error('Failed to load wallet preferences:', err);
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [activeAccount?.address]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Toggle network active/inactive
   */
  const toggleNetwork = async (walletId: number, currentlyActive: boolean) => {
    try {
      if (!activeAccount?.address) throw new Error('No active account');

      const token = await loginWithWallet(activeAccount.address, 10000);
      if (!token) throw new Error('Not authenticated');

      await updateWallet(token, walletId, { isActive: !currentlyActive });
      await loadPreferences(); // Reload after update
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to toggle network');
    }
  };

  /**
   * Set wallet as primary
   */
  const setPrimary = async (walletId: number) => {
    try {
      if (!activeAccount?.address) throw new Error('No active account');

      const token = await loginWithWallet(activeAccount.address, 10000);
      if (!token) throw new Error('Not authenticated');

      await updateWallet(token, walletId, { isPrimary: true });
      await loadPreferences(); // Reload after update
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to set primary');
    }
  };

  return {
    wallets,
    activeWallets,
    primaryChainId,
    loading,
    error,
    reload: loadPreferences,
    toggleNetwork,
    setPrimary,
  };
}
