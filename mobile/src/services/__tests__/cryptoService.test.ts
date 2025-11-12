import { saveWallet, getWallet, deleteWallet, isWalletExists } from '../../services/cryptoService';

describe('cryptoService', () => {
  const seed = 'test test test test test test test test test test test junk';

  it('saves and retrieves encrypted wallet seed (no private keys)', async () => {
    await saveWallet(seed);
    expect(await isWalletExists()).toBe(true);

    const wallet = await getWallet();
    expect(wallet.seed).toBe(seed);
    expect(wallet.privateKey).toBeNull();
  });

  it('deletes wallet data', async () => {
    await deleteWallet();
    expect(await isWalletExists()).toBe(false);
  });
});
