/**
 * Network Settings Screen
 * Allows user to select preferred network and toggle testnet visibility
 */

import { StyleSheet, View, Text, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NetworkSelector,
  type Network,
} from '@/src/components/NetworkSelector';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';

const NETWORK_PREFS_KEY = '@ey_network_prefs';

interface NetworkPreferences {
  selectedNetwork: string;
  showTestnets: boolean;
}

export default function NetworkSettingsScreen() {
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [showTestnets, setShowTestnets] = useState(false);

  useEffect(() => {
    // Load saved preferences
    AsyncStorage.getItem(NETWORK_PREFS_KEY).then((stored) => {
      if (stored) {
        try {
          const prefs: NetworkPreferences = JSON.parse(stored);
          if (prefs.selectedNetwork) setSelectedNetwork(prefs.selectedNetwork);
          if (prefs.showTestnets !== undefined)
            setShowTestnets(prefs.showTestnets);
        } catch {
          // Invalid JSON, ignore
        }
      }
    });
  }, []);

  const savePreferences = async (prefs: NetworkPreferences) => {
    await AsyncStorage.setItem(NETWORK_PREFS_KEY, JSON.stringify(prefs));
  };

  const handleNetworkSelect = async (network: Network) => {
    setSelectedNetwork(network.id);
    await savePreferences({
      selectedNetwork: network.id,
      showTestnets,
    });
  };

  const handleTestnetToggle = async (value: boolean) => {
    setShowTestnets(value);
    // If hiding testnets and a testnet is selected, switch to ethereum
    const newSelectedNetwork =
      !value && selectedNetwork === 'sepolia' ? 'ethereum' : selectedNetwork;
    if (newSelectedNetwork !== selectedNetwork) {
      setSelectedNetwork(newSelectedNetwork);
    }
    await savePreferences({
      selectedNetwork: newSelectedNetwork,
      showTestnets: value,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Networks" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, theme.typography.heading]}>
            Preferred Network
          </Text>
          <Text
            style={[
              styles.sectionDesc,
              theme.typography.caption,
              { color: theme.colors.textSecondary },
            ]}
          >
            Select your default network for transactions
          </Text>

          <NetworkSelector
            selectedNetworkId={selectedNetwork}
            onSelect={handleNetworkSelect}
            showTestnets={showTestnets}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, theme.typography.body]}>
              Show Testnets
            </Text>
            <Text
              style={[
                styles.toggleDesc,
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Display test networks for development
            </Text>
          </View>
          <Switch
            value={showTestnets}
            onValueChange={handleTestnetToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent + '50',
            }}
            thumbColor={
              showTestnets ? theme.colors.accent : theme.colors.textTertiary
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  container: { padding: theme.spacing.xl },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDesc: { marginBottom: theme.spacing.lg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: theme.colors.textPrimary, marginBottom: 2 },
  toggleDesc: {},
});
