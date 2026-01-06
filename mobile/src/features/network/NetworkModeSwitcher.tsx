import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type NetworkMode, setNetworkMode, getModeDisplayInfo } from '../../services/networkModeService';

interface NetworkModeSwitcherProps {
  visible: boolean;
  onClose: () => void;
  currentMode: NetworkMode;
}

export default function NetworkModeSwitcher({ visible, onClose, currentMode }: NetworkModeSwitcherProps) {
  const [switching, setSwitching] = useState(false);

  const handleModeSwitch = async (newMode: NetworkMode) => {
    if (newMode === currentMode) {
      onClose();
      return;
    }

    if (newMode === 'live') {
      Alert.alert(
        '⚠️ Switch to Live Mode?',
        'You are about to enable real transactions with real money.\n\n• All transactions will use real ETH/tokens\n• Test networks will be unavailable\n• You are responsible for any funds sent\n\nAre you sure you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable Live Mode',
            style: 'destructive',
            onPress: () => performSwitch(newMode),
          },
        ]
      );
    } else {
      performSwitch(newMode);
    }
  };

  const performSwitch = async (newMode: NetworkMode) => {
    try {
      setSwitching(true);
      await setNetworkMode(newMode);
      
      const info = getModeDisplayInfo(newMode);
      Alert.alert(
        `${info.title} Enabled`,
        info.subtitle,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to switch mode');
    } finally {
      setSwitching(false);
    }
  };

  const demoInfo = getModeDisplayInfo('demo');
  const liveInfo = getModeDisplayInfo('live');

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
            <Text style={styles.title}>Wallet Mode</Text>
            <TouchableOpacity onPress={onClose} disabled={switching}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Choose how you want to use your wallet
          </Text>

          {/* Demo Mode Option */}
          <TouchableOpacity
            style={[
              styles.modeItem,
              currentMode === 'demo' && styles.modeItemActive,
              { borderLeftColor: demoInfo.color },
            ]}
            onPress={() => handleModeSwitch('demo')}
            disabled={switching}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIcon, { backgroundColor: `${demoInfo.color}20` }]}>
              <Ionicons name="flask" size={28} color={demoInfo.color} />
            </View>
            <View style={styles.modeContent}>
              <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>{demoInfo.title}</Text>
                {currentMode === 'demo' && (
                  <View style={[styles.activeBadge, { backgroundColor: `${demoInfo.color}20` }]}>
                    <Text style={[styles.activeText, { color: demoInfo.color }]}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeSubtitle}>{demoInfo.subtitle}</Text>
              <View style={styles.features}>
                <Text style={styles.featureItem}>• Sepolia & Holesky testnets</Text>
                <Text style={styles.featureItem}>• Free test tokens from faucets</Text>
                <Text style={styles.featureItem}>• Safe to experiment</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Live Mode Option */}
          <TouchableOpacity
            style={[
              styles.modeItem,
              currentMode === 'live' && styles.modeItemActive,
              { borderLeftColor: liveInfo.color },
            ]}
            onPress={() => handleModeSwitch('live')}
            disabled={switching}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIcon, { backgroundColor: `${liveInfo.color}20` }]}>
              <Ionicons name="wallet" size={28} color={liveInfo.color} />
            </View>
            <View style={styles.modeContent}>
              <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>{liveInfo.title}</Text>
                {currentMode === 'live' && (
                  <View style={[styles.activeBadge, { backgroundColor: `${liveInfo.color}20` }]}>
                    <Text style={[styles.activeText, { color: liveInfo.color }]}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeSubtitle}>{liveInfo.subtitle}</Text>
              <View style={styles.features}>
                <Text style={styles.featureItem}>• Ethereum Mainnet only</Text>
                <Text style={styles.featureItem}>• Real ETH & tokens</Text>
                <Text style={styles.featureItem}>• Actual financial transactions</Text>
              </View>
            </View>
          </TouchableOpacity>

          {switching && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#29B6AF" />
              <Text style={styles.loadingText}>Switching mode...</Text>
            </View>
          )}

          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={20} color="#9aa0a6" />
            <Text style={styles.warningText}>
              Switching modes will change your available networks. Your wallet and keys remain the same.
            </Text>
          </View>
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 16,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  close: {
    color: '#aaa',
    fontSize: 24,
    fontWeight: '300',
  },
  description: {
    color: '#9aa0a6',
    fontSize: 14,
    marginBottom: 20,
  },
  modeItem: {
    backgroundColor: '#1A1D26',
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
  },
  modeItemActive: {
    backgroundColor: '#242936',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeContent: {
    flex: 1,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  modeSubtitle: {
    color: '#9aa0a6',
    fontSize: 13,
    marginBottom: 10,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  features: {
    gap: 4,
  },
  featureItem: {
    color: '#666',
    fontSize: 12,
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 13,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(154, 160, 166, 0.1)',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    gap: 10,
  },
  warningText: {
    color: '#9aa0a6',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
