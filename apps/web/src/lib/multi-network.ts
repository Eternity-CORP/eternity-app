/**
 * Web Multi-Network Service
 * Fetches balances across all 5 supported networks using ethers + shared Alchemy/CoinGecko calls.
 */

import { JsonRpcProvider, formatEther } from 'ethers'
import {
  type NetworkId,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  buildMultiNetworkRpcUrls,
  type NetworkTokenBalance,
  type AggregatedTokenBalance,
  type MultiNetworkBalanceResult,
  aggregateBalances,
  fetchAlchemyTokenBalances,
  fetchAlchemyTokenMetadata,
  formatRawTokenBalance,
  fetchTokenPricesBySymbol,
  applyPricesToBalances,
  getTokenIconUrl,
  isSpamToken,
} from '@e-y/shared'
import { ALCHEMY_KEY } from './config'
const REQUEST_TIMEOUT = 15000

// Provider cache
const providers: Partial<Record<NetworkId, JsonRpcProvider>> = {}
const rpcUrls = buildMultiNetworkRpcUrls(ALCHEMY_KEY)

// Price cache (1 minute TTL)
let priceCache: { prices: Record<string, number>; timestamp: number } | null = null
const PRICE_CACHE_DURATION = 60_000

export function getProvider(networkId: NetworkId): JsonRpcProvider {
  if (!providers[networkId]) {
    providers[networkId] = new JsonRpcProvider(rpcUrls[networkId].rpcUrl)
  }
  return providers[networkId]!
}

async function fetchTokenPrices(symbols: string[]): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_DURATION) {
    return priceCache.prices
  }

  const prices = await fetchTokenPricesBySymbol(symbols)

  if (Object.keys(prices).length > 0) {
    priceCache = { prices, timestamp: Date.now() }
  }

  return priceCache?.prices || prices
}

async function fetchNativeBalance(
  address: string,
  networkId: NetworkId,
): Promise<NetworkTokenBalance | null> {
  try {
    const provider = getProvider(networkId)
    const network = SUPPORTED_NETWORKS[networkId]

    const balanceWei = await Promise.race([
      provider.getBalance(address),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), REQUEST_TIMEOUT),
      ),
    ])

    const balance = formatEther(balanceWei)

    return {
      networkId,
      contractAddress: 'native',
      symbol: network.nativeCurrency.symbol,
      name: network.nativeCurrency.name,
      balance: parseFloat(balance).toFixed(6),
      balanceRaw: balanceWei.toString(),
      decimals: network.nativeCurrency.decimals,
      usdValue: 0,
      iconUrl: network.iconUrl,
    }
  } catch (err) {
    console.error(`Failed to fetch native balance for ${networkId}:`, err)
    return null
  }
}

async function fetchNetworkBalances(
  address: string,
  networkId: NetworkId,
): Promise<NetworkTokenBalance[]> {
  const balances: NetworkTokenBalance[] = []
  const alchemyUrl = rpcUrls[networkId].alchemyUrl

  const [nativeBalance, tokenBalances] = await Promise.all([
    fetchNativeBalance(address, networkId),
    fetchAlchemyTokenBalances(alchemyUrl, address),
  ])

  if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
    balances.push(nativeBalance)
  }

  // Fetch metadata for each token
  const metadataPromises = tokenBalances.map((t) =>
    fetchAlchemyTokenMetadata(alchemyUrl, t.contractAddress),
  )
  const metadataResults = await Promise.all(metadataPromises)

  for (let i = 0; i < tokenBalances.length; i++) {
    const tokenData = tokenBalances[i]
    const metadata = metadataResults[i]
    if (!metadata) continue

    const balance = formatRawTokenBalance(tokenData.tokenBalance, metadata.decimals)
    if (parseFloat(balance) === 0) continue

    // Filter out spam/scam tokens
    if (isSpamToken(metadata.symbol, metadata.name, balance)) continue

    balances.push({
      networkId,
      contractAddress: tokenData.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance,
      balanceRaw: tokenData.tokenBalance,
      decimals: metadata.decimals,
      usdValue: 0,
      iconUrl: getTokenIconUrl(tokenData.contractAddress, metadata.symbol, networkId),
    })
  }

  return balances
}

/**
 * Fetch balances across all supported mainnet networks.
 * For 'test' accounts, only Sepolia is fetched (via single-network path).
 */
export async function fetchAllNetworkBalances(
  address: string,
  accountType: 'test' | 'real' | 'business',
): Promise<MultiNetworkBalanceResult> {
  // Test and business accounts: only Sepolia via the existing single-chain path
  const isTestnet = accountType === 'test' || accountType === 'business';
  const networksToFetch: NetworkId[] =
    isTestnet ? ['ethereum'] : [...TIER1_NETWORK_IDS]

  const networkBalances: Record<string, NetworkTokenBalance[]> = {}
  const failedNetworks: string[] = []

  const results = await Promise.allSettled(
    networksToFetch.map(async (networkId) => {
      // For test/business accounts, use Sepolia RPC instead
      if (isTestnet) {
        const sepoliaUrl = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        const provider = new JsonRpcProvider(sepoliaUrl)

        const balanceWei = await Promise.race([
          provider.getBalance(address),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT),
          ),
        ])

        const balance = formatEther(balanceWei)
        const balances: NetworkTokenBalance[] = []

        if (parseFloat(balance) > 0) {
          balances.push({
            networkId: 'ethereum',
            contractAddress: 'native',
            symbol: 'ETH',
            name: 'Ether',
            balance: parseFloat(balance).toFixed(6),
            balanceRaw: balanceWei.toString(),
            decimals: 18,
            usdValue: 0,
            iconUrl: SUPPORTED_NETWORKS.ethereum.iconUrl,
          })
        }

        return { networkId, balances }
      }

      const balances = await fetchNetworkBalances(address, networkId)
      return { networkId, balances }
    }),
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const networkId = networksToFetch[i]
    if (result.status === 'fulfilled') {
      networkBalances[result.value.networkId] = result.value.balances
    } else {
      failedNetworks.push(networkId)
      networkBalances[networkId] = []
    }
  }

  // Fetch prices
  const allSymbols = new Set<string>()
  for (const balances of Object.values(networkBalances)) {
    for (const b of balances) allSymbols.add(b.symbol.toUpperCase())
  }

  const prices = await fetchTokenPrices(Array.from(allSymbols))

  // Apply prices via shared helper
  for (const networkId of Object.keys(networkBalances)) {
    networkBalances[networkId] = applyPricesToBalances(networkBalances[networkId], prices)
  }

  const aggregatedBalances = aggregateBalances(networkBalances)
  const totalUsdValue = aggregatedBalances.reduce((sum, b) => sum + b.totalUsdValue, 0)

  return {
    aggregatedBalances,
    totalUsdValue,
    networkBalances,
    failedNetworks,
    lastUpdated: Date.now(),
  }
}
