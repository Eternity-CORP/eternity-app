import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../navigation/MainNavigator';
import { getAddress } from '../services/walletService';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ethers } from 'ethers';
import { getSelectedNetwork } from '../services/networkService';
import NetworkSwitcher from '../features/network/NetworkSwitcher';
import type { Network } from '../config/env';
import { SUPPORTED_CHAINS } from '../constants/chains';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';

type Props = NativeStackScreenProps<MainStackParamList, 'Receive'>;

export default function ReceiveScreen({ navigation }: Props) {
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Receive</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>NETWORK</Text>
          <TouchableOpacity
            style={[styles.networkButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowNetworkSwitcher(true)}
          >
            <Text style={[styles.networkText, { color: theme.colors.text }]}>{getNetworkDisplayName()}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderRadius: 8 }]}>
            {qrValue ? (
              <QRCode value={qrValue} size={180} backgroundColor="#FFFFFF" color="#000000" />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>QR Code</Text>
              </View>
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>YOUR ADDRESS</Text>
          <View style={[styles.addressBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.addressText, { color: theme.colors.text }]} numberOfLines={1}>
              {checksummedAddress}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCopyAddress}
            >
              <Ionicons name="copy-outline" size={18} color={theme.colors.background} />
              <Text style={[styles.actionButtonText, { color: theme.colors.background }]}>COPY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>SHARE</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>HOW TO RECEIVE</Text>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            1. Share your address or QR code
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            2. Ensure correct network is selected
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            3. Wait for confirmation
          </Text>
        </Card>
      </View>

      <NetworkSwitcher
        visible={showNetworkSwitcher}
        onClose={handleNetworkChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  networkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  networkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#999',
  },
  addressBox: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 6,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 20,
  },
});
