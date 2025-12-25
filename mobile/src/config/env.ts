// Centralized environment config for client-side usage
// Expo exposes only EXPO_PUBLIC_* env vars at runtime

export type Network = 'mainnet' | 'sepolia' | 'holesky';

function getEnv(name: string, fallback = ''): string {
  const v = process.env[name];
  return v == null ? fallback : v;
}

// Default network from env (falls back to 'sepolia')
const DEFAULT_NETWORK_RAW = getEnv('EXPO_PUBLIC_DEFAULT_NETWORK', 'sepolia').toLowerCase();
export const DEFAULT_NETWORK: Network =
  DEFAULT_NETWORK_RAW === 'mainnet' ? 'mainnet' :
  DEFAULT_NETWORK_RAW === 'holesky' ? 'holesky' :
  'sepolia';

// Provider URLs (prefer Alchemy/Infura envs)
export const ALCHEMY_MAINNET_URL = getEnv('EXPO_PUBLIC_ALCHEMY_MAINNET_URL');
export const ALCHEMY_SEPOLIA_URL = getEnv('EXPO_PUBLIC_ALCHEMY_SEPOLIA_URL');
export const ALCHEMY_HOLESKY_URL = getEnv('EXPO_PUBLIC_ALCHEMY_HOLESKY_URL');
export const INFURA_MAINNET_URL = getEnv('EXPO_PUBLIC_INFURA_MAINNET_URL');
export const INFURA_SEPOLIA_URL = getEnv('EXPO_PUBLIC_INFURA_SEPOLIA_URL');
export const INFURA_HOLESKY_URL = getEnv('EXPO_PUBLIC_INFURA_HOLESKY_URL');

// Public fallbacks (configurable via env) - using mobile-friendly endpoints
// NOTE: PublicNode blocks React Native with 403 "unsupported platform" - avoid using them!
// NOTE: Ankr requires API keys for some networks and may return 403 - use as last resort only
export const PUBLIC_MAINNET_URL = getEnv('EXPO_PUBLIC_PUBLIC_MAINNET_URL', 'https://eth.llamarpc.com');
// Default to Ethereum Foundation RPC for Sepolia (reliable, no API key needed)
export const PUBLIC_SEPOLIA_URL = getEnv('EXPO_PUBLIC_PUBLIC_SEPOLIA_URL', 'https://rpc.sepolia.org');
// Holesky: use dRPC (reliable, no API key, mobile-friendly)
export const PUBLIC_HOLESKY_URL = getEnv('EXPO_PUBLIC_PUBLIC_HOLESKY_URL', 'https://holesky.drpc.org');

// Storage keys (not secrets; identifiers for SecureStore/localStorage)
export const STORAGE_SEED_KEY = getEnv('EXPO_PUBLIC_STORAGE_SEED_KEY', 'eternity-wallet-seed');
export const STORAGE_PRIVATE_KEY = getEnv('EXPO_PUBLIC_STORAGE_PRIVATE_KEY', 'eternity-wallet-privatekey');
export const STORAGE_ENC_KEY_KEY = getEnv('EXPO_PUBLIC_STORAGE_ENC_KEY_KEY', 'eternity-wallet-key');
export const STORAGE_WALLET_META_KEY = getEnv('EXPO_PUBLIC_STORAGE_WALLET_META_KEY', 'eternity-wallet-meta');
export const STORAGE_TOKEN_PREFS_KEY = getEnv('EXPO_PUBLIC_STORAGE_TOKEN_PREFS_KEY', 'eternity-wallet-token-prefs');
export const ETHERSCAN_API_KEY = getEnv('EXPO_PUBLIC_ETHERSCAN_API_KEY', '');
export const ANKR_API_KEY = getEnv('EXPO_PUBLIC_ANKR_API_KEY', '8adb0802c0c0cf371a8375fc69dc8f6a0ee106fed39304410f59ea28f243e28c');
export const API_BASE_URL = getEnv('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:3000');