import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_TOKEN_PREFS_KEY } from '../../config/env';
import type { TokenInfo } from '../../constants/tokens';

export interface TokenPreferences {
  visibleSymbols: string[]; // e.g., ['ETH', 'USDC', 'DAI']
  customTokens: TokenInfo[]; // user-added tokens
}

const DEFAULT_PREFS: TokenPreferences = {
  visibleSymbols: ['ETH', 'USDC', 'USDT', 'DAI'],
  customTokens: [],
};

export async function getTokenPreferences(): Promise<TokenPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_TOKEN_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as TokenPreferences;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveTokenPreferences(prefs: TokenPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_TOKEN_PREFS_KEY, JSON.stringify(prefs));
}

export async function toggleTokenVisibility(symbol: string): Promise<TokenPreferences> {
  const prefs = await getTokenPreferences();
  const vs = new Set(prefs.visibleSymbols);
  if (vs.has(symbol)) vs.delete(symbol); else vs.add(symbol);
  const updated = { ...prefs, visibleSymbols: Array.from(vs) };
  await saveTokenPreferences(updated);
  return updated;
}

export async function addCustomToken(token: TokenInfo): Promise<TokenPreferences> {
  const prefs = await getTokenPreferences();
  const exists = prefs.customTokens.find(t => t.address.toLowerCase() === token.address.toLowerCase());
  const updated = exists ? prefs : { ...prefs, customTokens: [...prefs.customTokens, token] };
  await saveTokenPreferences(updated);
  return updated;
}

export async function removeCustomToken(address: string): Promise<TokenPreferences> {
  const prefs = await getTokenPreferences();
  const updated = { ...prefs, customTokens: prefs.customTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase()) };
  await saveTokenPreferences(updated);
  return updated;
}
