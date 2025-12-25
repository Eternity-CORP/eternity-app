import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import SafeScreen from '../components/common/SafeScreen';
import { isDevelopmentBuild } from '../services/devModeService';
import NetworkSwitcher from '../features/network/NetworkSwitcher';
import { getSelectedNetwork } from '../services/networkService';
import { getNetworkMode, setNetworkMode, getModeDisplayInfo, type NetworkMode } from '../services/networkModeService';
import type { Network } from '../config/env';
import NetworkModeSwitcher from '../features/network/NetworkModeSwitcher';

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { theme, mode, toggleMode } = useTheme();
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  const [showModeSwitcher, setShowModeSwitcher] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');
  const [currentMode, setCurrentMode] = useState<NetworkMode>('demo');

  useEffect(() => {
    setShowDevSettings(isDevelopmentBuild());
    loadCurrentNetwork();
    loadCurrentMode();
  }, []);

  const loadCurrentMode = async () => {
    const mode = await getNetworkMode();
    setCurrentMode(mode);
  };

  const handleModeSwitcherClose = () => {
    setShowModeSwitcher(false);
    loadCurrentMode();
    loadCurrentNetwork();
  };

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
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Settings */}
        <Card blur>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="moon" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Appearance</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>Dark Mode</Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleMode}
              trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Security Settings */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SecuritySettings')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.success}20` }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Security</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>PIN & Biometrics</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Privacy Center */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivacyCenter')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.secondary}20` }]}>
                <Ionicons name="eye-off" size={20} color={theme.colors.secondary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Privacy Center</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>Telemetry & risk warnings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Notification Settings */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationSettings')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.error}20` }]}>
                <Ionicons name="notifications" size={20} color={theme.colors.error} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Notifications</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>Privacy-first notifications</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Language Settings */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('LanguageSettings')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
                <Ionicons name="globe" size={20} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Language</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>App language and formats</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Wallet Settings Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, { color: theme.colors.muted }]}>
            НАСТРОЙКИ КОШЕЛЬКА / WALLET SETTINGS
          </Text>
        </View>

        {/* Manage Networks */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageNetworks')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="layers" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Управление сетями / Manage Networks
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>
                  Включить/отключить сети
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Token Chain Preferences */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageTokenPreferences')}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.secondary}20` }]}>
                <Ionicons name="swap-horizontal" size={20} color={theme.colors.secondary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  Предпочтения токенов / Token Preferences
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>
                  Выбрать сети для токенов
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Wallet Mode */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => setShowModeSwitcher(true)}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: currentMode === 'live' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)' }]}>
                <Ionicons 
                  name={currentMode === 'live' ? 'wallet' : 'flask'} 
                  size={20} 
                  color={currentMode === 'live' ? '#4CAF50' : '#FF9800'} 
                />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Wallet Mode</Text>
                <Text style={[styles.settingSubtitle, { color: currentMode === 'live' ? '#4CAF50' : '#FF9800' }]}>
                  {currentMode === 'live' ? 'Live Mode — Real Money' : 'Demo Mode — Test Tokens'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Network Settings */}
        <Card blur style={styles.cardSpacing}>
          <TouchableOpacity
            onPress={() => setShowNetworkSwitcher(true)}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Ionicons name="git-network" size={20} color={theme.colors.warning} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Network</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>{getNetworkDisplayName(currentNetwork)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Dev Settings (only in development builds) */}
        {showDevSettings && (
          <Card style={styles.cardSpacing}>
            <TouchableOpacity
              onPress={() => navigation.navigate('DevSettings')}
              style={styles.settingRow}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.muted}20` }]}>
                  <Ionicons name="code-slash" size={20} color={theme.colors.muted} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Developer Settings</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.muted }]}>Testing & Debug Tools</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.colors.muted }]}>Eternity Wallet v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Network Switcher Modal */}
      <NetworkSwitcher
        visible={showNetworkSwitcher}
        onClose={handleNetworkSwitcherClose}
        mode={currentMode}
      />

      {/* Network Mode Switcher Modal */}
      <NetworkModeSwitcher
        visible={showModeSwitcher}
        onClose={handleModeSwitcherClose}
        currentMode={currentMode}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardSpacing: {
    marginTop: 12,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 13,
  },
});
