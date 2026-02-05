'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic, getAddressFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import {
  type Account,
  type AccountType,
  loadAccounts,
  saveAccounts,
  loadCurrentAccountIndex,
  saveCurrentAccountIndex,
  ensureDefaultAccount,
  clearAccountData,
} from '@/lib/account-storage'
import { getNetwork, type NetworkConfig } from '@/lib/network'

interface AccountContextValue {
  isLoggedIn: boolean
  wallet: ethers.HDNodeWallet | null
  address: string
  network: NetworkConfig
  accounts: Account[]
  currentAccount: Account | null
  switchAccount: (accountId: string) => void
  addAccount: (type: AccountType, label?: string) => void
  logout: () => void
}

const defaultNetwork = getNetwork('test')

const AccountContext = createContext<AccountContextValue>({
  isLoggedIn: false,
  wallet: null,
  address: '',
  network: defaultNetwork,
  accounts: [],
  currentAccount: null,
  switchAccount: () => {},
  addAccount: () => {},
  logout: () => {},
})

export function useAccount() {
  return useContext(AccountContext)
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) return

    const accs = ensureDefaultAccount(mnemonic, 'test', getAddressFromMnemonic)
    setAccounts(accs)

    const savedIndex = loadCurrentAccountIndex()
    const account = accs[savedIndex] || accs[0]
    setCurrentAccount(account)

    const w = deriveWalletFromMnemonic(mnemonic, account.accountIndex)
    setWallet(w)
  }, [])

  const switchAccount = useCallback((accountId: string) => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) return

    const accs = loadAccounts()
    const idx = accs.findIndex((a) => a.id === accountId)
    if (idx === -1) return

    const account = accs[idx]
    saveCurrentAccountIndex(idx)
    setCurrentAccount(account)

    const w = deriveWalletFromMnemonic(mnemonic, account.accountIndex)
    setWallet(w)
  }, [])

  const addAccount = useCallback((type: AccountType, label?: string) => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) return

    const accs = loadAccounts()
    const maxIndex = accs.reduce((max, a) => Math.max(max, a.accountIndex), -1)
    const newIndex = maxIndex + 1
    const address = getAddressFromMnemonic(mnemonic, newIndex)

    const newAccount: Account = {
      id: String(newIndex),
      address,
      accountIndex: newIndex,
      label: label || (type === 'test' ? `Test Wallet ${newIndex}` : `Wallet ${newIndex}`),
      type,
    }

    const updated = [...accs, newAccount]
    saveAccounts(updated)
    setAccounts(updated)

    // Switch to new account
    const newIdx = updated.length - 1
    saveCurrentAccountIndex(newIdx)
    setCurrentAccount(newAccount)

    const w = deriveWalletFromMnemonic(mnemonic, newIndex)
    setWallet(w)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('session_mnemonic')
    setWallet(null)
    setCurrentAccount(null)
    setAccounts([])
    clearAccountData()
    router.push('/unlock')
  }, [router])

  const address = wallet?.address || ''
  const network = currentAccount ? getNetwork(currentAccount.type) : defaultNetwork
  const isLoggedIn = wallet !== null

  return (
    <AccountContext.Provider
      value={{
        isLoggedIn,
        wallet,
        address,
        network,
        accounts,
        currentAccount,
        switchAccount,
        addAccount,
        logout,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}
