/**
 * BottomTabBar - Floating bottom navigation with blur effect
 * Style inspired by Phantom wallet
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

type TabItem = {
  key: string;
  icon: IconName;
  iconActive?: IconName;
  label: string;
  badge?: number;
};

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
};

export default function BottomTabBar({ tabs, activeTab, onTabPress }: Props) {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = async (key: string) => {
    if (key !== activeTab) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Haptics not available
      }
    }
    onTabPress(key);
  };

  const content = (
    <View style={[styles.tabRow, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconName = isActive && tab.iconActive ? tab.iconActive : tab.icon;
        
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={iconName}
                size={24}
                color={isActive ? theme.colors.primary : theme.colors.muted}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                  <Text style={styles.badgeText}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? theme.colors.primary : theme.colors.muted,
                  fontFamily: isActive 
                    ? theme.typography.fontFamilies.medium 
                    : theme.typography.fontFamilies.regular,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Use BlurView on iOS for premium feel
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <BlurView
          intensity={80}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={[styles.blurContainer, { borderColor: theme.colors.border }]}
        >
          {content}
        </BlurView>
      </View>
    );
  }

  // Solid background for Android
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.solidContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  solidContainer: {
    borderRadius: 24,
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 4,
  },
});
