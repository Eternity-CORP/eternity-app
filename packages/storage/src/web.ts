import { openDB, IDBPDatabase } from 'idb'
import type { EncryptedData, SecureStorage } from './types'

const DB_NAME = 'e-y-wallet'
const STORE_NAME = 'encrypted-keys'
const WALLET_KEY = 'wallet'

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptAndSave(seedPhrase: string, password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(seedPhrase)
  )

  const db = await getDB()
  await db.put(STORE_NAME, { salt, iv, encrypted }, WALLET_KEY)
}

export async function loadAndDecrypt(password: string): Promise<string> {
  const db = await getDB()
  const data = await db.get(STORE_NAME, WALLET_KEY) as EncryptedData | undefined

  if (!data) {
    throw new Error('No wallet found')
  }

  const salt = new Uint8Array(data.salt)
  const iv = new Uint8Array(data.iv)
  const key = await deriveKey(password, salt)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      data.encrypted
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error('Invalid password')
  }
}

export async function hasWallet(): Promise<boolean> {
  const db = await getDB()
  const data = await db.get(STORE_NAME, WALLET_KEY)
  return !!data
}

export async function clearWallet(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, WALLET_KEY)
}

export const webStorage: SecureStorage = {
  encryptAndSave,
  loadAndDecrypt,
  hasWallet,
  clearWallet,
}
