import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { getAddress } from '../services/walletService';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ethers } from 'ethers';
import { getSelectedNetwork } from '../services/networkService';
import NetworkSwitcher from '../features/network/NetworkSwitcher';
import type { Network } from '../config/env';
import { SUPPORTED_CHAINS } from '../constants/chains';

type Props = NativeStackScreenProps<MainStackParamList, 'Receive'>;

export default function ReceiveScreen({ navigation }: Props) {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');
  const [walletAddress, setWalletAddress] = useState('');
  const [checksummedAddress, setChecksummedAddress] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  useEffect(() => {
    loadAddressAndNetwork();
  }, []);

  const loadAddressAndNetwork = async () => {
    try {
      const addr = await getAddress();
      if (!addr) return;

      // Apply EIP-55 checksum
      const checksummed = ethers.utils.getAddress(addr);
      setWalletAddress(checksummed);
      setChecksummedAddress(checksummed);

      // Get current network
      const network = await getSelectedNetwork();
      setCurrentNetwork(network);

      // Get chainId for current network
      const chain = SUPPORTED_CHAINS.find(c =>
        (c.testnet && c.chainId === 11155111 && network === 'sepolia') ||
        (c.testnet && c.chainId === 17000 && network === 'holesky') ||
        (!c.testnet && c.chainId === 1 && network === 'mainnet')
      );

      const chainId = chain?.chainId || 11155111;

      // Create ethereum URI for QR code (EIP-681)
      const uri = `ethereum:${checksummed}?chainId=${chainId}`;
      setQrValue(uri);
    } catch (error) {
      console.error('Failed to load address:', error);
    }
  };

  const handleCopyAddress = async () => {
    try {
      await Clipboard.setStringAsync(checksummedAddress);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleShare = async () => {
    try {
      const networkName = SUPPORTED_CHAINS.find(c =>
        (c.testnet && c.chainId === 11155111 && currentNetwork === 'sepolia') ||
        (c.testnet && c.chainId === 17000 && currentNetwork === 'holesky') ||
        (!c.testnet && c.chainId === 1 && currentNetwork === 'mainnet')
      )?.name || 'Ethereum';

      await Share.share({
        message: `My ${networkName} address: ${checksummedAddress}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleNetworkChange = () => {
    setShowNetworkSwitcher(false);
    loadAddressAndNetwork(); // Reload after network change
  };

  const getNetworkDisplayName = () => {
    const chain = SUPPORTED_CHAINS.find(c =>
      (c.testnet && c.chainId === 11155111 && currentNetwork === 'sepolia') ||
      (c.testnet && c.chainId === 17000 && currentNetwork === 'holesky') ||
      (!c.testnet && c.chainId === 1 && currentNetwork === 'mainnet')
    );
    return chain?.name || 'Unknown Network';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.networkSelector}>
          <Text style={styles.label}>Select Network</Text>
          <TouchableOpacity
            style={styles.networkButton}
            onPress={() => setShowNetworkSwitcher(true)}
          >
            <Text style={styles.networkText}>{getNetworkDisplayName()}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qrContainer}>
          {qrValue ? (
            <QRCode value={qrValue} size={200} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>QR Code</Text>
              <Text style={styles.qrPlaceholderSubtext}>Address not loaded</Text>
            </View>
          )}
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.label}>Your Address (EIP-55)</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressText} numberOfLines={1}>
              {checksummedAddress}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopyAddress}
          >
            <Text style={styles.actionButtonText}>📋 Copy Address</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Text style={styles.actionButtonText}>📤 Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ How to receive</Text>
          <Text style={styles.infoText}>
            1. Share your address or QR code with the sender
          </Text>
          <Text style={styles.infoText}>
            2. Make sure they select the correct network
          </Text>
          <Text style={styles.infoText}>
            3. Wait for the transaction to be confirmed
          </Text>
        </View>
      </View>

      {/* Network Switcher Modal */}
      <NetworkSwitcher
        visible={showNetworkSwitcher}
        onClose={handleNetworkChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  networkSelector: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  networkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  networkText: {
    fontSize: 16,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  qrPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
  },
  addressContainer: {
    marginBottom: 24,
  },
  addressBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
    lineHeight: 20,
  },
});
