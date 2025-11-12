import { importWallet, createWallet } from '../../services/walletService';
import { ethers } from 'ethers';

describe('walletService', () => {
  it('creates a new wallet with valid mnemonic and address', async () => {
    const w = await createWallet();
    expect(typeof w.mnemonic).toBe('string');
    expect(w.mnemonic.split(' ').length).toBeGreaterThanOrEqual(12);
    expect(ethers.utils.isAddress(w.address)).toBe(true);
    expect(w.privateKey.startsWith('0x')).toBe(true);
    expect(w.privateKey.length).toBe(66);
  });

  it('imports wallet from mnemonic', async () => {
    const mnemonic = 'test test test test test test test test test test test junk';
    const w = await importWallet(mnemonic);
    expect(ethers.utils.isAddress(w.address)).toBe(true);
    expect(w.privateKey.startsWith('0x')).toBe(true);
  });
});
