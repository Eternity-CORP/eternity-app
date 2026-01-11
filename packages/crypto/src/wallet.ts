import { Wallet, HDNodeWallet } from 'ethers';

/**
 * Generate a new wallet with 12-word mnemonic
 */
export const generateWallet = (): {
  mnemonic: string;
  address: string;
  privateKey: string;
} => {
  const wallet = Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase;

  if (!mnemonic) {
    throw new Error('Failed to generate mnemonic');
  }

  return {
    mnemonic,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

/**
 * Restore wallet from mnemonic phrase
 */
export const restoreWallet = (
  mnemonic: string
): {
  address: string;
  privateKey: string;
} => {
  const wallet = HDNodeWallet.fromPhrase(mnemonic);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

/**
 * Derive additional addresses from mnemonic
 */
export const deriveAddress = (
  mnemonic: string,
  index: number
): {
  address: string;
  privateKey: string;
} => {
  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, path);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};
