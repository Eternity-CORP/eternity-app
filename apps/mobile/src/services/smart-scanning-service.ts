/**
 * Smart Scanning Service
 * Periodically scans Tier 2 networks for token balances
 * and notifies users about tokens that could be bridged
 */

import { JsonRpcProvider, formatUnits } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TIER2_NETWORKS, SUPPORTED_NETWORKS, type NetworkId, type Tier2NetworkKey } from '../constants/networks';

// Storage keys
const STORAGE_PREFIX = '@smart_scanning:';
const LAST_SCAN_KEY = `${STORAGE_PREFIX}lastScanTimestamp`;
const DISMISSED_ALERTS_KEY = `${STORAGE_PREFIX}dismissedAlerts`;
const SNOOZED_ALERTS_KEY = `${STORAGE_PREFIX}snoozedAlerts`;

// In-memory cache for sync access
let cachedLastScan: number | null = null;
let cachedDismissed: Record<string, number> | null = null;
let cachedSnoozed: Record<string, number> | null = null;

// Scan interval: 24 hours
const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Snooze duration: 7 days
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Minimum balance to report (in USD)
const MIN_BALANCE_USD = 1;

// Common token addresses on Tier 2 networks
const TIER2_TOKEN_ADDRESSES: Record<string, Record<string, { address: string; decimals: number; symbol: string }>> = {
  bsc: {
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, symbol: 'ETH' },
  },
  avalanche: {
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, symbol: 'USDT' },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, symbol: 'WETH' },
  },
  zksync: {
    USDC: { address: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C', decimals: 6, symbol: 'USDT' },
  },
};

// ERC20 balance ABI
const ERC20_BALANCE_ABI = ['function balanceOf(address) view returns (uint256)'];

/**
 * Token balance found on a Tier 2 network
 */
export interface Tier2TokenBalance {
  networkId: string;
  networkName: string;
  networkColor: string;
  networkIcon: string;
  tokenSymbol: string;
  balance: string;
  balanceFormatted: string;
  estimatedUsdValue: number;
}

/**
 * Scan result with all found balances
 */
export interface ScanResult {
  timestamp: number;
  balances: Tier2TokenBalance[];
  totalUsdValue: number;
}

/**
 * Alert state for a specific token on a network
 */
export interface AlertState {
  networkId: string;
  tokenSymbol: string;
  dismissedAt?: number;
  snoozedUntil?: number;
}

/**
 * Initialize cache from storage (call on app start)
 */
export async function initScanningCache(): Promise<void> {
  try {
    const [lastScanStr, dismissedStr, snoozedStr] = await AsyncStorage.multiGet([
      LAST_SCAN_KEY,
      DISMISSED_ALERTS_KEY,
      SNOOZED_ALERTS_KEY,
    ]);
    cachedLastScan = lastScanStr[1] ? parseInt(lastScanStr[1], 10) : 0;
    cachedDismissed = dismissedStr[1] ? JSON.parse(dismissedStr[1]) : {};
    cachedSnoozed = snoozedStr[1] ? JSON.parse(snoozedStr[1]) : {};
  } catch (error) {
    console.warn('Failed to init scanning cache:', error);
    cachedLastScan = 0;
    cachedDismissed = {};
    cachedSnoozed = {};
  }
}

/**
 * Get last scan timestamp
 */
export function getLastScanTimestamp(): number {
  return cachedLastScan || 0;
}

/**
 * Check if a scan is needed
 */
export function shouldScan(): boolean {
  const lastScan = getLastScanTimestamp();
  return Date.now() - lastScan > SCAN_INTERVAL_MS;
}

/**
 * Get dismissed alerts
 */
function getDismissedAlerts(): Record<string, number> {
  return cachedDismissed || {};
}

/**
 * Get snoozed alerts
 */
function getSnoozedAlerts(): Record<string, number> {
  return cachedSnoozed || {};
}

/**
 * Generate alert key
 */
function getAlertKey(networkId: string, tokenSymbol: string): string {
  return `${networkId}:${tokenSymbol}`;
}

/**
 * Check if an alert is dismissed
 */
export function isAlertDismissed(networkId: string, tokenSymbol: string): boolean {
  const dismissed = getDismissedAlerts();
  return !!dismissed[getAlertKey(networkId, tokenSymbol)];
}

/**
 * Check if an alert is snoozed
 */
export function isAlertSnoozed(networkId: string, tokenSymbol: string): boolean {
  const snoozed = getSnoozedAlerts();
  const snoozedUntil = snoozed[getAlertKey(networkId, tokenSymbol)];
  if (!snoozedUntil) return false;
  return Date.now() < snoozedUntil;
}

/**
 * Dismiss an alert permanently
 */
export async function dismissAlert(networkId: string, tokenSymbol: string): Promise<void> {
  const dismissed = getDismissedAlerts();
  dismissed[getAlertKey(networkId, tokenSymbol)] = Date.now();
  cachedDismissed = dismissed;
  await AsyncStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(dismissed));
}

/**
 * Snooze an alert for a week
 */
export async function snoozeAlert(networkId: string, tokenSymbol: string): Promise<void> {
  const snoozed = getSnoozedAlerts();
  snoozed[getAlertKey(networkId, tokenSymbol)] = Date.now() + SNOOZE_DURATION_MS;
  cachedSnoozed = snoozed;
  await AsyncStorage.setItem(SNOOZED_ALERTS_KEY, JSON.stringify(snoozed));
}

/**
 * Clear all dismissed/snoozed alerts
 */
export async function clearAlertStates(): Promise<void> {
  cachedDismissed = {};
  cachedSnoozed = {};
  await AsyncStorage.multiRemove([DISMISSED_ALERTS_KEY, SNOOZED_ALERTS_KEY]);
}

/**
 * Fetch native token balance on a Tier 2 network
 */
async function fetchNativeBalance(
  provider: JsonRpcProvider,
  address: string,
  networkId: string
): Promise<Tier2TokenBalance | null> {
  try {
    const network = TIER2_NETWORKS[networkId as Tier2NetworkKey];
    if (!network) return null;

    const balance = await provider.getBalance(address);
    const formatted = formatUnits(balance, network.nativeCurrency.decimals);
    const balanceNum = parseFloat(formatted);

    if (balanceNum < 0.0001) return null;

    // Rough USD estimate (would need price feed in production)
    const estimatedUsd = balanceNum * (network.nativeCurrency.symbol === 'ETH' ? 3000 : 1);

    if (estimatedUsd < MIN_BALANCE_USD) return null;

    return {
      networkId,
      networkName: network.name,
      networkColor: network.color,
      networkIcon: network.iconUrl,
      tokenSymbol: network.nativeCurrency.symbol,
      balance: balance.toString(),
      balanceFormatted: `${balanceNum.toFixed(4)} ${network.nativeCurrency.symbol}`,
      estimatedUsdValue: estimatedUsd,
    };
  } catch (error) {
    console.warn(`Failed to fetch native balance on ${networkId}:`, error);
    return null;
  }
}

/**
 * Fetch ERC20 token balance on a Tier 2 network
 */
async function fetchTokenBalance(
  provider: JsonRpcProvider,
  address: string,
  networkId: string,
  tokenInfo: { address: string; decimals: number; symbol: string }
): Promise<Tier2TokenBalance | null> {
  try {
    const network = TIER2_NETWORKS[networkId as Tier2NetworkKey];
    if (!network) return null;

    const { ethers } = await import('ethers');
    const contract = new ethers.Contract(tokenInfo.address, ERC20_BALANCE_ABI, provider);
    const balance = await contract.balanceOf(address);
    const formatted = formatUnits(balance, tokenInfo.decimals);
    const balanceNum = parseFloat(formatted);

    if (balanceNum < 0.01) return null;

    // Rough USD estimate (stablecoins = 1:1)
    const estimatedUsd = tokenInfo.symbol.includes('USD') ? balanceNum : balanceNum * 3000;

    if (estimatedUsd < MIN_BALANCE_USD) return null;

    return {
      networkId,
      networkName: network.name,
      networkColor: network.color,
      networkIcon: network.iconUrl,
      tokenSymbol: tokenInfo.symbol,
      balance: balance.toString(),
      balanceFormatted: `${balanceNum.toFixed(2)} ${tokenInfo.symbol}`,
      estimatedUsdValue: estimatedUsd,
    };
  } catch (error) {
    console.warn(`Failed to fetch ${tokenInfo.symbol} balance on ${networkId}:`, error);
    return null;
  }
}

/**
 * Scan all Tier 2 networks for balances
 */
export async function scanTier2Networks(walletAddress: string): Promise<ScanResult> {
  const balances: Tier2TokenBalance[] = [];
  let totalUsdValue = 0;

  for (const [networkId, network] of Object.entries(TIER2_NETWORKS)) {
    try {
      const provider = new JsonRpcProvider(network.rpcUrlTemplate);

      // Fetch native token balance
      const nativeBalance = await fetchNativeBalance(provider, walletAddress, networkId);
      if (nativeBalance && !isAlertDismissed(networkId, nativeBalance.tokenSymbol) && !isAlertSnoozed(networkId, nativeBalance.tokenSymbol)) {
        balances.push(nativeBalance);
        totalUsdValue += nativeBalance.estimatedUsdValue;
      }

      // Fetch ERC20 token balances
      const tokens = TIER2_TOKEN_ADDRESSES[networkId] || {};
      for (const [symbol, tokenInfo] of Object.entries(tokens)) {
        const tokenBalance = await fetchTokenBalance(provider, walletAddress, networkId, tokenInfo);
        if (tokenBalance && !isAlertDismissed(networkId, symbol) && !isAlertSnoozed(networkId, symbol)) {
          balances.push(tokenBalance);
          totalUsdValue += tokenBalance.estimatedUsdValue;
        }
      }
    } catch (error) {
      console.warn(`Failed to scan network ${networkId}:`, error);
    }
  }

  // Update last scan timestamp
  cachedLastScan = Date.now();
  await AsyncStorage.setItem(LAST_SCAN_KEY, String(cachedLastScan));

  return {
    timestamp: Date.now(),
    balances,
    totalUsdValue,
  };
}

/**
 * Get suggested bridge destination for a token
 */
export function getSuggestedBridgeDestination(tokenSymbol: string): NetworkId {
  // Suggest the cheapest network for the token
  if (tokenSymbol === 'USDC' || tokenSymbol === 'USDT') {
    return 'arbitrum'; // Low fees for stablecoins
  }
  if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
    return 'base'; // Low fees for ETH
  }
  return 'polygon'; // Default to Polygon for low fees
}

/**
 * Get network display info for bridge destination
 */
export function getBridgeDestinationInfo(networkId: NetworkId): { name: string; color: string } {
  const network = SUPPORTED_NETWORKS[networkId];
  return {
    name: network?.name || networkId,
    color: network?.color || '#888888',
  };
}
