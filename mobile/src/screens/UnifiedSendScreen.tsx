/**
 * UnifiedSendScreen - All-in-one send interface with tabs
 *
 * Three modes:
 * 1. Wallet - Send directly to wallet address (ETH)
 * 2. Identifier - Send by @nickname or Global ID
 * 3. BLIK - Pay existing BLIK code
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
import SendByWalletMode from '../features/send/SendByWalletMode';
import SendByIdentifierMode from '../features/send/SendByIdentifierMode';
import SendByBlikMode from '../features/send/SendByBlikMode';

type Props = NativeStackScreenProps<MainStackParamList, 'Send'>;

type SendMode = 'wallet' | 'identifier' | 'blik';

export default function UnifiedSendScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeMode, setActiveMode] = useState<SendMode>('wallet');

  const tabs = [
    { key: 'wallet' as SendMode, label: 'Wallet', icon: 'wallet-outline' },
    { key: 'identifier' as SendMode, label: '@Nickname', icon: 'at-outline' },
    { key: 'blik' as SendMode, label: 'BLIK Code', icon: 'qr-code-outline' },
  ];

  const renderModeContent = () => {
    switch (activeMode) {
      case 'wallet':
        return <SendByWalletMode navigation={navigation} />;
      case 'identifier':
        return <SendByIdentifierMode navigation={navigation} />;
      case 'blik':
        return <SendByBlikMode navigation={navigation} />;
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Send</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
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
    fontSize: 13,
    fontWeight: '600',
  },
});
