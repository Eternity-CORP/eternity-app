/**
 * Accounts File Encryption Service
 *
 * Encrypts account metadata stored in the filesystem using AES-256-CTR.
 * The encryption key is stored in SecureStore (hardware-backed on supported devices).
 *
 * Approach:
 * - A 256-bit random key is generated once and stored in expo-secure-store
 * - Each write generates a fresh random 16-byte IV
 * - The IV is prepended to the ciphertext (first 16 bytes of the file)
 * - Encryption uses AES-256-CTR (counter mode) implemented in pure JS
 *   because React Native does not expose crypto.subtle
 *
 * Why CTR mode:
 * - No padding needed (stream cipher)
 * - Simple, well-understood, and constant-time for each block
 * - Fresh IV per write prevents identical-plaintext attacks
 *
 * The polyfill `react-native-get-random-values` provides crypto.getRandomValues().
 */

import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_STORE = 'accounts-encryption-key';

// ----- Helpers -----

/** Convert hex string to Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to hex string */
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Convert string to UTF-8 bytes */
function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/** Convert UTF-8 bytes to string */
function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/** Convert Uint8Array to base64 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native (Hermes)
  return btoa(binary);
}

/** Convert base64 to Uint8Array */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ----- AES S-Box & Key Expansion -----

// prettier-ignore
const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

// prettier-ignore
const RCON: number[] = [
  0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,
];

/**
 * AES-256 key expansion: produce 60 x 32-bit round keys from 32-byte key
 */
function expandKey256(key: Uint8Array): Uint32Array {
  const Nk = 8; // 256-bit key
  const Nr = 14;
  const W = new Uint32Array(4 * (Nr + 1)); // 60 words

  // Copy key into first Nk words
  for (let i = 0; i < Nk; i++) {
    W[i] =
      (key[4 * i] << 24) |
      (key[4 * i + 1] << 16) |
      (key[4 * i + 2] << 8) |
      key[4 * i + 3];
  }

  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = W[i - 1];
    if (i % Nk === 0) {
      // RotWord + SubWord + Rcon
      temp =
        ((SBOX[(temp >>> 16) & 0xff] << 24) |
          (SBOX[(temp >>> 8) & 0xff] << 16) |
          (SBOX[temp & 0xff] << 8) |
          SBOX[(temp >>> 24) & 0xff]) ^
        (RCON[i / Nk - 1] << 24);
    } else if (i % Nk === 4) {
      // SubWord only
      temp =
        (SBOX[(temp >>> 24) & 0xff] << 24) |
        (SBOX[(temp >>> 16) & 0xff] << 16) |
        (SBOX[(temp >>> 8) & 0xff] << 8) |
        SBOX[temp & 0xff];
    }
    W[i] = W[i - Nk] ^ temp;
  }

  return W;
}

// ----- AES single-block encryption (for CTR mode we only need encrypt) -----

function aesEncryptBlock(block: Uint8Array, roundKeys: Uint32Array): Uint8Array {
  const Nr = 14;
  // State as 4x4 column-major
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = block[i];

  // AddRoundKey (round 0)
  addRoundKey(s, roundKeys, 0);

  for (let round = 1; round <= Nr; round++) {
    subBytes(s);
    shiftRows(s);
    if (round < Nr) mixColumns(s);
    addRoundKey(s, roundKeys, round);
  }

  return s;
}

function addRoundKey(s: Uint8Array, W: Uint32Array, round: number): void {
  for (let c = 0; c < 4; c++) {
    const w = W[round * 4 + c];
    s[4 * c] ^= (w >>> 24) & 0xff;
    s[4 * c + 1] ^= (w >>> 16) & 0xff;
    s[4 * c + 2] ^= (w >>> 8) & 0xff;
    s[4 * c + 3] ^= w & 0xff;
  }
}

function subBytes(s: Uint8Array): void {
  for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];
}

function shiftRows(s: Uint8Array): void {
  // Row 1: shift left 1
  let t = s[1];
  s[1] = s[5];
  s[5] = s[9];
  s[9] = s[13];
  s[13] = t;
  // Row 2: shift left 2
  t = s[2];
  s[2] = s[10];
  s[10] = t;
  t = s[6];
  s[6] = s[14];
  s[14] = t;
  // Row 3: shift left 3 (= right 1)
  t = s[15];
  s[15] = s[11];
  s[11] = s[7];
  s[7] = s[3];
  s[3] = t;
}

function xtime(a: number): number {
  return (a << 1) ^ ((a & 0x80) !== 0 ? 0x1b : 0);
}

function mixColumns(s: Uint8Array): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = s[i],
      a1 = s[i + 1],
      a2 = s[i + 2],
      a3 = s[i + 3];
    const h = a0 ^ a1 ^ a2 ^ a3;
    s[i] ^= xtime(a0 ^ a1) ^ h;
    s[i + 1] ^= xtime(a1 ^ a2) ^ h;
    s[i + 2] ^= xtime(a2 ^ a3) ^ h;
    s[i + 3] ^= xtime(a3 ^ a0) ^ h;
  }
}

// ----- AES-256-CTR -----

/**
 * Increment a 16-byte big-endian counter in-place
 */
function incrementCounter(ctr: Uint8Array): void {
  for (let i = 15; i >= 0; i--) {
    ctr[i]++;
    if (ctr[i] !== 0) break; // no overflow
  }
}

/**
 * AES-256-CTR encrypt/decrypt (symmetric — same function for both)
 * @param data   plaintext or ciphertext bytes
 * @param key    32-byte key
 * @param iv     16-byte IV (used as initial counter value)
 */
function aesCtr(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  const roundKeys = expandKey256(key);
  const counter = new Uint8Array(iv); // copy — don't mutate caller's IV
  const output = new Uint8Array(data.length);

  const blockCount = Math.ceil(data.length / 16);
  for (let b = 0; b < blockCount; b++) {
    const keystreamBlock = aesEncryptBlock(counter, roundKeys);
    const offset = b * 16;
    const len = Math.min(16, data.length - offset);
    for (let i = 0; i < len; i++) {
      output[offset + i] = data[offset + i] ^ keystreamBlock[i];
    }
    incrementCounter(counter);
  }

  return output;
}

// ----- Public API -----

/**
 * Get or create the 256-bit encryption key for the accounts file.
 * The key lives in SecureStore (hardware-backed keychain).
 */
export async function getAccountsEncryptionKey(): Promise<Uint8Array> {
  let keyHex = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE);
  if (!keyHex) {
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    keyHex = bytesToHex(keyBytes);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE, keyHex);
    return keyBytes;
  }
  return hexToBytes(keyHex);
}

/**
 * Encrypt a plaintext string and return a base64-encoded result.
 * Format: base64( IV_16bytes || ciphertext )
 */
export async function encryptAccountsData(plaintext: string): Promise<string> {
  const key = await getAccountsEncryptionKey();
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  const plaintextBytes = stringToBytes(plaintext);
  const ciphertext = aesCtr(plaintextBytes, key, iv);

  // Prepend IV to ciphertext
  const combined = new Uint8Array(16 + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, 16);

  return bytesToBase64(combined);
}

/**
 * Decrypt a base64-encoded payload back to the original plaintext string.
 * Expects format: base64( IV_16bytes || ciphertext )
 */
export async function decryptAccountsData(encoded: string): Promise<string> {
  const key = await getAccountsEncryptionKey();
  const combined = base64ToBytes(encoded);

  if (combined.length < 16) {
    throw new Error('ACCOUNTS_CRYPTO_INVALID_DATA');
  }

  const iv = combined.slice(0, 16);
  const ciphertext = combined.slice(16);

  const plaintextBytes = aesCtr(ciphertext, key, iv);
  return bytesToString(plaintextBytes);
}

/**
 * Check whether a stored string looks like encrypted data (base64)
 * versus plaintext JSON (starts with '[' or '{').
 * Used for seamless migration from unencrypted to encrypted storage.
 */
export function isEncryptedData(data: string): boolean {
  const trimmed = data.trim();
  // Plaintext JSON always starts with [ or {
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return false;
  }
  // Base64 encoded data — try to validate it's valid base64
  try {
    atob(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete the encryption key from SecureStore (used during wallet clear/reset)
 */
export async function deleteAccountsEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORE);
}
