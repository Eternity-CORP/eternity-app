import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import {
  isDevModeEnabled,
  toggleDevMode,
  wipeKeychain,
  getDevModeInfo,
  isDevelopmentBuild,
} from '../services/devModeService';
import * as Updates from 'expo-updates';

type Props = NativeStackScreenProps<MainStackParamList, 'DevSettings'>;

export default function DevSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({
    platform: Platform.OS,
    hasWallet: false,
  });

  useEffect(() => {
    loadDevModeStatus();
  }, []);

  const loadDevModeStatus = async () => {
    try {
      const info = await getDevModeInfo();
      setDevMode(info.devMode);
      setInfo({
        platform: info.platform,
        hasWallet: info.hasWallet,
      });
    } catch (error) {
      console.error('Error loading dev mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDevMode = async () => {
    try {
      const newMode = await toggleDevMode();
      setDevMode(newMode);

      Alert.alert(
        'Dev Mode ' + (newMode ? 'Enabled' : 'Disabled'),
        newMode
          ? 'Development features are now available'
          : 'Development features are now hidden',
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle dev mode');
    }
  };

  const handleWipeKeychain = () => {
    Alert.alert(
      '⚠️ Factory Reset',
      'This will DELETE ALL DATA including:\n\n' +
        '• Seed phrase\n' +
        '• Private keys\n' +
        '• Wallet accounts\n' +
        '• All settings\n\n' +
        'This CANNOT be undone!\n\n' +
        'Are you absolutely sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'DELETE EVERYTHING',
          style: 'destructive',
          onPress: confirmWipe,
        },
      ],
    );
  };

  const confirmWipe = () => {
    Alert.alert(
      '🔴 Final Confirmation',
      'Last chance to cancel!\n\n' +
        'Type YES in your mind and press Delete to proceed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: performWipe,
        },
      ],
    );
  };

  const performWipe = async () => {
    try {
      await wipeKeychain();

      // Reload the app to return to onboarding
      if (__DEV__) {
        // In development, just show alert
        Alert.alert(
          '✅ Reset Complete',
          'All data has been wiped. Please reload the app (shake device → Reload) to see onboarding.',
          [{ text: 'OK' }],
        );
      } else {
        // In production, reload the app
        Alert.alert(
          '✅ Reset Complete',
          'App will reload now...',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (e) {
                  // Fallback: just navigate back
                  console.error('Reload failed:', e);
                }
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to wipe data. Please try again or reinstall the app.',
      );
      console.error('Wipe failed:', error);
    }
  };

  if (!isDevelopmentBuild()) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card>
          <Text style={[styles.warningText, { color: theme.colors.error }]}>
            ⚠️ Dev Settings are only available in development builds
          </Text>
        </Card>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Dev Mode Badge */}
      <Card style={styles.badge}>
        <View style={styles.badgeContent}>
          <Text style={styles.badgeEmoji}>👨‍💻</Text>
          <View>
            <Text style={[styles.badgeTitle, { color: theme.colors.text }]}>
              Developer Mode
            </Text>
            <Text style={[styles.badgeSubtitle, { color: theme.colors.muted }]}>
              Testing & Debug Tools
            </Text>
          </View>
        </View>
      </Card>

      {/* Dev Mode Toggle */}
      <Card>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              Enable Dev Mode
            </Text>
            <Text style={[styles.settingDescription, { color: theme.colors.muted }]}>
              Show development features and debug tools
            </Text>
          </View>
          <Switch
            value={devMode}
            onValueChange={handleToggleDevMode}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.card}
          />
        </View>
      </Card>

      {/* System Info */}
      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          System Information
        </Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.muted }]}>
            Platform:
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {info.platform}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.muted }]}>
            Build Type:
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            Development
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.muted }]}>
            Wallet:
          </Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {info.hasWallet ? '✓ Created' : '✗ Not created'}
          </Text>
        </View>
      </Card>

      {/* Danger Zone */}
      <Card style={[styles.dangerCard, { borderColor: theme.colors.error }]}>
        <Text style={[styles.dangerTitle, { color: theme.colors.error }]}>
          ⚠️ Danger Zone
        </Text>
        <Text style={[styles.dangerDescription, { color: theme.colors.muted }]}>
          These actions are destructive and cannot be undone
        </Text>

        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: theme.colors.error }]}
          onPress={handleWipeKeychain}
        >
          <Text style={styles.dangerButtonText}>🗑️ Factory Reset (Wipe Keychain)</Text>
        </TouchableOpacity>

        <Text style={[styles.dangerWarning, { color: theme.colors.muted }]}>
          This will delete all wallet data and return the app to first launch state.
          Perfect for testing onboarding flow.
        </Text>
      </Card>

      {/* Instructions */}
      <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Usage Instructions
        </Text>
        <Text style={[styles.instructionText, { color: theme.colors.muted }]}>
          • <Text style={{ fontWeight: 'bold' }}>Dev Mode:</Text> Enable to see
          additional debug information throughout the app
          {'\n\n'}• <Text style={{ fontWeight: 'bold' }}>Factory Reset:</Text> Use this
          to test the seed phrase creation and import flows. All data will be wiped.
          {'\n\n'}• <Text style={{ fontWeight: 'bold' }}>Production Builds:</Text> These
          settings will not appear in production builds
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  badge: {
    marginBottom: 16,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerCard: {
    borderWidth: 1,
    marginTop: 16,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerDescription: {
    fontSize: 12,
    marginBottom: 16,
  },
  dangerButton: {
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerWarning: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
