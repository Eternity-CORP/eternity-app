import type { AccountType, NetworkId } from '@e-y/shared'
import {
  buildNetworks,
  buildMultiNetworkConfigs,
  getAccountNetworkMode,
  type SimpleNetworkConfig,
} from '@e-y/shared'
import { ALCHEMY_KEY } from './config'

export type NetworkConfig = SimpleNetworkConfig

const NETWORKS = buildNetworks(ALCHEMY_KEY)
const MULTI_NETWORKS = buildMultiNetworkConfigs(ALCHEMY_KEY)

/**
 * Get single-network config (for test accounts, or default for real).
 */
export function getNetwork(type: AccountType): NetworkConfig {
  return NETWORKS[type]
}

/**
 * Get all network configs for a real account.
 * Returns null for test (single-network mode).
 */
export function getMultiNetworkConfigs(type: AccountType): Record<NetworkId, NetworkConfig> | null {
  if (getAccountNetworkMode(type) !== 'multi') return null
  return MULTI_NETWORKS
}

/**
 * Get specific network config by NetworkId.
 */
export function getNetworkById(networkId: NetworkId): NetworkConfig {
  return MULTI_NETWORKS[networkId]
}
