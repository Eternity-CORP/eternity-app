/**
 * SafeScreen - Universal safe area wrapper for all screens
 * Handles notch, Dynamic Island, home indicator on various devices
 */

import React from 'react';
import { StatusBar, StyleSheet, ViewStyle, StyleProp, ColorValue } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
  gradientColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
};

export default function SafeScreen({ 
  children, 
  edges = ['top', 'bottom'],
  style,
  gradient = false,
  gradientColors,
}: Props) {
  const { theme, mode } = useTheme();
  
  const defaultGradientColors: readonly [string, string] = [theme.colors.background, '#0C0F28'];
  const colors = gradientColors || defaultGradientColors;

  if (gradient) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <SafeAreaView 
            style={[styles.container, style]}
            edges={edges}
          >
            {children}
          </SafeAreaView>
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      <SafeAreaView 
        style={[
          styles.container, 
          { backgroundColor: theme.colors.background },
          style
        ]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});
