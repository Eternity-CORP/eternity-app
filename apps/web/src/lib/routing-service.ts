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
  getRouteEstimatedTime,
  type BridgeQuoteResult,
  type RoutingResult,
} from '@e-y/shared'

export type { RoutingResult }

/**
 * Format seconds into a human-readable estimated time string.
 */
function formatEstimatedSeconds(seconds: number): string {
  if (seconds <= 0) return '~15 sec'
  if (seconds < 60) return `~${seconds} sec`
  return `~${Math.ceil(seconds / 60)} min`
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
      fromNetwork: route.fromNetwork,
      toNetwork: route.toNetwork,
      amount,
      symbol: upperSymbol,
      costLevel: 'none',
      estimatedTime: '',
      message: route.message,
      canSend: false,
      needsBridge: false,
    }
  }

  // Direct — return immediately (no bridge quote needed)
  if (route.type === 'direct') {
    const networkName = SUPPORTED_NETWORKS[route.fromNetwork]?.name || route.fromNetwork
    const directSeconds = getRouteEstimatedTime({ type: 'direct', fromNetwork: route.fromNetwork, toNetwork: route.toNetwork })
    return {
      type: 'direct',
      fromNetwork: route.fromNetwork,
      toNetwork: route.toNetwork,
      amount,
      symbol: upperSymbol,
      costLevel: 'none',
      estimatedTime: formatEstimatedSeconds(directSeconds),
      message: `Direct transfer on ${networkName}`,
      canSend: true,
      needsBridge: false,
    }
  }

  // Consolidation — return without bridge quotes (caller handles)
  if (route.type === 'consolidation') {
    return {
      type: 'consolidation',
      fromNetwork: route.fromNetwork,
      toNetwork: route.toNetwork,
      amount,
      symbol: upperSymbol,
      costLevel: 'none',
      estimatedTime: '',
      message: route.message,
      canSend: true,
      needsBridge: true,
    }
  }

  // Bridge — fetch bridge quote
  const sourceNetwork = route.fromNetwork
  const targetNetwork = route.toNetwork

  const fromTokenAddress = getTokenAddressForBridge(upperSymbol, sourceNetwork)
  const toTokenAddress = getTokenAddressForBridge(upperSymbol, targetNetwork)

  if (!fromTokenAddress || !toTokenAddress) {
    // Token not available on one of the networks — fall back to direct on source
    const fallbackSeconds = getRouteEstimatedTime({ type: 'direct', fromNetwork: sourceNetwork, toNetwork: sourceNetwork })
    return {
      type: 'direct',
      fromNetwork: sourceNetwork,
      toNetwork: sourceNetwork,
      amount,
      symbol: upperSymbol,
      costLevel: 'none',
      estimatedTime: formatEstimatedSeconds(fallbackSeconds),
      message: `Direct transfer on ${SUPPORTED_NETWORKS[sourceNetwork].name} (token not bridgeable)`,
      canSend: true,
      needsBridge: false,
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
    const noBridgeSeconds = getRouteEstimatedTime({ type: 'direct', fromNetwork: sourceNetwork, toNetwork: sourceNetwork })
    return {
      type: 'direct',
      fromNetwork: sourceNetwork,
      toNetwork: sourceNetwork,
      amount,
      symbol: upperSymbol,
      costLevel: 'none',
      estimatedTime: formatEstimatedSeconds(noBridgeSeconds),
      message: `Direct transfer on ${SUPPORTED_NETWORKS[sourceNetwork].name} (bridge unavailable)`,
      canSend: true,
      needsBridge: false,
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
    bridgeFeeUsd: quote.totalFeeUsd,
    costLevel,
    estimatedTime,
    message: `Bridge from ${SUPPORTED_NETWORKS[sourceNetwork].name} to ${SUPPORTED_NETWORKS[targetNetwork].name}`,
    canSend: true,
    needsBridge: true,
  }
}

function getTokenAddressForBridge(symbol: string, networkId: NetworkId): string | null {
  const addr = getTokenAddressForNetwork(symbol, networkId)
  // Return null if the address is just the symbol (meaning not found)
  if (addr === symbol.toUpperCase()) return null
  return addr
}
