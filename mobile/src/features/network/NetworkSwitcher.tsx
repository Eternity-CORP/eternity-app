import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { type Network } from '../../config/env';
import { getSelectedNetwork, setSelectedNetwork } from '../../services/networkService';
import { SUPPORTED_CHAINS } from '../../constants/chains';
import { getProviderWithFallback } from '../../services/blockchain/ethereumProvider';
import { type NetworkMode, isNetworkAvailable } from '../../services/networkModeService';

interface NetworkSwitcherProps {
  visible: boolean;
  onClose: () => void;
  mode?: NetworkMode;
}

interface NetworkInfo {
  network: Network;
  chainId: number;
  name: string;
  isTestnet: boolean;
  blockNumber?: number;
  status: 'idle' | 'loading' | 'success' | 'error';
}

export default function NetworkSwitcher({ visible, onClose, mode = 'demo' }: NetworkSwitcherProps) {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNetworks();
    }
  }, [visible]);

  const loadNetworks = async () => {
    try {
      const selected = await getSelectedNetwork();
      setCurrentNetwork(selected);

      // Initialize network info, filtered by mode
      const networkInfos: NetworkInfo[] = SUPPORTED_CHAINS
        .filter((chain) => {
          const network: Network = chain.testnet
            ? chain.chainId === 11155111
              ? 'sepolia'
              : 'holesky'
            : 'mainnet';
          return isNetworkAvailable(network, mode);
        })
        .map((chain) => ({
        network: chain.testnet
          ? chain.chainId === 11155111
            ? 'sepolia'
            : 'holesky'
          : 'mainnet',
        chainId: chain.chainId,
        name: chain.name,
        isTestnet: chain.testnet,
        status: 'idle',
      }));

      setNetworks(networkInfos);

      // Load block numbers for all networks
      for (const info of networkInfos) {
        loadNetworkStatus(info.network);
      }
    } catch (error) {
      console.error('Failed to load networks:', error);
      Alert.alert('Error', 'Failed to load network information');
    }
  };

  const loadNetworkStatus = async (network: Network) => {
    setNetworks((prev) =>
      prev.map((n) =>
        n.network === network ? { ...n, status: 'loading' } : n
      )
    );

    try {
      // Use fallback provider to automatically try alternative RPC endpoints
      const provider = await getProviderWithFallback(network);
      const blockNumber = await provider.getBlockNumber();

      setNetworks((prev) =>
        prev.map((n) =>
          n.network === network
            ? { ...n, blockNumber, status: 'success' }
            : n
        )
      );
    } catch (error: any) {
      console.error(`Failed to load status for ${network}:`, error?.message || error);
      setNetworks((prev) =>
        prev.map((n) =>
          n.network === network ? { ...n, status: 'error' } : n
        )
      );
    }
  };

  const handleNetworkSwitch = async (network: Network) => {
    if (network === currentNetwork) {
      onClose();
      return;
    }

    try {
      setSwitching(true);
      await setSelectedNetwork(network);
      setCurrentNetwork(network);

      Alert.alert(
        'Network Switched',
        `Successfully switched to ${networks.find((n) => n.network === network)?.name}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      Alert.alert('Switch Failed', error?.message || 'Unable to switch network');
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkColor = (network: Network) => {
    switch (network) {
      case 'mainnet':
        return '#29B6AF';
      case 'sepolia':
        return '#FF9800';
      case 'holesky':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const getStatusIndicator = (info: NetworkInfo) => {
    if (info.status === 'loading') {
      return <ActivityIndicator size="small" color="#999" />;
    }
    if (info.status === 'success') {
      return <Text style={styles.statusIcon}>●</Text>;
    }
    if (info.status === 'error') {
      return <Text style={[styles.statusIcon, styles.errorIcon]}>●</Text>;
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Select Network</Text>
            <TouchableOpacity onPress={onClose} disabled={switching}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.networkList}>
            {networks.map((info) => (
              <TouchableOpacity
                key={info.network}
                style={[
                  styles.networkItem,
                  currentNetwork === info.network && styles.networkItemActive,
                  { borderLeftColor: getNetworkColor(info.network) },
                ]}
                onPress={() => handleNetworkSwitch(info.network)}
                disabled={switching || info.status === 'error'}
                activeOpacity={0.7}
              >
                <View style={styles.networkInfo}>
                  <View style={styles.networkHeader}>
                    <Text style={styles.networkName}>{info.name}</Text>
                    {info.isTestnet && (
                      <View style={styles.testnetBadge}>
                        <Text style={styles.testnetText}>Testnet</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.networkDetails}>
                    <Text style={styles.chainId}>Chain ID: {info.chainId}</Text>
                    {info.blockNumber !== undefined && (
                      <Text style={styles.blockNumber}>
                        Block: {info.blockNumber.toLocaleString()}
                      </Text>
                    )}
                    {info.status === 'error' && (
                      <Text style={styles.errorText}>Connection failed</Text>
                    )}
                  </View>
                </View>

                <View style={styles.networkStatus}>
                  {currentNetwork === info.network && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                  {getStatusIndicator(info)}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {switching && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#29B6AF" />
              <Text style={styles.loadingText}>Switching network...</Text>
            </View>
          )}

          <Text style={styles.hint}>
            {mode === 'live' 
              ? 'You are in Live Mode — only mainnet is available'
              : 'You are in Demo Mode — only testnets are available'
            }
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B0E13',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    color: '#aaa',
    fontSize: 24,
    fontWeight: '300',
  },
  networkList: {
    marginBottom: 16,
  },
  networkItem: {
    backgroundColor: '#1A1D26',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  networkItemActive: {
    backgroundColor: '#242936',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  networkInfo: {
    flex: 1,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  testnetBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testnetText: {
    color: '#FF9800',
    fontSize: 10,
    fontWeight: '600',
  },
  networkDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chainId: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  blockNumber: {
    color: '#4CAF50',
    fontSize: 12,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
  },
  networkStatus: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: 'rgba(41, 182, 175, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeText: {
    color: '#29B6AF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusIcon: {
    fontSize: 12,
    color: '#4CAF50',
  },
  errorIcon: {
    color: '#F44336',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 19, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
