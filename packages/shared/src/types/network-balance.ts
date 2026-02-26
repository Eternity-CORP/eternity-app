/**
 * Network Balance Types + Aggregation
 * Pure types and functions — no platform or ethers dependencies.
 */

import type { NetworkId } from '../config/multi-network';

/**
 * Add two decimal number strings with BigInt precision.
 * Handles different decimal lengths correctly (e.g. "1.5" + "2.33" = "3.83").
 */
function addDecimalStrings(a: string, b: string): string {
  if (a === '0' || a === '') return b || '0';
  if (b === '0' || b === '') return a || '0';

  const [aWhole = '0', aFrac = ''] = a.split('.');
  const [bWhole = '0', bFrac = ''] = b.split('.');

  const maxFracLen = Math.max(aFrac.length, bFrac.length);
  if (maxFracLen === 0) {
    return (BigInt(aWhole) + BigInt(bWhole)).toString();
  }

  // Pad fractional parts to equal length and combine into integers
  const aInt = BigInt(aWhole + aFrac.padEnd(maxFracLen, '0'));
  const bInt = BigInt(bWhole + bFrac.padEnd(maxFracLen, '0'));
  const sum = aInt + bInt;

  const sumStr = sum.toString();
  if (sumStr.length <= maxFracLen) {
    // Result is less than 1 — pad with leading zeros
    const frac = sumStr.padStart(maxFracLen, '0').replace(/0+$/, '');
    return frac ? `0.${frac}` : '0';
  }

  const wholePart = sumStr.slice(0, sumStr.length - maxFracLen);
  const fracPart = sumStr.slice(sumStr.length - maxFracLen).replace(/0+$/, '');
  return fracPart ? `${wholePart}.${fracPart}` : wholePart;
}

/**
 * Balance for a single token on a single network
 */
export interface NetworkTokenBalance {
  networkId: NetworkId | string;
  contractAddress: string; // 'native' for native currency
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  iconUrl?: string;
}

/**
 * Aggregated balance for a token across all networks
 */
export interface AggregatedTokenBalance {
  symbol: string;
  name: string;
  totalBalance: string;
  totalUsdValue: number;
  decimals: number;
  iconUrl?: string;
  networks: {
    networkId: NetworkId | string;
    balance: string;
    balanceRaw: string;
    usdValue: number;
    contractAddress: string;
  }[];
}

/**
 * Result of multi-network balance fetch
 */
export interface MultiNetworkBalanceResult {
  aggregatedBalances: AggregatedTokenBalance[];
  totalUsdValue: number;
  networkBalances: Record<string, NetworkTokenBalance[]>;
  failedNetworks: string[];
  lastUpdated: number;
}

/**
 * Aggregate balances by token symbol across networks
 */
export function aggregateBalances(
  networkBalances: Record<string, NetworkTokenBalance[]>,
): AggregatedTokenBalance[] {
  const aggregated: Record<string, AggregatedTokenBalance> = {};

  for (const [networkId, balances] of Object.entries(networkBalances)) {
    for (const balance of balances) {
      const key = balance.symbol.toUpperCase();

      if (!aggregated[key]) {
        aggregated[key] = {
          symbol: balance.symbol,
          name: balance.name,
          totalBalance: '0',
          totalUsdValue: 0,
          decimals: balance.decimals,
          iconUrl: balance.iconUrl,
          networks: [],
        };
      }

      aggregated[key].networks.push({
        networkId,
        balance: balance.balance,
        balanceRaw: balance.balanceRaw,
        usdValue: balance.usdValue,
        contractAddress: balance.contractAddress,
      });

      aggregated[key].totalUsdValue += balance.usdValue;

      if (!aggregated[key].iconUrl && balance.iconUrl) {
        aggregated[key].iconUrl = balance.iconUrl;
      }
    }
  }

  // Accumulate totalBalance using string-based decimal addition to avoid float drift
  for (const token of Object.values(aggregated)) {
    let totalStr = '0';
    for (const network of token.networks) {
      totalStr = addDecimalStrings(totalStr, network.balance);
    }
    token.totalBalance = totalStr;
  }

  return Object.values(aggregated).sort((a, b) => b.totalUsdValue - a.totalUsdValue);
}

/**
 * Find the network with the highest balance for a token
 */
export function getBestNetworkForToken(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
): { networkId: NetworkId; balance: string } | null {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!token || token.networks.length === 0) return null;

  const best = token.networks.reduce((prev, current) =>
    parseFloat(current.balance) > parseFloat(prev.balance) ? current : prev,
  );

  return { networkId: best.networkId as NetworkId, balance: best.balance };
}

/**
 * Find networks that can fulfill an amount requirement
 */
export function findNetworksWithSufficientBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string,
): NetworkId[] {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!token) return [];

  const requiredAmount = parseFloat(amount);
  return token.networks
    .filter((n) => parseFloat(n.balance) >= requiredAmount)
    .map((n) => n.networkId as NetworkId);
}
