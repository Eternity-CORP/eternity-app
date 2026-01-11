/**
 * Wallet generation using BIP-39
 */

import { Mnemonic, HDNodeWallet } from 'ethers';

// Constants (will be imported from @e-y/shared once monorepo is configured)
const HD_WALLET_DERIVATION_PATH = "m/44'/60'/0'/0";
const DEFAULT_ACCOUNT_INDEX = 0;

/**
 * Generate a new 12-word mnemonic phrase
 */
export function generateMnemonic(): string {
  // Generate random entropy (16 bytes for 12 words, 32 bytes for 24 words)
  const entropy = new Uint8Array(16);
  crypto.getRandomValues(entropy);
  const mnemonic = Mnemonic.entropyToPhrase(entropy);
  return mnemonic;
}

/**
 * Generate a new wallet from mnemonic phrase
 */
export function generateWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = DEFAULT_ACCOUNT_INDEX,
): HDNodeWallet {
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
  const derivationPath = `${HD_WALLET_DERIVATION_PATH}/${accountIndex}`;
  return HDNodeWallet.fromPhrase(mnemonicObj.phrase, derivationPath);
}

/**
 * Generate a new random wallet
 */
export function generateRandomWallet(accountIndex: number = DEFAULT_ACCOUNT_INDEX): {
  wallet: HDNodeWallet;
  mnemonic: string;
} {
  const mnemonic = generateMnemonic();
  const wallet = generateWalletFromMnemonic(mnemonic, accountIndex);
  return { wallet, mnemonic };
}
