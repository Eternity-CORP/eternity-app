/**
 * ReceiveByWalletMode - Show QR code and wallet address
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ethers } from 'ethers';
import { useTheme } from '../../context/ThemeContext';
import { getAddress } from '../../services/walletService';
import { getSelectedNetwork } from '../../services/networkService';
import NetworkSwitcher from '../network/NetworkSwitcher';
import type { Network } from '../../config/env';
import { SUPPORTED_CHAINS } from '../../constants/chains';
import Card from '../../components/common/Card';

interface Props {
  navigation: any;
}

export default function ReceiveByWalletMode({ navigation }: Props) {
  const { theme } = useTheme();
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

      const checksummed = ethers.utils.getAddress(addr);
      setWalletAddress(checksummed);
      setChecksummedAddress(checksummed);

      const network = await getSelectedNetwork();
      setCurrentNetwork(network);

      const chain = SUPPORTED_CHAINS.find(
        (c) =>
          (c.testnet && c.chainId === 11155111 && network === 'sepolia') ||
          (c.testnet && c.chainId === 17000 && network === 'holesky') ||
          (!c.testnet && c.chainId === 1 && network === 'mainnet')
      );

      const chainId = chain?.chainId || 11155111;

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
      const networkName =
        SUPPORTED_CHAINS.find(
          (c) =>
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
    loadAddressAndNetwork();
  };

  const getNetworkDisplayName = () => {
    const chain = SUPPORTED_CHAINS.find(
      (c) =>
        (c.testnet && c.chainId === 11155111 && currentNetwork === 'sepolia') ||
        (c.testnet && c.chainId === 17000 && currentNetwork === 'holesky') ||
        (!c.testnet && c.chainId === 1 && currentNetwork === 'mainnet')
    );
    return chain?.name || 'Unknown Network';
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Network</Text>
        <TouchableOpacity style={[styles.networkButton, { backgroundColor: theme.colors.surface }]} onPress={() => setShowNetworkSwitcher(true)}>
          <Text style={[styles.networkText, { color: theme.colors.text }]}>{getNetworkDisplayName()}</Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <View style={styles.qrContainer}>
        {qrValue ? (
          <View style={[styles.qrBox, { backgroundColor: theme.colors.surface }]}>
            <QRCode value={qrValue} size={200} />
          </View>
        ) : (
          <View style={[styles.qrPlaceholder, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="qr-code-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.qrPlaceholderText, { color: theme.colors.textSecondary }]}>Loading QR Code...</Text>
          </View>
        )}
      </View>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Address (EIP-55)</Text>
        <View style={[styles.addressBox, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
            {checksummedAddress}
          </Text>
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCopyAddress}
          activeOpacity={0.8}
        >
          <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Copy Address</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>How to receive</Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            1. Share your address or QR code with the sender{'\n'}
            2. Make sure they select the correct network{'\n'}
            3. Wait for the transaction to be confirmed
          </Text>
        </View>
      </View>

      <NetworkSwitcher visible={showNetworkSwitcher} onClose={handleNetworkChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  networkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  networkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  qrBox: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 14,
    marginTop: 12,
  },
  addressBox: {
    padding: 16,
    borderRadius: 12,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
