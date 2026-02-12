/**
 * Web Routing Service
 * Determines the optimal transfer route: direct, bridge, or consolidation.
 * Uses shared bridge API for quotes, local logic for route selection.
 */

import {
  type NetworkId,
  type AggregatedTokenBalance,
  NETWORK_TO_CHAIN_ID,
  SUPPORTED_NETWORKS,
  findNetworksWithSufficientBalance,
  fetchBridgeQuote,
  checkBridgeCostLevel,
  formatBridgeTime,
  getCheapestNetwork,
  getTokenAddressForNetwork,
  type BridgeQuoteResult,
  type BridgeCostLevel,
} from '@e-y/shared'

export type RouteType = 'direct' | 'bridge' | 'consolidation' | 'insufficient'

export interface RoutingResult {
  type: RouteType
  fromNetwork: NetworkId
  toNetwork: NetworkId
  amount: string
  symbol: string
  bridgeQuote: BridgeQuoteResult | null
  costLevel: BridgeCostLevel
  estimatedTime: string
  gasSavings?: string
  message: string
}

/**
 * Calculate optimal transfer route.
 *
 * @param aggregatedBalances - Token balances across all networks
 * @param symbol - Token symbol to send
 * @param amount - Amount to send (human-readable)
 * @param recipientPreferredNetwork - Recipient's preferred network (from preferences), null = any
 * @param fromAddress - Sender address
 * @param toAddress - Recipient address
 */
export async function calculateTransferRoute(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string,
  recipientPreferredNetwork: NetworkId | null,
  fromAddress: string,
  toAddress: string,
): Promise<RoutingResult> {
  const upperSymbol = symbol.toUpperCase()
  const amountNum = parseFloat(amount)

  // Find networks where sender has enough balance
  const sufficientNetworks = findNetworksWithSufficientBalance(
    aggregatedBalances,
    upperSymbol,
    amount,
  ) as NetworkId[]

  if (sufficientNetworks.length === 0) {
    return {
      type: 'insufficient',
      fromNetwork: 'ethereum',
      toNetwork: recipientPreferredNetwork || 'ethereum',
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '',
      message: 'Insufficient balance on any single network',
    }
  }

  // Target network: recipient preference or cheapest available
  const targetNetwork = recipientPreferredNetwork || (getCheapestNetwork(sufficientNetworks) as NetworkId)

  // Can sender send directly on the target network?
  if (sufficientNetworks.includes(targetNetwork)) {
    return {
      type: 'direct',
      fromNetwork: targetNetwork,
      toNetwork: targetNetwork,
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '~15 sec',
      message: `Direct transfer on ${SUPPORTED_NETWORKS[targetNetwork].name}`,
    }
  }

  // Need a bridge: pick cheapest source network
  const sourceNetwork = getCheapestNetwork(sufficientNetworks) as NetworkId

  // Get token addresses for bridge
  const fromTokenAddress = getTokenAddressForBridge(upperSymbol, sourceNetwork)
  const toTokenAddress = getTokenAddressForBridge(upperSymbol, targetNetwork)

  if (!fromTokenAddress || !toTokenAddress) {
    // Token not available on one of the networks — fall back to direct on source
    return {
      type: 'direct',
      fromNetwork: sourceNetwork,
      toNetwork: sourceNetwork,
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '~15 sec',
      message: `Direct transfer on ${SUPPORTED_NETWORKS[sourceNetwork].name} (token not bridgeable)`,
    }
  }

  // Fetch bridge quote
  const tokenData = aggregatedBalances.find((t) => t.symbol.toUpperCase() === upperSymbol)
  const decimals = tokenData?.decimals || 18
  const rawAmount = BigInt(Math.floor(amountNum * 10 ** decimals)).toString()

  const quote = await fetchBridgeQuote({
    fromChainId: NETWORK_TO_CHAIN_ID[sourceNetwork],
    toChainId: NETWORK_TO_CHAIN_ID[targetNetwork],
    fromToken: fromTokenAddress,
    toToken: toTokenAddress,
    fromAmount: rawAmount,
    fromAddress,
    toAddress,
  })

  if (!quote) {
    // Bridge unavailable — direct on source
    return {
      type: 'direct',
      fromNetwork: sourceNetwork,
      toNetwork: sourceNetwork,
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '~15 sec',
      message: `Direct transfer on ${SUPPORTED_NETWORKS[sourceNetwork].name} (bridge unavailable)`,
    }
  }

  const costLevel = checkBridgeCostLevel(amountNum * (tokenData?.totalUsdValue || 0) / parseFloat(tokenData?.totalBalance || '1'), quote.totalFeeUsd)
  const estimatedTime = formatBridgeTime(quote.estimatedTime)

  return {
    type: 'bridge',
    fromNetwork: sourceNetwork,
    toNetwork: targetNetwork,
    amount,
    symbol: upperSymbol,
    bridgeQuote: quote,
    costLevel,
    estimatedTime,
    message: `Bridge from ${SUPPORTED_NETWORKS[sourceNetwork].name} to ${SUPPORTED_NETWORKS[targetNetwork].name}`,
  }
}

function getTokenAddressForBridge(symbol: string, networkId: NetworkId): string | null {
  const addr = getTokenAddressForNetwork(symbol, networkId)
  // Return null if the address is just the symbol (meaning not found)
  if (addr === symbol.toUpperCase()) return null
  return addr
}
