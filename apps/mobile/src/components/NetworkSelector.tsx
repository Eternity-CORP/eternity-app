/**
 * NetworkSelector Component
 * Allows user to select preferred network
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import {
  SUPPORTED_NETWORKS,
  NetworkId,
  NetworkConfig,
} from '@/src/constants/networks';

export interface Network {
  id: string;
  name: string;
  chainId: number;
  icon?: string;
  isTestnet?: boolean;
  color?: string;
}

// Testnet networks (not in SUPPORTED_NETWORKS)
const TESTNET_NETWORKS: Network[] = [
  { id: 'sepolia', name: 'Sepolia (Testnet)', chainId: 11155111, isTestnet: true },
];

// Convert supported networks to Network interface
function getNetworks(showTestnets: boolean): Network[] {
  const mainnetNetworks: Network[] = Object.values(SUPPORTED_NETWORKS).map(
    (config: NetworkConfig) => ({
      id: config.id,
      name: config.name,
      chainId: config.chainId,
      icon: config.iconUrl,
      isTestnet: false,
      color: config.color,
    })
  );

  if (showTestnets) {
    return [...mainnetNetworks, ...TESTNET_NETWORKS];
  }

  return mainnetNetworks;
}

interface Props {
  selectedNetworkId: string;
  onSelect: (network: Network) => void;
  showTestnets?: boolean;
}

export function NetworkSelector({
  selectedNetworkId,
  onSelect,
  showTestnets = false,
}: Props) {
  const networks = getNetworks(showTestnets);

  return (
    <View style={styles.container}>
      {networks.map((network) => (
        <TouchableOpacity
          key={network.id}
          style={[
            styles.networkItem,
            selectedNetworkId === network.id && styles.networkItemSelected,
          ]}
          onPress={() => onSelect(network)}
        >
          <View
            style={[
              styles.networkIcon,
              network.color
                ? { backgroundColor: network.color + '20' }
                : undefined,
            ]}
          >
            <FontAwesome
              name="globe"
              size={20}
              color={network.color || theme.colors.textPrimary}
            />
          </View>
          <View style={styles.networkInfo}>
            <Text style={[styles.networkName, theme.typography.body]}>
              {network.name}
            </Text>
            <Text
              style={[
                styles.networkChain,
                theme.typography.caption,
                { color: theme.colors.textTertiary },
              ]}
            >
              Chain ID: {network.chainId}
            </Text>
          </View>
          {selectedNetworkId === network.id && (
            <FontAwesome name="check" size={18} color={theme.colors.accent} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  networkItemSelected: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  networkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkInfo: { flex: 1 },
  networkName: { color: theme.colors.textPrimary, marginBottom: 2 },
  networkChain: {},
});
