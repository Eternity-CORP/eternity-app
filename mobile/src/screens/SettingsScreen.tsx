import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import { isDevelopmentBuild } from '../services/devModeService';
import NetworkSwitcher from '../features/network/NetworkSwitcher';
import { getSelectedNetwork } from '../services/networkService';
import type { Network } from '../config/env';

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { theme, mode, toggleMode } = useTheme();
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

  useEffect(() => {
    setShowDevSettings(isDevelopmentBuild());
    loadCurrentNetwork();
  }, []);

  const loadCurrentNetwork = async () => {
    const network = await getSelectedNetwork();
    setCurrentNetwork(network);
  };

  const handleNetworkSwitcherClose = () => {
    setShowNetworkSwitcher(false);
    loadCurrentNetwork(); // Refresh network display after closing
  };

  const getNetworkDisplayName = (network: Network) => {
    switch (network) {
      case 'mainnet': return 'Ethereum Mainnet';
      case 'sepolia': return 'Sepolia Testnet';
      case 'holesky': return 'Holesky Testnet';
      default: return network;
    }
  };

  const getNetworkEmoji = (network: Network) => {
    switch (network) {
      case 'mainnet': return '🌐';
      case 'sepolia': return '🧪';
      case 'holesky': return '🔬';
      default: return '🔗';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Appearance Settings */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>Appearance</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Light/Dark Mode</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleMode}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        </View>
      </Card>

      {/* Security Settings */}
      <Card style={{ marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SecuritySettings')}
          style={styles.devSettingsButton}
        >
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
              🔒 Security
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              PIN & Biometrics
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Privacy Center */}
      <Card style={{ marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PrivacyCenter')}
          style={styles.devSettingsButton}
        >
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
              🛡️ Privacy Center
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Telemetry opt-in & risk warnings
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Notification Settings */}
      <Card style={{ marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationSettings')}
          style={styles.devSettingsButton}
        >
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
              🔔 Notifications
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Privacy-first notification settings
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Language Settings */}
      <Card style={{ marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('LanguageSettings')}
          style={styles.devSettingsButton}
        >
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
              🌍 Language
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              App language and formats
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Network Settings */}
      <Card style={{ marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => setShowNetworkSwitcher(true)}
          style={styles.devSettingsButton}
        >
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
              {getNetworkEmoji(currentNetwork)} Network
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {getNetworkDisplayName(currentNetwork)}
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Dev Settings (only in development builds) */}
      {showDevSettings && (
        <Card style={{ marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DevSettings')}
            style={styles.devSettingsButton}
          >
            <View>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                👨‍💻 Developer Settings
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Testing & Debug Tools
              </Text>
            </View>
            <Text style={{ color: theme.colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Network Switcher Modal */}
      <NetworkSwitcher
        visible={showNetworkSwitcher}
        onClose={handleNetworkSwitcherClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  devSettingsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
