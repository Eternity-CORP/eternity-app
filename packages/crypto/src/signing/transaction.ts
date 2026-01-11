/**
 * Transaction signing utilities
 */

import { HDNodeWallet, TransactionRequest, TransactionResponse } from 'ethers';
import { Provider } from 'ethers';

/**
 * Sign a transaction with wallet
 */
export async function signTransaction(
  wallet: HDNodeWallet,
  transaction: TransactionRequest,
): Promise<string> {
  const signedTx = await wallet.signTransaction(transaction);
  return signedTx;
}

/**
 * Sign and send a transaction
 */
export async function signAndSendTransaction(
  wallet: HDNodeWallet,
  provider: Provider,
  transaction: TransactionRequest,
): Promise<TransactionResponse> {
  const txResponse = await wallet.sendTransaction(transaction);
  return txResponse;
}

/**
 * Sign a message with wallet
 */
export async function signMessage(wallet: HDNodeWallet, message: string): Promise<string> {
  return await wallet.signMessage(message);
}
