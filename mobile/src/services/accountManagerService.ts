/**
 * Account Manager Service
 *
 * User-friendly wrapper for multi-account management.
 *
 * Features:
 * - Create new HD-derived accounts
 * - Rename accounts with validation
 * - Safe deletion from UI (funds remain on-chain)
 * - Account switching with instant response
 * - Active account indicators
 * - Confirmation/warning utilities
 *
 * Important:
 * - Deleting an account only removes it from the UI
 * - Funds remain accessible on the blockchain
 * - Accounts can be re-derived from the same seed phrase
 */

import {
  createNewAccount as createNewAccountWallet,
  getAllAccounts as getAllAccountsWallet,
  getActiveAccount as getActiveAccountWallet,
  switchAccount as switchAccountWallet,
  renameAccount as renameAccountWallet,
  deleteAccount as deleteAccountWallet,
  deriveAccount,
  type AccountInfo,
} from './walletService';
import { getWalletMeta } from './cryptoService';
import { isAccountPending } from './state/transactionState';

// Types
export interface AccountWithStatus extends AccountInfo {
  isActive: boolean;
  hasPendingTransactions: boolean;
  canDelete: boolean;
  deletionWarnings: string[];
}

export interface AccountCreationResult {
  success: boolean;
  account?: AccountInfo;
  error?: string;
}

export interface AccountRenameResult {
  success: boolean;
  error?: string;
}

export interface AccountDeletionCheck {
  canDelete: boolean;
  warnings: string[];
  errors: string[];
}

export interface AccountDeletionResult {
  success: boolean;
  error?: string;
  deletedAccount?: AccountInfo;
  newActiveAccount?: AccountInfo;
}

export interface AccountSwitchResult {
  success: boolean;
  error?: string;
  previousAccount?: AccountInfo;
  newAccount?: AccountInfo;
}

export interface AccountStats {
  totalAccounts: number;
  activeAccountIndex: number;
  accountsWithPendingTx: number;
  canCreateMore: boolean;
  canDeleteAny: boolean;
}

// Constants
const MAX_ACCOUNTS = 100; // Safety limit
const DEFAULT_ACCOUNT_NAME_PREFIX = 'Account';

/**
 * Get all accounts with extended status information
 */
export async function getAllAccountsWithStatus(): Promise<AccountWithStatus[]> {
  const accounts = await getAllAccountsWallet();
  const activeAccount = await getActiveAccountWallet();
  const meta = await getWalletMeta();

  return accounts.map((account) => {
    const isActive = account.index === activeAccount?.index;
    const hasPendingTransactions = isAccountPending(account.index);
    const canDelete = accounts.length > 1 && !hasPendingTransactions;

    const deletionWarnings: string[] = [];
    if (accounts.length === 1) {
      deletionWarnings.push('This is your last account. Cannot delete.');
    }
    if (hasPendingTransactions) {
      deletionWarnings.push('This account has pending transactions. Cannot delete.');
    }
    if (isActive && accounts.length > 1) {
      deletionWarnings.push('This is your active account. Will switch to another account upon deletion.');
    }

    return {
      ...account,
      isActive,
      hasPendingTransactions,
      canDelete,
      deletionWarnings,
    };
  });
}

/**
 * Get account statistics
 */
export async function getAccountStats(): Promise<AccountStats> {
  const accounts = await getAllAccountsWallet();
  const activeAccount = await getActiveAccountWallet();

  let accountsWithPendingTx = 0;
  for (const account of accounts) {
    if (isAccountPending(account.index)) {
      accountsWithPendingTx++;
    }
  }

  const canCreateMore = accounts.length < MAX_ACCOUNTS;
  const canDeleteAny = accounts.length > 1 && accountsWithPendingTx < accounts.length;

  return {
    totalAccounts: accounts.length,
    activeAccountIndex: activeAccount?.index ?? 0,
    accountsWithPendingTx,
    canCreateMore,
    canDeleteAny,
  };
}

/**
 * Create a new HD-derived account
 */
export async function createAccount(customName?: string): Promise<AccountCreationResult> {
  try {
    // Check if we can create more accounts
    const accounts = await getAllAccountsWallet();
    if (accounts.length >= MAX_ACCOUNTS) {
      return {
        success: false,
        error: `Cannot create more than ${MAX_ACCOUNTS} accounts`,
      };
    }

    // Create the account
    const newAccount = await createNewAccountWallet();

    // Rename if custom name provided
    if (customName) {
      const trimmed = customName.trim();
      if (trimmed) {
        try {
          await renameAccountWallet(newAccount.index, trimmed);
          newAccount.name = trimmed;
        } catch (renameError: any) {
          // Account created but rename failed - still return success
          console.warn('Account created but rename failed:', renameError.message);
        }
      }
    }

    return {
      success: true,
      account: newAccount,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create account',
    };
  }
}

/**
 * Rename an account with validation
 */
export async function renameAccount(index: number, newName: string): Promise<AccountRenameResult> {
  try {
    // Validate name
    const trimmed = newName.trim();
    if (!trimmed) {
      return {
        success: false,
        error: 'Account name cannot be empty',
      };
    }

    if (trimmed.length > 32) {
      return {
        success: false,
        error: 'Account name must be 32 characters or fewer',
      };
    }

    if (!/^[-A-Za-z0-9 _]+$/.test(trimmed)) {
      return {
        success: false,
        error: 'Account name can only contain letters, numbers, spaces, hyphens, and underscores',
      };
    }

    // Check if account exists
    const accounts = await getAllAccountsWallet();
    const account = accounts.find((a) => a.index === index);
    if (!account) {
      return {
        success: false,
        error: 'Account not found',
      };
    }

    // Check for duplicate names
    const duplicate = accounts.find((a) => a.index !== index && a.name === trimmed);
    if (duplicate) {
      return {
        success: false,
        error: 'An account with this name already exists',
      };
    }

    // Rename the account
    await renameAccountWallet(index, trimmed);

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to rename account',
    };
  }
}

/**
 * Check if an account can be deleted and get warnings
 */
export async function checkAccountDeletion(index: number): Promise<AccountDeletionCheck> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const accounts = await getAllAccountsWallet();
    const account = accounts.find((a) => a.index === index);

    if (!account) {
      errors.push('Account not found');
      return { canDelete: false, warnings, errors };
    }

    // Check if it's the last account
    if (accounts.length <= 1) {
      errors.push('Cannot delete the last remaining account');
      return { canDelete: false, warnings, errors };
    }

    // Check for pending transactions
    if (isAccountPending(index)) {
      errors.push('Cannot delete account with pending transactions');
      return { canDelete: false, warnings, errors };
    }

    // Add warnings
    const activeAccount = await getActiveAccountWallet();
    if (account.index === activeAccount?.index) {
      warnings.push('This is your currently active account');
      warnings.push('The wallet will automatically switch to another account');
    }

    warnings.push('⚠️ IMPORTANT: This only removes the account from your UI');
    warnings.push('Funds remain on the blockchain and can be accessed anytime');
    warnings.push('You can re-add this account later by deriving the same index from your seed phrase');

    return {
      canDelete: errors.length === 0,
      warnings,
      errors,
    };
  } catch (error: any) {
    errors.push(error.message || 'Failed to check account deletion');
    return { canDelete: false, warnings, errors };
  }
}

/**
 * Delete an account from the UI (funds remain on-chain)
 */
export async function deleteAccount(index: number): Promise<AccountDeletionResult> {
  try {
    // Pre-flight check
    const check = await checkAccountDeletion(index);
    if (!check.canDelete) {
      return {
        success: false,
        error: check.errors.join('. '),
      };
    }

    // Get account info before deletion
    const accounts = await getAllAccountsWallet();
    const deletedAccount = accounts.find((a) => a.index === index);

    // Delete the account
    await deleteAccountWallet(index);

    // Get new active account
    const newActiveAccount = await getActiveAccountWallet();

    return {
      success: true,
      deletedAccount,
      newActiveAccount: newActiveAccount || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete account',
    };
  }
}

/**
 * Switch to a different account
 */
export async function switchAccount(index: number): Promise<AccountSwitchResult> {
  try {
    // Check if account exists
    const accounts = await getAllAccountsWallet();
    const targetAccount = accounts.find((a) => a.index === index);
    if (!targetAccount) {
      return {
        success: false,
        error: 'Account not found',
      };
    }

    // Get current active account
    const previousAccount = await getActiveAccountWallet();

    // Check if already active
    if (previousAccount?.index === index) {
      return {
        success: true,
        previousAccount: previousAccount || undefined,
        newAccount: targetAccount,
      };
    }

    // Switch account
    await switchAccountWallet(index);

    return {
      success: true,
      previousAccount: previousAccount || undefined,
      newAccount: targetAccount,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to switch account',
    };
  }
}

/**
 * Get the currently active account
 */
export async function getActiveAccount(): Promise<AccountInfo | null> {
  return await getActiveAccountWallet();
}

/**
 * Get a specific account by index
 */
export async function getAccountByIndex(index: number): Promise<AccountInfo | null> {
  const accounts = await getAllAccountsWallet();
  return accounts.find((a) => a.index === index) || null;
}

/**
 * Re-derive an account from seed (useful for recovering deleted accounts)
 */
export async function reDeriveAccount(index: number): Promise<AccountInfo> {
  return await deriveAccount(index);
}

/**
 * Get next available account name
 */
export async function getNextAccountName(): Promise<string> {
  const accounts = await getAllAccountsWallet();
  const maxIndex = accounts.length > 0 ? Math.max(...accounts.map((a) => a.index)) : -1;
  return `${DEFAULT_ACCOUNT_NAME_PREFIX} ${maxIndex + 2}`;
}

/**
 * Validate account name
 */
export function validateAccountName(name: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Account name cannot be empty' };
  }

  if (trimmed.length > 32) {
    return { isValid: false, error: 'Account name must be 32 characters or fewer' };
  }

  if (!/^[-A-Za-z0-9 _]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Account name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { isValid: true };
}

/**
 * Get deletion warning message for UI display
 */
export function getDeletionWarningMessage(accountName: string): string {
  return `You are about to remove "${accountName}" from your wallet UI.

⚠️ IMPORTANT:
• This ONLY removes the account from your UI
• Your funds remain safe on the blockchain
• You can always re-add this account later
• The account can be re-derived from your seed phrase

Are you sure you want to continue?`;
}

/**
 * Get deletion confirmation title
 */
export function getDeletionConfirmationTitle(): string {
  return 'Remove Account from UI';
}

/**
 * Export account list for backup/debugging
 */
export async function exportAccountList(): Promise<string> {
  const accounts = await getAllAccountsWithStatus();
  const stats = await getAccountStats();

  return JSON.stringify(
    {
      accounts: accounts.map((a) => ({
        index: a.index,
        name: a.name,
        address: a.address,
        isActive: a.isActive,
        hasPendingTransactions: a.hasPendingTransactions,
      })),
      stats,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}
