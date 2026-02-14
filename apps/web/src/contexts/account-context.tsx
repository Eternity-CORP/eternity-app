'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic, getAddressFromMnemonic, isValidMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { createAccount, getNextAccountIndex, migrateAccountAddresses } from '@e-y/shared'
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
import { encryptToSession, decryptFromSession, clearSession } from '@/lib/session-crypto'

type UiMode = 'ai' | 'classic'

interface AccountContextValue {
  isLoggedIn: boolean
  ready: boolean
  wallet: ethers.HDNodeWallet | null
  address: string
  network: NetworkConfig
  accounts: Account[]
  currentAccount: Account | null
  uiMode: UiMode
  login: (mnemonic: string) => Promise<void>
  switchAccount: (accountId: string) => Promise<void>
  addAccount: (type: AccountType, label?: string) => Promise<void>
  addBusinessAccount: (businessId: string, label: string, treasuryAddress: string) => void
  syncBusinessAccounts: (businesses: { id: string; name: string; treasuryAddress: string }[]) => void
  renameAccount: (accountId: string, label: string) => void
  removeAccount: (accountId: string) => Promise<void>
  importWallet: (mnemonic: string) => Promise<boolean>
  setUiMode: (mode: UiMode) => void
  logout: () => void
}

const defaultNetwork = getNetwork('test')

const UI_MODE_KEY = 'ey_ui_mode'

const AccountContext = createContext<AccountContextValue>({
  isLoggedIn: false,
  ready: false,
  wallet: null,
  address: '',
  network: defaultNetwork,
  accounts: [],
  currentAccount: null,
  uiMode: 'ai',
  login: async () => {},
  switchAccount: async () => {},
  addAccount: async () => {},
  addBusinessAccount: () => { /* noop */ },
  syncBusinessAccounts: () => { /* noop */ },
  renameAccount: () => {},
  removeAccount: async () => {},
  importWallet: async () => false,
  setUiMode: () => {},
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
  const [uiMode, setUiModeState] = useState<UiMode>('ai')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const mnemonic = await decryptFromSession()
      if (!mnemonic) {
        setReady(true)
        return
      }

      const accs = ensureDefaultAccount(mnemonic, 'test', getAddressFromMnemonic)

      const migration = migrateAccountAddresses(accs, mnemonic, getAddressFromMnemonic)
      if (migration.needsSave) {
        saveAccounts(migration.accounts)
      }

      setAccounts(migration.accounts)

      const savedIndex = loadCurrentAccountIndex()
      const account = migration.accounts[savedIndex] || migration.accounts[0]
      setCurrentAccount(account)

      const w = deriveWalletFromMnemonic(mnemonic, account.accountIndex)
      setWallet(w)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(UI_MODE_KEY)
    if (saved === 'ai' || saved === 'classic') {
      setUiModeState(saved)
    }
  }, [])

  const setUiMode = useCallback((mode: UiMode) => {
    setUiModeState(mode)
    localStorage.setItem(UI_MODE_KEY, mode)
  }, [])

  const login = useCallback(async (mnemonic: string) => {
    await encryptToSession(mnemonic)

    const accs = ensureDefaultAccount(mnemonic, 'test', getAddressFromMnemonic)

    const migration = migrateAccountAddresses(accs, mnemonic, getAddressFromMnemonic)
    if (migration.needsSave) {
      saveAccounts(migration.accounts)
    }

    setAccounts(migration.accounts)

    const savedIndex = loadCurrentAccountIndex()
    const account = migration.accounts[savedIndex] || migration.accounts[0]
    setCurrentAccount(account)

    const w = deriveWalletFromMnemonic(mnemonic, account.accountIndex)
    setWallet(w)
    setReady(true)
  }, [])

  const switchAccount = useCallback(async (accountId: string) => {
    const mnemonic = await decryptFromSession()
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

  const addAccount = useCallback(async (type: AccountType, label?: string) => {
    const mnemonic = await decryptFromSession()
    if (!mnemonic) return

    const accs = loadAccounts()
    const newIndex = getNextAccountIndex(accs)
    const address = getAddressFromMnemonic(mnemonic, newIndex)

    const newAccount = createAccount({ index: newIndex, address, type, label })

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

  // Add a business account — uses treasury address as the business wallet address
  const addBusinessAccount = useCallback((businessId: string, label: string, treasuryAddress: string) => {
    const accs = loadAccounts()

    // Skip if already exists
    if (accs.some((a) => a.businessId === businessId)) return

    const current = currentAccount
    if (!current) return

    const newAccount = createAccount({
      index: current.accountIndex,
      address: treasuryAddress, // Business wallet address = treasury address
      type: 'business',
      label,
      businessId,
    })

    const updated = [...accs, newAccount]
    saveAccounts(updated)
    setAccounts(updated)

    // Switch to new business account
    const newIdx = updated.length - 1
    saveCurrentAccountIndex(newIdx)
    setCurrentAccount(newAccount)
  }, [currentAccount])

  // Sync business accounts from API — adds missing, removes stale
  const syncBusinessAccounts = useCallback((businesses: { id: string; name: string; treasuryAddress: string }[]) => {
    const accs = loadAccounts()
    const existingBizIds = new Set(accs.filter((a) => a.type === 'business').map((a) => a.businessId))
    const apiBizIds = new Set(businesses.map((b) => b.id))

    let updated = [...accs]
    let changed = false

    // Add missing businesses
    for (const biz of businesses) {
      if (!existingBizIds.has(biz.id)) {
        const baseAccount = accs.find((a) => a.type !== 'business') || accs[0]
        if (!baseAccount) continue

        updated.push(createAccount({
          index: baseAccount.accountIndex,
          address: biz.treasuryAddress, // Business wallet address = treasury address
          type: 'business',
          label: biz.name,
          businessId: biz.id,
        }))
        changed = true
      }
    }

    // Remove stale business accounts (deleted from API)
    const beforeLen = updated.length
    updated = updated.filter((a) => a.type !== 'business' || (a.businessId && apiBizIds.has(a.businessId)))
    if (updated.length !== beforeLen) changed = true

    if (changed) {
      saveAccounts(updated)
      setAccounts(updated)
    }
  }, [])

  const renameAccount = useCallback((accountId: string, label: string) => {
    const accs = loadAccounts()
    const updated = accs.map((a) =>
      a.id === accountId ? { ...a, label: label.trim() || undefined } : a
    )
    saveAccounts(updated)
    setAccounts(updated)

    // Update currentAccount if it's the one being renamed
    setCurrentAccount((prev) =>
      prev && prev.id === accountId ? { ...prev, label: label.trim() || undefined } : prev
    )
  }, [])

  const removeAccount = useCallback(async (accountId: string) => {
    const mnemonic = await decryptFromSession()
    if (!mnemonic) return

    const accs = loadAccounts()
    if (accs.length <= 1) return // can't delete last account

    const updated = accs.filter((a) => a.id !== accountId)
    saveAccounts(updated)
    setAccounts(updated)

    // If deleting current account, switch to first remaining
    setCurrentAccount((prev) => {
      if (prev && prev.id === accountId) {
        const next = updated[0]
        saveCurrentAccountIndex(0)
        const w = deriveWalletFromMnemonic(mnemonic, next.accountIndex)
        setWallet(w)
        return next
      }
      return prev
    })
  }, [])

  const importWallet = useCallback(async (mnemonic: string): Promise<boolean> => {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!isValidMnemonic(normalized)) return false

    await encryptToSession(normalized)
    clearAccountData()

    const address = getAddressFromMnemonic(normalized, 0)
    const account = createAccount({ index: 0, address, type: 'real', label: 'Main Wallet' })

    saveAccounts([account])
    saveCurrentAccountIndex(0)
    setAccounts([account])
    setCurrentAccount(account)

    const w = deriveWalletFromMnemonic(normalized, 0)
    setWallet(w)
    return true
  }, [])

  const logout = useCallback(() => {
    clearSession()
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
        ready,
        wallet,
        address,
        network,
        accounts,
        currentAccount,
        uiMode,
        login,
        switchAccount,
        addAccount,
        addBusinessAccount,
        syncBusinessAccounts,
        renameAccount,
        removeAccount,
        importWallet,
        setUiMode,
        logout,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}
