import { Wallet, TransactionRequest } from 'ethers';

/**
 * Sign a transaction with private key
 */
export const signTransaction = async (
  privateKey: string,
  tx: TransactionRequest
): Promise<string> => {
  const wallet = new Wallet(privateKey);
  return wallet.signTransaction(tx);
};

/**
 * Sign a message with private key
 */
export const signMessage = async (
  privateKey: string,
  message: string
): Promise<string> => {
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(message);
};
