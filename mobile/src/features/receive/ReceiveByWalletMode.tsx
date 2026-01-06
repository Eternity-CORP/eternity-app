/**
 * ReceiveByWalletMode - Show QR code and wallet address
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ethers } from 'ethers';
import { useTheme } from '../../context/ThemeContext';
import { getAddress } from '../../services/walletService';
import { getSelectedNetwork } from '../../services/networkService';
import NetworkSwitcher from '../network/NetworkSwitcher';
import type { Network } from '../../config/env';
import { SUPPORTED_CHAINS, getChainInfo } from '../../constants/chains';
import Card from '../../components/common/Card';
import { useNetwork } from '../../hooks/useNetwork';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';

interface Props {
  navigation: any;
}

export default function ReceiveByWalletMode({ navigation }: Props) {
  const { theme } = useTheme();
  const { network: currentNetwork, mode: currentMode } = useNetwork();
  const { activeWallets, primaryChainId, loading: prefsLoading } = useWalletPreferences();
  const [walletAddress, setWalletAddress] = useState('');
  const [checksummedAddress, setChecksummedAddress] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  // Set default selected chain to primary chain
  useEffect(() => {
    if (primaryChainId && !selectedChainId) {
      setSelectedChainId(primaryChainId);
    } else if (!primaryChainId && activeWallets.length > 0 && !selectedChainId) {
      setSelectedChainId(activeWallets[0].chainId);
    }
  }, [primaryChainId, activeWallets]);

  useEffect(() => {
    loadAddressAndNetwork();
  }, [currentNetwork, selectedChainId]);

  const loadAddressAndNetwork = async () => {
    try {
      const addr = await getAddress();
      if (!addr) return;

      const checksummed = ethers.utils.getAddress(addr);
      setWalletAddress(checksummed);
      setChecksummedAddress(checksummed);

      // Use selected chain ID or find from activeWallets
      if (selectedChainId) {
        const selectedWallet = activeWallets.find((w) => w.chainId === selectedChainId);
        if (selectedWallet) {
          const uri = `ethereum:${selectedWallet.address}`;
          setQrValue(uri);
        }
      } else {
        // Fallback to old logic if no chain selected yet
        const network = await getSelectedNetwork();
        const chain = SUPPORTED_CHAINS.find(
          (c) =>
            (c.testnet && c.chainId === 11155111 && network === 'sepolia') ||
            (c.testnet && c.chainId === 17000 && network === 'holesky') ||
            (!c.testnet && c.chainId === 1 && network === 'mainnet')
        );
        const chainId = chain?.chainId || 11155111;
        const uri = `ethereum:${checksummed}?chainId=${chainId}`;
        setQrValue(uri);
      }
    } catch (error) {
      console.error('Failed to load address:', error);
    }
  };

  const handleCopyAddress = async () => {
    try {
      const address = getSelectedWalletAddress();
      await Clipboard.setStringAsync(address);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleShare = async () => {
    try {
      const address = getSelectedWalletAddress();
      const networkName = getNetworkDisplayName();

      await Share.share({
        message: `My ${networkName} address: ${address}`,
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
    if (!selectedChainId) return 'Select Network';
    const chainInfo = getChainInfo(selectedChainId);
    return chainInfo ? chainInfo.name : selectedChainId.charAt(0).toUpperCase() + selectedChainId.slice(1);
  };

  const getSelectedWalletAddress = () => {
    if (!selectedChainId) return checksummedAddress;
    const wallet = activeWallets.find((w) => w.chainId === selectedChainId);
    return wallet ? wallet.address : checksummedAddress;
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Receiving Network</Text>
        <TouchableOpacity style={[styles.networkButton, { backgroundColor: theme.colors.surface }]} onPress={() => setShowNetworkSwitcher(true)}>
          <View style={styles.networkButtonContent}>
            <View style={[styles.networkIndicator, { backgroundColor: currentNetwork === 'mainnet' ? '#4CAF50' : '#FF9800' }]} />
            <Text style={[styles.networkText, { color: theme.colors.text }]}>{getNetworkDisplayName()}</Text>
            {currentNetwork === 'mainnet' && (
              <View style={[styles.liveBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                <Text style={[styles.liveBadgeText, { color: '#4CAF50' }]}>LIVE</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.warningBox, { backgroundColor: theme.colors.warning + '15', marginTop: 12 }]}>
          <Ionicons name="information-circle" size={16} color={theme.colors.warning} />
          <Text style={[styles.warningText, { color: theme.colors.warning }]}>
            Make sure the sender uses the same network. Tokens sent to a different network won't appear here.
          </Text>
        </View>
      </Card>

      {/* Active Networks Horizontal Scroll */}
      {activeWallets.length > 0 && (
        <View style={styles.networksContainer}>
          <Text style={[styles.networksTitle, { color: theme.colors.text }]}>
            Активные сети / Active Networks
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.networksScroll}
          >
            {activeWallets.map((wallet) => {
              const chainInfo = getChainInfo(wallet.chainId);
              const isSelected = wallet.chainId === selectedChainId;
              const isPrimary = wallet.chainId === primaryChainId;

              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.chainChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedChainId(wallet.chainId)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chainIcon}>{chainInfo?.icon || '🔗'}</Text>
                  <Text
                    style={[
                      styles.chainName,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {chainInfo?.name || wallet.chainId}
                  </Text>
                  {isPrimary && (
                    <Ionicons
                      name="star"
                      size={14}
                      color={isSelected ? '#FFD700' : theme.colors.warning}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
            {getSelectedWalletAddress()}
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
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  networkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    padding: 12,
  },
  networkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  networksContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  networksTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  networksScroll: {
    gap: 8,
    paddingRight: 16,
  },
  chainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  chainIcon: {
    fontSize: 16,
  },
  chainName: {
    fontSize: 12,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  qrBox: {
    padding: 20,
    borderRadius: 8,
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 14,
    marginTop: 12,
  },
  addressBox: {
    padding: 14,
    borderRadius: 6,
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
    padding: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 6,
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
