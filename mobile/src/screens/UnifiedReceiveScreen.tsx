/**
 * UnifiedReceiveScreen - All-in-one receive interface with tabs
 *
 * Two modes:
 * 1. Wallet - Show QR code and address to receive directly
 * 2. BLIK - Create BLIK payment code for one-time payment
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MainStackParamList } from '../navigation/MainNavigator';

// Import mode components
import ReceiveByWalletMode from '../features/receive/ReceiveByWalletMode';
import ReceiveByBlikMode from '../features/receive/ReceiveByBlikMode';

type Props = NativeStackScreenProps<MainStackParamList, 'Receive'>;

type ReceiveMode = 'wallet' | 'blik';

export default function UnifiedReceiveScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeMode, setActiveMode] = useState<ReceiveMode>('wallet');

  const tabs = [
    { key: 'wallet' as ReceiveMode, label: 'Wallet Address', icon: 'qr-code-outline' },
    { key: 'blik' as ReceiveMode, label: 'BLIK Code', icon: 'ticket-outline' },
  ];

  const renderModeContent = () => {
    switch (activeMode) {
      case 'wallet':
        return <ReceiveByWalletMode navigation={navigation} />;
      case 'blik':
        return <ReceiveByBlikMode navigation={navigation} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Receive</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Switcher - Telegram/TON Wallet style */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
        {tabs.map((tab) => {
          const isActive = activeMode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  borderRadius: theme.radius.md,
                },
              ]}
              onPress={() => setActiveMode(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mode Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderModeContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
