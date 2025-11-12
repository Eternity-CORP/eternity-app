/**
 * Tests for Account Manager Service
 *
 * [EYP-M1-ACC-001] Multiple Wallets: create/rename/delete
 */

import {
  createAccount,
  renameAccount,
  deleteAccount,
  switchAccount,
  getAllAccountsWithStatus,
  getAccountStats,
  checkAccountDeletion,
  getActiveAccount,
  getAccountByIndex,
  validateAccountName,
  getNextAccountName,
} from '../accountManagerService';

import {
  createNewAccount,
  getAllAccounts,
  switchAccount as switchAccountWallet,
  deleteAccount as deleteAccountWallet,
} from '../walletService';

// Mock dependencies
jest.mock('../walletService');
jest.mock('../cryptoService');
jest.mock('../state/transactionState');

const mockCreateNewAccount = createNewAccount as jest.MockedFunction<typeof createNewAccount>;
const mockGetAllAccounts = getAllAccounts as jest.MockedFunction<typeof getAllAccounts>;
const mockSwitchAccount = switchAccountWallet as jest.MockedFunction<typeof switchAccountWallet>;
const mockDeleteAccount = deleteAccountWallet as jest.MockedFunction<typeof deleteAccountWallet>;

import { isAccountPending } from '../state/transactionState';
const mockIsAccountPending = isAccountPending as jest.MockedFunction<typeof isAccountPending>;

import { getWalletMeta } from '../cryptoService';
const mockGetWalletMeta = getWalletMeta as jest.MockedFunction<typeof getWalletMeta>;

describe('[EYP-M1-ACC-001] Account Manager Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock: 2 accounts, index 0 is active
    mockGetAllAccounts.mockResolvedValue([
      { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
      { index: 1, name: 'Account 2', address: '0x2222222222222222222222222222222222222222' },
    ]);

    mockGetWalletMeta.mockResolvedValue({
      accounts: [
        { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
        { index: 1, name: 'Account 2', address: '0x2222222222222222222222222222222222222222' },
      ],
      activeAccountIndex: 0,
    });

    mockIsAccountPending.mockReturnValue(false);
  });

  describe('Account Creation', () => {
    it('[Task 1] should create new HD account', async () => {
      const newAccount = {
        index: 2,
        name: 'Account 3',
        address: '0x3333333333333333333333333333333333333333',
      };

      mockCreateNewAccount.mockResolvedValue(newAccount);

      const result = await createAccount();

      expect(result.success).toBe(true);
      expect(result.account).toEqual(newAccount);
      expect(mockCreateNewAccount).toHaveBeenCalled();
    });

    it('should create account with custom name', async () => {
      const newAccount = {
        index: 2,
        name: 'Account 3',
        address: '0x3333333333333333333333333333333333333333',
      };

      mockCreateNewAccount.mockResolvedValue(newAccount);

      const result = await createAccount('My Custom Account');

      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
    });

    it('should reject creation if max accounts reached', async () => {
      // Mock 100 accounts
      const manyAccounts = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        name: `Account ${i + 1}`,
        address: `0x${i.toString(16).padStart(40, '0')}`,
      }));

      mockGetAllAccounts.mockResolvedValue(manyAccounts);

      const result = await createAccount();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot create more than 100 accounts');
    });

    it('should get next available account name', async () => {
      const nextName = await getNextAccountName();
      expect(nextName).toBe('Account 3');
    });
  });

  describe('Account Renaming', () => {
    it('[Task 2] should rename account successfully', async () => {
      const result = await renameAccount(0, 'My Main Account');

      expect(result.success).toBe(true);
    });

    it('should reject empty name', async () => {
      const result = await renameAccount(0, '   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject name longer than 32 characters', async () => {
      const longName = 'A'.repeat(33);
      const result = await renameAccount(0, longName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('32 characters or fewer');
    });

    it('should reject name with invalid characters', async () => {
      const result = await renameAccount(0, 'Account@123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('letters, numbers, spaces, hyphens, and underscores');
    });

    it('should reject duplicate names', async () => {
      mockGetAllAccounts.mockResolvedValue([
        { index: 0, name: 'Main', address: '0x1111111111111111111111111111111111111111' },
        { index: 1, name: 'Secondary', address: '0x2222222222222222222222222222222222222222' },
      ]);

      const result = await renameAccount(0, 'Secondary');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should allow valid names with spaces, hyphens, underscores', async () => {
      const validNames = ['My Account', 'Account-1', 'Account_1', 'Main Wallet'];

      for (const name of validNames) {
        const result = await renameAccount(0, name);
        expect(result.success).toBe(true);
      }
    });

    it('should validate account name correctly', () => {
      expect(validateAccountName('Valid Name').isValid).toBe(true);
      expect(validateAccountName('').isValid).toBe(false);
      expect(validateAccountName('A'.repeat(33)).isValid).toBe(false);
      expect(validateAccountName('Invalid@Name').isValid).toBe(false);
    });
  });

  describe('Account Deletion', () => {
    it('[Task 2, Task 3] should delete account from UI', async () => {
      const result = await deleteAccount(1);

      expect(result.success).toBe(true);
      expect(result.deletedAccount).toBeDefined();
      expect(mockDeleteAccount).toHaveBeenCalledWith(1);
    });

    it('[AC1] should not affect on-chain funds when deleting', async () => {
      // Deletion only removes from UI, funds remain on blockchain
      const result = await deleteAccount(1);

      expect(result.success).toBe(true);
      // Account deleted from UI but address still exists on blockchain
      expect(result.deletedAccount?.address).toBeDefined();
    });

    it('should reject deletion of last account', async () => {
      mockGetAllAccounts.mockResolvedValue([
        { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
      ]);

      const result = await deleteAccount(0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('last remaining account');
    });

    it('should reject deletion of account with pending transactions', async () => {
      mockIsAccountPending.mockReturnValue(true);

      const result = await deleteAccount(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pending transactions');
    });

    it('[Test 2] should allow canceling deletion with no losses', async () => {
      // Check deletion first
      const check = await checkAccountDeletion(1);

      expect(check.canDelete).toBe(true);
      expect(check.warnings.length).toBeGreaterThan(0);

      // User can cancel at this point - no changes made
      const accountsBefore = await getAllAccountsWithStatus();
      expect(accountsBefore.length).toBe(2);
    });

    it('should provide warnings before deletion', async () => {
      const check = await checkAccountDeletion(1);

      expect(check.canDelete).toBe(true);
      expect(check.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('IMPORTANT')])
      );
      expect(check.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('blockchain')])
      );
    });

    it('should switch active account if deleting active account', async () => {
      mockGetWalletMeta.mockResolvedValue({
        accounts: [
          { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
          { index: 1, name: 'Account 2', address: '0x2222222222222222222222222222222222222222' },
        ],
        activeAccountIndex: 0,
      });

      const result = await deleteAccount(0);

      expect(result.success).toBe(true);
      expect(result.newActiveAccount).toBeDefined();
      expect(result.newActiveAccount?.index).not.toBe(0);
    });
  });

  describe('Account Switching', () => {
    it('[Task 3, AC2] should switch accounts instantly', async () => {
      const result = await switchAccount(1);

      expect(result.success).toBe(true);
      expect(result.newAccount?.index).toBe(1);
      expect(mockSwitchAccount).toHaveBeenCalledWith(1);
    });

    it('should return previous and new account info', async () => {
      mockGetWalletMeta.mockResolvedValueOnce({
        accounts: [
          { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
          { index: 1, name: 'Account 2', address: '0x2222222222222222222222222222222222222222' },
        ],
        activeAccountIndex: 0,
      });

      const result = await switchAccount(1);

      expect(result.success).toBe(true);
      expect(result.previousAccount?.index).toBe(0);
      expect(result.newAccount?.index).toBe(1);
    });

    it('should handle switching to already active account', async () => {
      mockGetWalletMeta.mockResolvedValue({
        accounts: [
          { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
        ],
        activeAccountIndex: 0,
      });

      const result = await switchAccount(0);

      expect(result.success).toBe(true);
    });

    it('should reject switching to non-existent account', async () => {
      const result = await switchAccount(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Account Status and Indicators', () => {
    it('[Task 3] should show active account indicator', async () => {
      const accounts = await getAllAccountsWithStatus();

      const activeAccount = accounts.find((a) => a.isActive);
      expect(activeAccount).toBeDefined();
      expect(activeAccount?.index).toBe(0);
    });

    it('should indicate accounts with pending transactions', async () => {
      mockIsAccountPending.mockImplementation((index) => index === 1);

      const accounts = await getAllAccountsWithStatus();

      const account1 = accounts.find((a) => a.index === 1);
      expect(account1?.hasPendingTransactions).toBe(true);
    });

    it('should indicate which accounts can be deleted', async () => {
      const accounts = await getAllAccountsWithStatus();

      // All accounts except those with pending tx can be deleted (when not last account)
      const deletableAccounts = accounts.filter((a) => a.canDelete);
      expect(deletableAccounts.length).toBeGreaterThan(0);
    });

    it('should provide deletion warnings per account', async () => {
      mockIsAccountPending.mockReturnValue(true);

      const accounts = await getAllAccountsWithStatus();

      const accountWithPendingTx = accounts.find((a) => a.hasPendingTransactions);
      expect(accountWithPendingTx?.deletionWarnings).toEqual(
        expect.arrayContaining([expect.stringContaining('pending')])
      );
    });
  });

  describe('Account Statistics', () => {
    it('should provide account statistics', async () => {
      const stats = await getAccountStats();

      expect(stats.totalAccounts).toBe(2);
      expect(stats.activeAccountIndex).toBe(0);
      expect(stats.canCreateMore).toBe(true);
    });

    it('should indicate if more accounts can be created', async () => {
      const stats = await getAccountStats();

      expect(stats.canCreateMore).toBe(true);

      // Mock 100 accounts
      const manyAccounts = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        name: `Account ${i + 1}`,
        address: `0x${i.toString(16).padStart(40, '0')}`,
      }));

      mockGetAllAccounts.mockResolvedValue(manyAccounts);

      const stats2 = await getAccountStats();
      expect(stats2.canCreateMore).toBe(false);
    });

    it('should count accounts with pending transactions', async () => {
      mockIsAccountPending.mockImplementation((index) => index === 1);

      const stats = await getAccountStats();

      expect(stats.accountsWithPendingTx).toBe(1);
    });
  });

  describe('E2E Scenarios (Acceptance Criteria)', () => {
    it('[Test 1] Create → Rename → Delete — PASS', async () => {
      // Step 1: Create account
      const newAccount = {
        index: 2,
        name: 'Account 3',
        address: '0x3333333333333333333333333333333333333333',
      };
      mockCreateNewAccount.mockResolvedValue(newAccount);

      const createResult = await createAccount();
      expect(createResult.success).toBe(true);

      // Step 2: Rename account
      mockGetAllAccounts.mockResolvedValue([
        { index: 0, name: 'Account 1', address: '0x1111111111111111111111111111111111111111' },
        { index: 1, name: 'Account 2', address: '0x2222222222222222222222222222222222222222' },
        { index: 2, name: 'Account 3', address: '0x3333333333333333333333333333333333333333' },
      ]);

      const renameResult = await renameAccount(2, 'My Custom Wallet');
      expect(renameResult.success).toBe(true);

      // Step 3: Delete account
      const deleteResult = await deleteAccount(2);
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedAccount?.index).toBe(2);
    });

    it('[Test 2] Cancel deletion — no losses', async () => {
      // Check deletion
      const check = await checkAccountDeletion(1);
      expect(check.canDelete).toBe(true);

      // User sees warnings and cancels - no deletion happens
      const accountsBefore = await getAllAccountsWithStatus();
      expect(accountsBefore.length).toBe(2);

      // Verify account still exists
      const account = await getAccountByIndex(1);
      expect(account).toBeDefined();
      expect(account?.index).toBe(1);
    });

    it('[AC1] Deletion does not affect on-chain funds', async () => {
      const accountToDelete = await getAccountByIndex(1);
      const addressBefore = accountToDelete?.address;

      // Delete account from UI
      const result = await deleteAccount(1);
      expect(result.success).toBe(true);

      // Address still exists on blockchain
      // Funds can be accessed by re-deriving the same index
      expect(result.deletedAccount?.address).toBe(addressBefore);
    });

    it('[AC2] Account switching is instant', async () => {
      const startTime = Date.now();

      const result = await switchAccount(1);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should be near-instant
    });

    it('[DoD] Warnings and confirmations for deletion', async () => {
      const check = await checkAccountDeletion(1);

      expect(check.warnings.length).toBeGreaterThan(0);
      expect(check.warnings.some((w) => w.includes('IMPORTANT'))).toBe(true);
      expect(check.warnings.some((w) => w.includes('blockchain'))).toBe(true);
      expect(check.warnings.some((w) => w.includes('UI'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent account operations gracefully', async () => {
      // Simulate multiple rapid operations
      const promises = [
        createAccount(),
        renameAccount(0, 'Renamed 1'),
        switchAccount(1),
        getAllAccountsWithStatus(),
      ];

      const results = await Promise.all(promises);

      // All operations should complete without errors
      expect(results).toHaveLength(4);
    });

    it('should handle account with special characters in name', async () => {
      const result = await renameAccount(0, 'Main-Account_1 Test');

      expect(result.success).toBe(true);
    });

    it('should handle very long account lists', async () => {
      const manyAccounts = Array.from({ length: 50 }, (_, i) => ({
        index: i,
        name: `Account ${i + 1}`,
        address: `0x${i.toString(16).padStart(40, '0')}`,
      }));

      mockGetAllAccounts.mockResolvedValue(manyAccounts);

      const accounts = await getAllAccountsWithStatus();
      expect(accounts.length).toBe(50);

      const stats = await getAccountStats();
      expect(stats.totalAccounts).toBe(50);
    });
  });
});
