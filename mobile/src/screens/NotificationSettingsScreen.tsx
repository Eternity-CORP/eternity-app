/**
 * Notification Settings Screen
 * [EYP-M1-NOT-001] Privacy-first notification settings UI
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/common/Card';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getNotificationSettings,
  saveNotificationSettings,
  setNotificationsEnabled,
  setEventTypeEnabled,
  setShowAmounts,
  setShowAddresses,
  updateSilentMode,
  setDeliveryFrequency,
} from '../services/notificationSettingsService';
import {
  requestNotificationPermissions,
  hasNotificationPermissions,
  sendNotification,
} from '../services/notificationService';
import { NotificationSettings, NotificationEventType, NOTIFICATION_EVENT_LABELS } from '../types/notifications';

type Props = NativeStackScreenProps<MainStackParamList, 'NotificationSettings'>;

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    const s = await getNotificationSettings();
    setSettings(s);
  };

  const checkPermissions = async () => {
    const perm = await hasNotificationPermissions();
    setHasPermissions(perm);
  };

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermissions(granted);

    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleMaster = async (value: boolean) => {
    if (value && !hasPermissions) {
      await handleRequestPermissions();
      if (!hasPermissions) {
        return; // Don't enable if permissions not granted
      }
    }

    await setNotificationsEnabled(value);
    await loadSettings();
  };

  const handleToggleEventType = async (eventType: NotificationEventType, value: boolean) => {
    await setEventTypeEnabled(eventType, value);
    await loadSettings();
  };

  const handleToggleShowAmounts = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Privacy Warning',
        'Enabling this will show transaction amounts in notifications, which may be visible to others.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            style: 'destructive',
            onPress: async () => {
              await setShowAmounts(value);
              await loadSettings();
            },
          },
        ]
      );
    } else {
      await setShowAmounts(value);
      await loadSettings();
    }
  };

  const handleToggleShowAddresses = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Privacy Warning',
        'Enabling this will show wallet addresses in notifications, which may be visible to others.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            style: 'destructive',
            onPress: async () => {
              await setShowAddresses(value);
              await loadSettings();
            },
          },
        ]
      );
    } else {
      await setShowAddresses(value);
      await loadSettings();
    }
  };

  const handleToggleSilentMode = async (value: boolean) => {
    await updateSilentMode(value);
    await loadSettings();
  };

  const handleStartTimeChange = async (event: any, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate && settings) {
      const hour = selectedDate.getHours();
      await updateSilentMode(settings.silentMode.enabled, hour, undefined);
      await loadSettings();
    }
  };

  const handleEndTimeChange = async (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate && settings) {
      const hour = selectedDate.getHours();
      await updateSilentMode(settings.silentMode.enabled, undefined, hour);
      await loadSettings();
    }
  };

  const handleToggleFrequency = async (freq: 'instant' | 'batched') => {
    await setDeliveryFrequency(freq);
    await loadSettings();
  };

  const handleTestNotification = async () => {
    await sendNotification({
      type: NotificationEventType.SECURITY_ALERT,
      title: 'Test Notification',
      body: 'This is a test notification from Eternity Wallet',
      data: { screen: 'NotificationSettings' },
    });

    Alert.alert('Test Sent', 'Check if you received the notification');
  };

  if (!settings) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        {/* Header */}
        <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: 60, paddingBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 24, fontFamily: theme.typography.fontFamilies.bold }}>
                Notifications
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>
                Privacy-first notification settings
              </Text>
            </View>
          </View>
        </View>

        {/* OS Permissions Warning */}
        {!hasPermissions && (
          <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TouchableOpacity
              onPress={handleRequestPermissions}
              style={{
                backgroundColor: theme.colors.warning + '20',
                padding: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Ionicons name="alert-circle" size={24} color={theme.colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.warning, fontWeight: '600', marginBottom: 4 }}>
                  Permissions Required
                </Text>
                <Text style={{ color: theme.colors.warning, fontSize: 12 }}>
                  Tap to enable notifications in device settings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.warning} />
            </TouchableOpacity>
          </View>
        )}

        {/* Master Switch */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                  Enable Notifications
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>
                  Master switch for all notifications
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleMaster}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        </View>

        {/* Event Types */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold, marginBottom: theme.spacing.md }}>
              Event Types
            </Text>

            {Object.values(NotificationEventType).map((eventType) => {
              const label = NOTIFICATION_EVENT_LABELS[eventType];
              return (
                <View
                  key={eventType}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surface,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                      {label.title}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                      {label.description}
                    </Text>
                  </View>
                  <Switch
                    value={settings.eventTypes[eventType]}
                    onValueChange={(value) => handleToggleEventType(eventType, value)}
                    trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                    thumbColor="#fff"
                    disabled={!settings.enabled}
                  />
                </View>
              );
            })}
          </Card>
        </View>

        {/* Privacy Settings */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md }}>
              <Ionicons name="eye-off" size={20} color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                Privacy (PII)
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                  Show Amounts
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  Display transaction amounts in notifications
                </Text>
              </View>
              <Switch
                value={settings.showAmounts}
                onValueChange={handleToggleShowAmounts}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                thumbColor="#fff"
                disabled={!settings.enabled}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.surface,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                  Show Addresses
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  Display wallet addresses in notifications
                </Text>
              </View>
              <Switch
                value={settings.showAddresses}
                onValueChange={handleToggleShowAddresses}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                thumbColor="#fff"
                disabled={!settings.enabled}
              />
            </View>

            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                padding: 12,
                borderRadius: 8,
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Ionicons name="information-circle" size={16} color={theme.colors.warning} />
              <Text style={{ color: theme.colors.warning, fontSize: 12, flex: 1 }}>
                Default: OFF. Sensitive data hidden for privacy. Enable only if needed.
              </Text>
            </View>
          </Card>
        </View>

        {/* Silent Mode */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md }}>
              <Ionicons name="moon" size={20} color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>
                Do Not Disturb
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                  Enable Silent Hours
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  No notifications during specified hours
                </Text>
              </View>
              <Switch
                value={settings.silentMode.enabled}
                onValueChange={handleToggleSilentMode}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                thumbColor="#fff"
                disabled={!settings.enabled}
              />
            </View>

            {settings.silentMode.enabled && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                    Start Time
                  </Text>
                  <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      {formatHour(settings.silentMode.startHour)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                    End Time
                  </Text>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      {formatHour(settings.silentMode.endHour)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    backgroundColor: theme.colors.primary + '10',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: theme.spacing.sm,
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 12, flex: 1 }}>
                    Security alerts will still come through during silent hours
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Delivery Frequency */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <Card>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold, marginBottom: theme.spacing.md }}>
              Delivery Frequency
            </Text>

            <TouchableOpacity
              onPress={() => handleToggleFrequency('instant')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              }}
              disabled={!settings.enabled}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                  Instant
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  Notifications arrive immediately
                </Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: settings.frequency === 'instant' ? theme.colors.primary : theme.colors.surface,
                  backgroundColor: settings.frequency === 'instant' ? theme.colors.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {settings.frequency === 'instant' && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleToggleFrequency('batched')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.surface,
              }}
              disabled={!settings.enabled}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>
                  Batched
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>
                  Notifications grouped hourly
                </Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: settings.frequency === 'batched' ? theme.colors.primary : theme.colors.surface,
                  backgroundColor: settings.frequency === 'batched' ? theme.colors.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {settings.frequency === 'batched' && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
                )}
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Test Notification */}
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <TouchableOpacity
            onPress={handleTestNotification}
            disabled={!settings.enabled || !hasPermissions}
            style={{
              backgroundColor: settings.enabled && hasPermissions ? theme.colors.primary : theme.colors.surface,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: settings.enabled && hasPermissions ? '#fff' : theme.colors.muted,
                fontWeight: '600',
                fontSize: 16,
              }}
            >
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={new Date(0, 0, 0, settings.silentMode.startHour, 0)}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={handleStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={new Date(0, 0, 0, settings.silentMode.endHour, 0)}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={handleEndTimeChange}
        />
      )}
    </View>
  );
}
