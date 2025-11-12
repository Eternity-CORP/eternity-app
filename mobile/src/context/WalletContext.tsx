import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AccountInfo } from '../services/walletService';
import { createNewAccount, getAllAccounts, getActiveAccount, switchAccount as switchAccountSvc, deleteAccount as deleteAccountSvc, renameAccount as renameAccountSvc } from '../services/walletService';
import { isAccountPending } from '../services/state/transactionState';

interface WalletContextValue {
  accounts: AccountInfo[];
  activeAccount: AccountInfo | null;
  busy: boolean;
  createAccount: () => Promise<void>;
  switchAccount: (index: number) => Promise<void>;
  renameAccount: (index: number, name: string) => Promise<void>;
  deleteAccount: (index: number) => Promise<void>;
  canDeleteAccount: (index: number) => boolean;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [activeAccount, setActiveAccount] = useState<AccountInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const list = await getAllAccounts();
    const active = await getActiveAccount();
    setAccounts(list);
    setActiveAccount(active);
  };

  useEffect(() => {
    refresh();
  }, []);

  const createAccount = async () => {
    setBusy(true);
    try {
      await createNewAccount();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const switchAccount = async (index: number) => {
    setBusy(true);
    try {
      await switchAccountSvc(index);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const renameAccount = async (index: number, name: string) => {
    setBusy(true);
    try {
      await renameAccountSvc(index, name);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const canDeleteAccount = (index: number): boolean => {
    if (accounts.length <= 1) return false;
    if (isAccountPending(index)) return false;
    return true;
  };

  const deleteAccount = async (index: number) => {
    setBusy(true);
    try {
      await deleteAccountSvc(index);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<WalletContextValue>(() => ({
    accounts,
    activeAccount,
    busy,
    createAccount,
    switchAccount,
    renameAccount,
    deleteAccount,
    canDeleteAccount,
    refresh,
  }), [accounts, activeAccount, busy]);

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('WalletContext not found');
  return ctx;
}
