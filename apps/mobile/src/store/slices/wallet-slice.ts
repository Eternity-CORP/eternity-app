/**
 * Wallet Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction, type Dispatch } from '@reduxjs/toolkit';
import { generateWallet, saveWallet, importWallet, loadWallet, loadAccounts, createNewAccount, saveAccounts, saveCurrentAccountIndex, loadCurrentAccountIndex, type WalletData } from '@/src/services/wallet-service';
import { getAddressFromMnemonic } from '@e-y/crypto';
import { migrateAccountAddresses, createAccount, type AccountType, type WalletAccount } from '@e-y/shared';

export type { AccountType };

/** @deprecated Use WalletAccount from @e-y/shared */
export type Account = WalletAccount;

interface WalletState {
  mnemonic: string | null;
  accounts: Account[];
  currentAccountIndex: number; // Index in accounts array
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  isInitialized: boolean;
}

// Helper to get current account
export const getCurrentAccount = (state: WalletState): Account | null => {
  if (state.accounts.length === 0 || state.currentAccountIndex < 0 || state.currentAccountIndex >= state.accounts.length) {
    return null;
  }
  return state.accounts[state.currentAccountIndex];
};

const initialState: WalletState = {
  mnemonic: null,
  accounts: [],
  currentAccountIndex: 0,
  status: 'idle',
  error: null,
  isInitialized: false,
};

/**
 * Load wallet from storage
 */
export const loadWalletThunk = createAsyncThunk(
  'wallet/load',
  async () => {
    const walletData = await loadWallet();
    return walletData;
  }
);

/**
 * Generate new wallet (does NOT save to storage)
 * @param params.wordCount - Number of words: 12 or 24 (default: 12)
 * @param params.type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export const generateWalletThunk = createAsyncThunk(
  'wallet/generate',
  async (params: { wordCount?: 12 | 24; type?: AccountType } = {}) => {
    const { wordCount = 12, type = 'test' } = params;
    const walletData = await generateWallet(wordCount, type);
    return walletData;
  }
);

/**
 * Save wallet to storage (call after verification)
 * @param params.mnemonic - The mnemonic phrase to save
 * @param params.type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export const saveWalletThunk = createAsyncThunk(
  'wallet/save',
  async (params: { mnemonic: string; type?: AccountType }) => {
    const { mnemonic, type = 'test' } = params;
    const walletData = await saveWallet(mnemonic, type);
    return walletData;
  }
);

/**
 * Import wallet from mnemonic phrase
 */
export const importWalletThunk = createAsyncThunk(
  'wallet/import',
  async (mnemonic: string) => {
    const walletData = await importWallet(mnemonic);
    // Persist account index (side effect belongs in thunk, not reducer)
    await saveCurrentAccountIndex(0);
    return walletData;
  }
);

/**
 * Load accounts from storage (including persisted account index)
 */
export const loadAccountsThunk = createAsyncThunk(
  'wallet/loadAccounts',
  async (_, { getState }) => {
    const [accounts, savedIndex] = await Promise.all([
      loadAccounts(),
      loadCurrentAccountIndex(),
    ]);
    // Handle migration side effect here (in thunk) instead of in reducer
    const state = getState() as { wallet: WalletState };
    if (accounts.length > 0 && state.wallet.mnemonic) {
      const migration = migrateAccountAddresses(accounts, state.wallet.mnemonic, getAddressFromMnemonic);
      if (migration.needsSave) {
        await saveAccounts(migration.accounts);
      }
      return { accounts: migration.accounts, savedIndex, migrated: true };
    }
    return { accounts, savedIndex, migrated: false };
  }
);

/**
 * Add new account
 * @param type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export const addAccountThunk = createAsyncThunk(
  'wallet/addAccount',
  async (type: AccountType = 'test', { getState }) => {
    const state = getState() as { wallet: WalletState };
    if (!state.wallet.mnemonic) {
      throw new Error('No mnemonic available. Please create or import a wallet first.');
    }
    const newAccount = await createNewAccount(state.wallet.mnemonic, state.wallet.accounts, type);
    // Persist account index after adding (side effect belongs in thunk, not reducer)
    const newIndex = state.wallet.accounts.length; // will be the index of the new account
    await saveCurrentAccountIndex(newIndex);
    return newAccount;
  }
);

/**
 * Add a business-type account reusing the current account's address/index.
 * Business account ID format: biz-{businessId}
 */
export const addBusinessAccountThunk = createAsyncThunk(
  'wallet/addBusinessAccount',
  async (params: { businessId: string; label: string; treasuryAddress: string }, { getState }) => {
    const state = getState() as { wallet: WalletState };
    const accounts = state.wallet.accounts;

    // Skip if this business account already exists
    if (accounts.some((a) => a.businessId === params.businessId)) {
      return null;
    }

    const currentAccount = getCurrentAccount(state.wallet);
    if (!currentAccount) {
      throw new Error('No current account available');
    }

    const newAccount = createAccount({
      index: currentAccount.accountIndex,
      address: params.treasuryAddress, // Business wallet address = treasury address
      type: 'business',
      label: params.label,
      businessId: params.businessId,
    });

    const updatedAccounts = [...accounts, newAccount];
    await saveAccounts(updatedAccounts);

    // Switch to the new business account
    const newIndex = updatedAccounts.length - 1;
    await saveCurrentAccountIndex(newIndex);

    return newAccount;
  }
);

/**
 * Sync business accounts from API data.
 * Adds missing business accounts and removes stale ones.
 */
export const syncBusinessAccountsThunk = createAsyncThunk(
  'wallet/syncBusinessAccounts',
  async (businesses: { id: string; name: string; treasuryAddress: string }[], { getState }) => {
    const state = getState() as { wallet: WalletState };
    const accounts = state.wallet.accounts;
    const existingBizIds = new Set(
      accounts.filter((a) => a.type === 'business').map((a) => a.businessId)
    );
    const apiBizIds = new Set(businesses.map((b) => b.id));

    let updated = [...accounts];
    let changed = false;

    // Find a non-business account to derive accountIndex from
    const baseAccount = accounts.find((a) => a.type !== 'business') || accounts[0];
    if (!baseAccount) return { accounts: updated, changed: false };

    // Add missing businesses
    for (const biz of businesses) {
      if (!existingBizIds.has(biz.id)) {
        updated.push(createAccount({
          index: baseAccount.accountIndex,
          address: biz.treasuryAddress, // Business wallet address = treasury address
          type: 'business',
          label: biz.name,
          businessId: biz.id,
        }));
        changed = true;
      }
    }

    // Remove stale business accounts (no longer in API)
    const beforeLen = updated.length;
    updated = updated.filter(
      (a) => a.type !== 'business' || (a.businessId && apiBizIds.has(a.businessId))
    );
    if (updated.length !== beforeLen) changed = true;

    if (changed) {
      await saveAccounts(updated);
    }

    return { accounts: updated, changed };
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWallet: (state, action: PayloadAction<WalletData & { type?: AccountType }>) => {
      // Legacy support: convert single wallet to account
      if (state.accounts.length === 0) {
        state.accounts.push({
          id: '0',
          address: action.payload.address,
          accountIndex: 0,
          type: action.payload.type || 'test',
        });
        state.currentAccountIndex = 0;
      }
      state.mnemonic = action.payload.mnemonic;
      state.status = 'succeeded';
      state.isInitialized = true;
    },
    addAccount: (state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload);
      // Switch to the new account
      state.currentAccountIndex = state.accounts.length - 1;
    },
    /** Pure reducer for switching accounts (use switchAccountThunk for persistence) */
    _switchAccount: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.accounts.length) {
        state.currentAccountIndex = index;
      }
    },
    updateAccountLabel: (state, action: PayloadAction<{ accountIndex: number; label: string | undefined }>) => {
      const account = state.accounts.find((acc) => acc.accountIndex === action.payload.accountIndex);
      if (account) {
        account.label = action.payload.label;
      }
    },
    /** Pure reducer for reordering accounts (use reorderAccountsThunk for persistence) */
    _reorderAccounts: (state, action: PayloadAction<{ accounts: Account[]; newIndex: number }>) => {
      state.accounts = action.payload.accounts;
      if (action.payload.newIndex !== -1) {
        state.currentAccountIndex = action.payload.newIndex;
      }
    },
    clearWallet: (state) => {
      state.mnemonic = null;
      state.accounts = [];
      state.currentAccountIndex = 0;
      state.status = 'idle';
      state.isInitialized = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load wallet
      .addCase(loadWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadWalletThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.mnemonic = action.payload.mnemonic;
          // Create temporary default account (will be replaced by loadAccountsThunk)
          // This ensures UI has something to display while accounts load
          // Default to 'test' for migration, loadAccountsThunk will provide actual type
          if (state.accounts.length === 0) {
            state.accounts.push({
              id: '0',
              address: action.payload.address,
              accountIndex: 0,
              type: 'test',
            });
            state.currentAccountIndex = 0;
          }
          state.status = 'succeeded';
          state.isInitialized = true;
        } else {
          state.status = 'idle';
          state.isInitialized = false;
        }
      })
      // Load accounts
      .addCase(loadAccountsThunk.fulfilled, (state, action) => {
        const { accounts, savedIndex } = action.payload;
        // Replace temporary accounts with loaded ones
        // Migration (re-derive addresses) is already handled in the thunk
        if (accounts.length > 0) {
          state.accounts = accounts;
          // Restore persisted account index (with bounds check)
          state.currentAccountIndex = savedIndex < accounts.length ? savedIndex : 0;
        } else if (state.accounts.length === 0 && state.mnemonic) {
          // If no accounts stored but wallet exists, create default account
          // This handles migration from old wallet format
          // Default to 'test' for backwards compatibility
          state.accounts.push({
            id: '0',
            address: getAddressFromMnemonic(state.mnemonic, 0),
            accountIndex: 0,
            type: 'test',
          });
          state.currentAccountIndex = 0;
        }
      })
      // Add account
      .addCase(addAccountThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addAccountThunk.fulfilled, (state, action) => {
        state.accounts.push(action.payload);
        state.currentAccountIndex = state.accounts.length - 1;
        state.status = 'succeeded';
        // Persistence is handled in the thunk body (side effects do not belong in reducers)
      })
      .addCase(addAccountThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to add account';
      })
      .addCase(loadWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load wallet';
      })
      // Generate wallet
      .addCase(generateWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(generateWalletThunk.fulfilled, (state, action) => {
        // Store mnemonic temporarily (not saved to storage yet)
        state.mnemonic = action.payload.mnemonic;
        // Create temporary account for display
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
            type: action.payload.type,
          });
          state.currentAccountIndex = 0;
        }
        state.status = 'succeeded';
        // Don't set isInitialized = true until saved
      })
      .addCase(generateWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to generate wallet';
      })
      // Save wallet
      .addCase(saveWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveWalletThunk.fulfilled, (state, action) => {
        state.mnemonic = action.payload.mnemonic;
        // Ensure default account exists
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
            type: action.payload.type,
          });
          state.currentAccountIndex = 0;
        } else {
          // Update first account address and type if it changed
          state.accounts[0].address = action.payload.address;
          state.accounts[0].type = action.payload.type;
        }
        state.status = 'succeeded';
        state.isInitialized = true;
      })
      .addCase(saveWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to save wallet';
      })
      // Import wallet
      .addCase(importWalletThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(importWalletThunk.fulfilled, (state, action) => {
        state.mnemonic = action.payload.mnemonic;
        // Ensure default account exists
        // Imported wallets are always 'real' accounts
        if (state.accounts.length === 0) {
          state.accounts.push({
            id: '0',
            address: action.payload.address,
            accountIndex: 0,
            type: 'real',
          });
          state.currentAccountIndex = 0;
        } else {
          // Update first account address and set to 'real' type
          state.accounts[0].address = action.payload.address;
          state.accounts[0].type = 'real';
          state.currentAccountIndex = 0;
        }
        state.status = 'succeeded';
        state.isInitialized = true;
        // Persistence is handled in the thunk body (side effects do not belong in reducers)
      })
      .addCase(importWalletThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to import wallet';
      })
      // Add business account
      .addCase(addBusinessAccountThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.accounts.push(action.payload);
          state.currentAccountIndex = state.accounts.length - 1;
        }
      })
      .addCase(addBusinessAccountThunk.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to add business account';
      })
      // Sync business accounts
      .addCase(syncBusinessAccountsThunk.fulfilled, (state, action) => {
        if (action.payload.changed) {
          state.accounts = action.payload.accounts;
          // Bounds-check the current index after potential removals
          if (state.currentAccountIndex >= state.accounts.length) {
            state.currentAccountIndex = Math.max(0, state.accounts.length - 1);
          }
        }
      });
  },
});

export const { addAccount, updateAccountLabel, clearWallet } = walletSlice.actions;

// Internal pure reducers used by thunks below
const { _switchAccount, _reorderAccounts } = walletSlice.actions;

/** The raw action creator for switchAccount — use in extraReducers addCase() listeners */
export const switchAccountAction = _switchAccount;

/**
 * Switch account and persist the index to storage.
 * Side effects (saveCurrentAccountIndex) are kept out of reducers.
 */
export const switchAccount = (index: number) =>
  (dispatch: Dispatch, getState: () => { wallet: WalletState }) => {
    const state = getState();
    if (index >= 0 && index < state.wallet.accounts.length) {
      dispatch(_switchAccount(index));
      saveCurrentAccountIndex(index);
    }
  };

/**
 * Reorder accounts and persist the new index to storage.
 * Side effects (saveCurrentAccountIndex) are kept out of reducers.
 */
export const reorderAccounts = (newAccounts: Account[]) =>
  (dispatch: Dispatch, getState: () => { wallet: WalletState }) => {
    const state = getState();
    const currentAddress = state.wallet.accounts[state.wallet.currentAccountIndex]?.address;
    const newIndex = newAccounts.findIndex((acc) => acc.address === currentAddress);
    dispatch(_reorderAccounts({ accounts: newAccounts, newIndex }));
    if (newIndex !== -1) {
      saveCurrentAccountIndex(newIndex);
    }
  };

// Selectors
type RootState = { wallet: WalletState };

/**
 * Select the type of the current account
 * @returns AccountType ('test' or 'real') or null if no current account
 */
export const selectCurrentAccountType = (state: RootState): AccountType | null => {
  const currentAccount = getCurrentAccount(state.wallet);
  return currentAccount?.type ?? null;
};

/**
 * Check if the current account is a test account
 * @returns true if current account is 'test' type, false otherwise
 */
export const selectIsTestAccount = (state: RootState): boolean => {
  const accountType = selectCurrentAccountType(state);
  return accountType === 'test';
};

export default walletSlice.reducer;
