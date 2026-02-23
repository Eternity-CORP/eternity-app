/**
 * Web Routing Service
 * Determines the optimal transfer route: direct, bridge, or consolidation.
 * Uses shared determineSendRoute for the decision engine, then fetches
 * bridge quotes locally when needed.
 */

import {
  type NetworkId,
  type AggregatedTokenBalance,
  NETWORK_TO_CHAIN_ID,
  SUPPORTED_NETWORKS,
  fetchBridgeQuote,
  checkBridgeCostLevel,
  formatBridgeTime,
  getTokenAddressForNetwork,
  determineSendRoute,
  parseTokenAmount,
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
 * Uses shared determineSendRoute for the pure decision logic, then
 * fetches bridge quotes only when the route requires bridging.
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
  // Use shared decision engine
  const route = determineSendRoute({
    aggregatedBalances,
    symbol,
    amount,
    recipientPreferredNetwork,
  })

  const upperSymbol = route.symbol

  // Insufficient — return immediately
  if (route.type === 'insufficient') {
    return {
      type: 'insufficient',
      fromNetwork: (route.fromNetwork as NetworkId) || 'ethereum',
      toNetwork: (route.toNetwork as NetworkId) || recipientPreferredNetwork || 'ethereum',
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '',
      message: route.message,
    }
  }

  // Direct — return immediately (no bridge quote needed)
  if (route.type === 'direct') {
    const networkName = SUPPORTED_NETWORKS[route.fromNetwork as NetworkId]?.name || route.fromNetwork
    return {
      type: 'direct',
      fromNetwork: route.fromNetwork as NetworkId,
      toNetwork: route.toNetwork as NetworkId,
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '~15 sec',
      message: `Direct transfer on ${networkName}`,
    }
  }

  // Consolidation — return without bridge quotes (caller handles)
  if (route.type === 'consolidation') {
    return {
      type: 'consolidation',
      fromNetwork: route.fromNetwork as NetworkId,
      toNetwork: route.toNetwork as NetworkId,
      amount,
      symbol: upperSymbol,
      bridgeQuote: null,
      costLevel: 'none',
      estimatedTime: '',
      message: route.message,
    }
  }

  // Bridge — fetch bridge quote
  const sourceNetwork = route.fromNetwork as NetworkId
  const targetNetwork = route.toNetwork as NetworkId

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

  const tokenData = aggregatedBalances.find((t) => t.symbol.toUpperCase() === upperSymbol)
  const decimals = tokenData?.decimals || 18
  const rawAmount = parseTokenAmount(amount, decimals)

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

  const amountUsd = parseFloat(amount) * (tokenData?.totalUsdValue || 0) / parseFloat(tokenData?.totalBalance || '1')
  const costLevel = checkBridgeCostLevel(amountUsd, quote.totalFeeUsd)
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
