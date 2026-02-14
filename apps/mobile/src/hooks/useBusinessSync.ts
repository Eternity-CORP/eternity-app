/**
 * Business Sync Hook
 * Syncs business accounts from the API on startup.
 * Ensures co-founders see business wallets in their account selector.
 * Run this once in a top-level layout component (e.g., root _layout.tsx).
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { syncBusinessAccountsThunk } from '@/src/store/slices/wallet-slice';
import { fetchUserBusinessesThunk } from '@/src/store/slices/business-slice';

export function useBusinessSync() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!wallet.isInitialized || !currentAccount?.address || hasSynced.current) return;
    hasSynced.current = true;

    const address = currentAccount.address;

    dispatch(fetchUserBusinessesThunk(address))
      .unwrap()
      .then((businesses) => {
        dispatch(syncBusinessAccountsThunk(businesses.map((b) => ({
          id: b.id,
          name: b.name,
          treasuryAddress: b.treasuryAddress,
        }))));
      })
      .catch((err: unknown) => {
        console.error('Failed to sync business accounts:', err);
      });
  }, [wallet.isInitialized, currentAccount?.address, dispatch]);
}
