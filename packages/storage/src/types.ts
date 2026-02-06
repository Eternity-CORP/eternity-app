export interface EncryptedData {
  salt: Uint8Array
  iv: Uint8Array
  encrypted: ArrayBuffer
}

export interface SecureStorage {
  encryptAndSave(seedPhrase: string, password: string): Promise<void>
  loadAndDecrypt(password: string): Promise<string>
  hasWallet(): Promise<boolean>
  clearWallet(): Promise<void>
}
