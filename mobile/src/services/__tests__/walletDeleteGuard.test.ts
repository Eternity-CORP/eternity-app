import { saveWallet, getWalletMeta } from '../../services/cryptoService';
import { createNewAccount, deleteAccount, getAllAccounts } from '../../services/walletService';
import { markAccountPending, clearAccountPending } from '../../services/state/transactionState';

describe('walletService delete guard', () => {
  const seed = 'test test test test test test test test test test test junk';

  beforeEach(async () => {
    await saveWallet(seed);
    // Trigger meta initialization to create default Account 1 (index 0)
    await getAllAccounts();
  });

  it('prevents deleting last remaining account', async () => {
    const meta = await getWalletMeta();
    expect(meta?.accounts?.length).toBe(1);
    await expect(deleteAccount(meta!.accounts[0].index)).rejects.toThrow('Cannot delete the last remaining account');
  });

  it('prevents deleting account with active transactions', async () => {
    // Create a second account
    const acct = await createNewAccount();
    // Mark as pending
    markAccountPending(acct.index);
    await expect(deleteAccount(acct.index)).rejects.toThrow('Cannot delete account with active transactions');
    clearAccountPending(acct.index);
    await expect(deleteAccount(acct.index)).resolves.toBeUndefined();
  });
});
