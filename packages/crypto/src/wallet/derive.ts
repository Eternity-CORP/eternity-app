/**
 * HD wallet key derivation
 */

import { HDNodeWallet, Mnemonic } from 'ethers';
import { HD_WALLET_DERIVATION_PATH } from '@e-y/shared';

/**
 * Derive wallet address from mnemonic at specific account index
 */
export function deriveWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number,
): HDNodeWallet {
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
  const derivationPath = `${HD_WALLET_DERIVATION_PATH}/${accountIndex}`;
  return HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
}

/**
 * Derive multiple accounts from a single mnemonic
 */
export function deriveMultipleAccounts(
  mnemonic: string,
  count: number,
): HDNodeWallet[] {
  const wallets: HDNodeWallet[] = [];
  for (let i = 0; i < count; i++) {
    wallets.push(deriveWalletFromMnemonic(mnemonic, i));
  }
  return wallets;
}

/**
 * Get wallet address from mnemonic and account index
 */
export function getAddressFromMnemonic(
  mnemonic: string,
  accountIndex: number,
): string {
  const wallet = deriveWalletFromMnemonic(mnemonic, accountIndex);
  return wallet.address;
}
