import { ethers } from 'ethers';
import { getSeed, getWalletMeta, saveWalletMeta, setActiveAccountIndex, getActiveAccountIndex, renameAccount as renameAccountMeta } from './cryptoService';
import { getProvider } from './blockchain/ethereumProvider';
import type { Network } from '../constants/rpcUrls';
import { isAccountPending } from './state/transactionState';

export interface CreatedWallet {
  mnemonic: string;
  privateKey: string;
  address: string;
}

export interface ImportedWallet {
  privateKey: string;
  address: string;
}

export interface AccountInfo {
  index: number;
  name: string;
  address: string;
}

const BASE_PATH = "m/44'/60'/0'/0/";

async function ensureMetaInitialized(): Promise<void> {
  const meta = await getWalletMeta();
  if (meta && meta.accounts && meta.accounts.length > 0) return;
  const seed = await getSeed();
  if (!seed || !ethers.utils.isValidMnemonic(seed)) return;
  // Create default Account 1 (index 0)
  const wallet0 = ethers.Wallet.fromMnemonic(seed, `${BASE_PATH}0`);
  const initial = {
    accounts: [{ index: 0, name: 'Account 1', address: wallet0.address }],
    activeAccountIndex: 0,
  };
  await saveWalletMeta(initial);
}

/**
 * Initialize wallet by creating the first account
 * Call this after importing/creating a wallet to ensure Account 1 exists
 */
export async function initializeWallet(): Promise<void> {
  await ensureMetaInitialized();
}

async function ensureAuthorized(): Promise<void> {
  const seed = await getSeed();
  if (!seed) throw new Error('Unauthorized: wallet not initialized');
}

export async function deriveAccount(index: number): Promise<AccountInfo> {
  const seed = await getSeed();
  if (!seed || !ethers.utils.isValidMnemonic(seed)) {
    throw new Error('No valid seed found');
  }
  const wallet = ethers.Wallet.fromMnemonic(seed, `${BASE_PATH}${index}`);
  // Ensure address is checksummed (EIP-55)
  const checksummedAddress = ethers.utils.getAddress(wallet.address);
  return { index, name: `Account ${index + 1}`, address: checksummedAddress };
}

export async function createNewAccount(): Promise<AccountInfo> {
  await ensureMetaInitialized();
  await ensureAuthorized();
  const meta = (await getWalletMeta()) || { accounts: [], activeAccountIndex: 0 };
  const nextIndex = meta.accounts.length > 0 ? Math.max(...meta.accounts.map(a => a.index)) + 1 : 0;
  const acct = await deriveAccount(nextIndex);
  meta.accounts.push(acct);
  await saveWalletMeta(meta);
  return acct;
}

export async function getAllAccounts(): Promise<AccountInfo[]> {
  await ensureMetaInitialized();
  const meta = await getWalletMeta();
  return meta?.accounts ?? [];
}

export async function switchAccount(index: number): Promise<void> {
  await ensureMetaInitialized();
  await ensureAuthorized();
  await setActiveAccountIndex(index);
}

export async function getActiveAccount(): Promise<AccountInfo | null> {
  await ensureMetaInitialized();
  const meta = await getWalletMeta();
  if (!meta || !meta.accounts || meta.accounts.length === 0) return null;
  const idx = meta.activeAccountIndex ?? 0;
  const acct = meta.accounts.find(a => a.index === idx) || meta.accounts[0];
  return acct || null;
}

export async function getAddress(): Promise<string | null> {
  const acct = await getActiveAccount();
  if (!acct?.address) return null;

  // Always return checksummed address (EIP-55)
  return ethers.utils.getAddress(acct.address);
}

export async function getSigner(network?: Network): Promise<ethers.Wallet> {
  const seed = await getSeed();
  if (!seed || !ethers.utils.isValidMnemonic(seed)) throw new Error('No valid seed found');
  const index = await getActiveAccountIndex();
  const wallet = ethers.Wallet.fromMnemonic(seed, `${BASE_PATH}${index}`);
  const provider = getProvider(network);
  return wallet.connect(provider);
}

export async function renameAccount(index: number, name: string): Promise<void> {
  await ensureAuthorized();
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Name is required');
  if (trimmed.length > 32) throw new Error('Name must be 32 characters or fewer');
  if (!/^[-A-Za-z0-9 _]+$/.test(trimmed)) throw new Error('Name contains invalid characters');
  await renameAccountMeta(index, trimmed);
}

export async function deleteAccount(index: number): Promise<void> {
  await ensureAuthorized();
  const meta = await getWalletMeta();
  if (!meta || !meta.accounts) throw new Error('No accounts to delete');
  if (meta.accounts.length <= 1) throw new Error('Cannot delete the last remaining account');
  if (isAccountPending(index)) throw new Error('Cannot delete account with active transactions');
  const newAccounts = meta.accounts.filter(a => a.index !== index);
  let newActive = meta.activeAccountIndex;
  if (meta.activeAccountIndex === index) {
    newActive = newAccounts[0]?.index ?? 0;
  }
  await saveWalletMeta({ accounts: newAccounts, activeAccountIndex: newActive });
}

// Legacy creators retained for screen flows/tests; do NOT persist private keys
export async function createWallet(): Promise<CreatedWallet> {
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase ?? '';
  // Derive index 0 as the default account
  const wallet0 = ethers.Wallet.fromMnemonic(mnemonic, `${BASE_PATH}0`);
  return {
    mnemonic,
    privateKey: wallet0.privateKey,
    address: wallet0.address,
  };
}

/**
 * Create wallet with specific mnemonic length
 * 12 words -> 128-bit entropy
 * 24 words -> 256-bit entropy
 */
export async function createWalletWithWordCount(wordCount: 12 | 24): Promise<CreatedWallet> {
  const entropyBytes = wordCount === 24 ? 32 : 16;
  const entropy = ethers.utils.randomBytes(entropyBytes);
  const mnemonic = ethers.utils.entropyToMnemonic(entropy);
  const wallet0 = ethers.Wallet.fromMnemonic(mnemonic, `${BASE_PATH}0`);
  return {
    mnemonic,
    privateKey: wallet0.privateKey,
    address: wallet0.address,
  };
}

export async function importWallet(mnemonic: string): Promise<ImportedWallet> {
  if (!ethers.utils.isValidMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  const wallet0 = ethers.Wallet.fromMnemonic(mnemonic, `${BASE_PATH}0`);
  return {
    privateKey: wallet0.privateKey,
    address: wallet0.address,
  };
}

export async function importFromPrivateKey(privateKey: string): Promise<{ address: string }> {
  const wallet = new ethers.Wallet(privateKey);
  return { address: wallet.address };
}
