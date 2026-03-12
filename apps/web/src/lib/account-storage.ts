import type { AccountType, WalletAccount } from '@e-y/shared'

export type { AccountType, WalletAccount }

const ACCOUNTS_KEY = 'ey_accounts'
const CURRENT_INDEX_KEY = 'ey_current_account_index'

const VALID_ACCOUNT_TYPES = new Set<AccountType>(['test', 'real'])

export function loadAccounts(): WalletAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed: WalletAccount[] = JSON.parse(raw)
    // Filter out removed account types (e.g. 'business') that may linger in storage
    const valid = parsed.filter((a) => VALID_ACCOUNT_TYPES.has(a.type))
    if (valid.length !== parsed.length) {
      saveAccounts(valid)
    }
    return valid
  } catch (err) {
    console.error('Failed to load accounts from localStorage:', err)
    return []
  }
}

export function saveAccounts(accounts: WalletAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function loadCurrentAccountIndex(): number {
  try {
    const raw = localStorage.getItem(CURRENT_INDEX_KEY)
    if (raw === null) return 0
    return parseInt(raw, 10)
  } catch (err) {
    console.error('Failed to load current account index from localStorage:', err)
    return 0
  }
}

export function saveCurrentAccountIndex(index: number): void {
  localStorage.setItem(CURRENT_INDEX_KEY, String(index))
}

export function ensureDefaultAccount(
  mnemonic: string,
  defaultType: AccountType = 'test',
  deriveAddress: (mnemonic: string, index: number) => string
): WalletAccount[] {
  const existing = loadAccounts()
  if (existing.length > 0) return existing

  const address = deriveAddress(mnemonic, 0)
  const account: WalletAccount = {
    id: '0',
    address,
    accountIndex: 0,
    label: defaultType === 'test' ? 'Test Wallet' : 'Main Wallet',
    type: defaultType,
  }

  const accounts = [account]
  saveAccounts(accounts)
  saveCurrentAccountIndex(0)
  return accounts
}

export function clearAccountData(): void {
  localStorage.removeItem(ACCOUNTS_KEY)
  localStorage.removeItem(CURRENT_INDEX_KEY)
}
