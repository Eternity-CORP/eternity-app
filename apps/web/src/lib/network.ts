import type { AccountType } from '@e-y/shared'
import { buildNetworks, type SimpleNetworkConfig } from '@e-y/shared'

export type NetworkConfig = SimpleNetworkConfig

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

const NETWORKS = buildNetworks(ALCHEMY_KEY)

export function getNetwork(type: AccountType): NetworkConfig {
  return NETWORKS[type]
}
