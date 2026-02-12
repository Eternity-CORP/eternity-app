const SESSION_KEY = 'encrypted_mnemonic'
const TEMP_KEY = 'encrypted_temp_mnemonic'

let sessionKey: CryptoKey | null = null

async function getOrCreateKey(): Promise<CryptoKey> {
  if (!sessionKey) {
    sessionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
  return sessionKey
}

async function encryptString(value: string, storageKey: string): Promise<void> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(value)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  const payload = JSON.stringify({
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertext)),
  })
  sessionStorage.setItem(storageKey, payload)
}

async function decryptString(storageKey: string): Promise<string | null> {
  if (!sessionKey) return null
  const raw = sessionStorage.getItem(storageKey)
  if (!raw) return null
  try {
    const { iv, ct } = JSON.parse(raw)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      sessionKey,
      new Uint8Array(ct)
    )
    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('Failed to decrypt session data:', err)
    return null
  }
}

// --- Session mnemonic (used after login / password set) ---

export async function encryptToSession(mnemonic: string): Promise<void> {
  await encryptString(mnemonic, SESSION_KEY)
}

export async function decryptFromSession(): Promise<string | null> {
  return decryptString(SESSION_KEY)
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionKey = null
}

export function hasSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) !== null
}

// --- Temp mnemonic (used during create/import flow before password is set) ---

export async function encryptTempToSession(mnemonic: string): Promise<void> {
  await encryptString(mnemonic, TEMP_KEY)
}

export async function decryptTempFromSession(): Promise<string | null> {
  return decryptString(TEMP_KEY)
}

export function clearTempSession(): void {
  sessionStorage.removeItem(TEMP_KEY)
}

export function hasTempSession(): boolean {
  return sessionStorage.getItem(TEMP_KEY) !== null
}
