/**
 * Scheduler Settings Screen
 * 
 * Configure background execution and view scheduler status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { getSchedulerManager } from '../SchedulerManager';
import { useScheduledPayments } from '../store/scheduledSlice';

export function SchedulerSettingsScreen() {
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [adapterName, setAdapterName] = useState('None');
  const [isLoading, setIsLoading] = useState(false);

  const scheduledCount = useScheduledPayments(
    (state) => state.getPaymentsByFilter({ status: 'scheduled' }).length
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const manager = getSchedulerManager();
    setBackgroundEnabled(manager.isBackgroundEnabled());
    setAdapterName(manager.getAdapterName());
  };

  const handleToggleBackground = async (value: boolean) => {
    setIsLoading(true);

    try {
      const manager = getSchedulerManager();
      await manager.setBackgroundEnabled(value);

      setBackgroundEnabled(value);
      setAdapterName(manager.getAdapterName());

      Alert.alert(
        'Success',
        value
          ? 'Background execution enabled'
          : 'Background execution disabled'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to update settings: ${(error as Error).message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTick = async () => {
    setIsLoading(true);

    try {
      const manager = getSchedulerManager();
      await manager.tick();

      Alert.alert('Success', 'Manual execution completed');
    } catch (error) {
      Alert.alert(
        'Error',
        `Manual execution failed: ${(error as Error).message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scheduler Settings</Text>
        <Text style={styles.subtitle}>
          Configure automatic payment execution
        </Text>
      </View>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Adapter:</Text>
          <Text style={styles.value}>{adapterName}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Scheduled Payments:</Text>
          <Text style={styles.value}>{scheduledCount}</Text>
        </View>
      </View>

      {/* Background Execution */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Background Execution</Text>
            <Text style={styles.settingDescription}>
              Allow payments to execute when app is closed
            </Text>
          </View>
          <Switch
            value={backgroundEnabled}
            onValueChange={handleToggleBackground}
            disabled={isLoading}
          />
        </View>
      </View>

      {/* Platform Limitations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Limitations</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>⚠️ Important</Text>
          <Text style={styles.infoText}>
            Background execution is subject to platform restrictions:
          </Text>

          {Platform.OS === 'ios' && (
            <>
              <Text style={styles.bulletPoint}>
                • iOS: Minimum 15-minute intervals
              </Text>
              <Text style={styles.bulletPoint}>
                • System decides when to run (not guaranteed)
              </Text>
              <Text style={styles.bulletPoint}>
                • May not run if battery is low
              </Text>
            </>
          )}

          {Platform.OS === 'android' && (
            <>
              <Text style={styles.bulletPoint}>
                • Android: Subject to Doze mode
              </Text>
              <Text style={styles.bulletPoint}>
                • May be delayed or skipped
              </Text>
              <Text style={styles.bulletPoint}>
                • Requires battery optimization disabled
              </Text>
            </>
          )}

          <Text style={[styles.infoText, { marginTop: 12 }]}>
            For critical payments, we recommend keeping the app open or
            checking manually.
          </Text>
        </View>
      </View>

      {/* SLA Notice */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Level</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Best Effort:</Text> We cannot guarantee
            exact execution times. Payments may be delayed by:
          </Text>

          <Text style={styles.bulletPoint}>• Platform restrictions</Text>
          <Text style={styles.bulletPoint}>• Network conditions</Text>
          <Text style={styles.bulletPoint}>• Device state (battery, etc.)</Text>

          <Text style={[styles.infoText, { marginTop: 12 }]}>
            <Text style={styles.bold}>Recommendation:</Text> Schedule payments
            with buffer time and monitor execution.
          </Text>
        </View>
      </View>

      {/* Manual Trigger */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleManualTick}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Executing...' : 'Execute Now (Manual)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Manually check and execute due payments
        </Text>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Background Enabled:</Text>
          </Text>
          <Text style={styles.bulletPoint}>
            • App checks for due payments every ~20 minutes
          </Text>
          <Text style={styles.bulletPoint}>
            • Works even when app is closed
          </Text>
          <Text style={styles.bulletPoint}>
            • Subject to platform restrictions
          </Text>

          <Text style={[styles.infoText, { marginTop: 12 }]}>
            <Text style={styles.bold}>Background Disabled:</Text>
          </Text>
          <Text style={styles.bulletPoint}>
            • Checks only when app is opened
          </Text>
          <Text style={styles.bulletPoint}>
            • More reliable but requires app usage
          </Text>
          <Text style={styles.bulletPoint}>
            • No battery impact when closed
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    marginTop: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
