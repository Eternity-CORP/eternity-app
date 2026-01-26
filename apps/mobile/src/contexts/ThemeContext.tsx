/**
 * Theme Context
 * Provides theme switching functionality throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ThemeMode,
  loadThemePreference,
  saveThemePreference,
} from '@/src/services/theme-service';

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

const lightColors = {
  // Backgrounds - LIGHT THEME
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#EEEEEE',

  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // Accents - monochrome (status colors kept for semantics)
  accent: '#000000',
  accentSecondary: '#333333',
  accentCyan: '#333333', // Legacy
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Buttons - black on white
  buttonPrimary: '#000000',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#E0E0E0',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#F0F0F0',
  buttonDisabledText: '#999999',

  // Borders
  border: '#E8E8E8',
  borderLight: '#E0E0E0',

  // Gradients - monochrome
  gradientPrimary: ['#000000', '#333333'] as [string, string],
  gradientSecondary: ['#333333', '#666666'] as [string, string],
  gradientLight: ['#FFFFFF', '#F0F0F0'] as [string, string],
  // Legacy gradient names
  gradientBlue: ['#000000', '#333333'] as [string, string],
  gradientPurple: ['#333333', '#666666'] as [string, string],
  gradientGreen: ['#333333', '#666666'] as [string, string],

  // Avatar gradients (keep colored)
  avatarGradient1: ['#0066FF', '#00D4FF'] as [string, string],
  avatarGradient2: ['#8B5CF6', '#EC4899'] as [string, string],
  avatarGradient3: ['#22C55E', '#84CC16'] as [string, string],

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',

  // Grid pattern
  gridLine: 'rgba(0, 0, 0, 0.06)',

  // Blur tint
  blurTint: 'light' as 'light' | 'dark',
};

const darkColors = {
  // Backgrounds - DARK THEME
  background: '#000000',
  surface: '#0A0A0A',
  surfaceElevated: '#111111',
  surfaceHover: '#1A1A1A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textTertiary: '#666666',

  // Accents - monochrome (status colors kept for semantics)
  accent: '#FFFFFF',
  accentSecondary: '#CCCCCC',
  accentCyan: '#CCCCCC', // Legacy
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Buttons - white on black
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#000000',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#333333',
  buttonSecondaryText: '#FFFFFF',
  buttonDisabled: '#1A1A1A',
  buttonDisabledText: '#666666',

  // Borders
  border: '#1A1A1A',
  borderLight: '#333333',

  // Gradients - monochrome
  gradientPrimary: ['#FFFFFF', '#CCCCCC'] as [string, string],
  gradientSecondary: ['#666666', '#333333'] as [string, string],
  gradientLight: ['#1A1A1A', '#0A0A0A'] as [string, string],
  // Legacy gradient names
  gradientBlue: ['#FFFFFF', '#CCCCCC'] as [string, string],
  gradientPurple: ['#666666', '#333333'] as [string, string],
  gradientGreen: ['#666666', '#333333'] as [string, string],

  // Avatar gradients (keep colored)
  avatarGradient1: ['#0066FF', '#00D4FF'] as [string, string],
  avatarGradient2: ['#8B5CF6', '#EC4899'] as [string, string],
  avatarGradient3: ['#22C55E', '#84CC16'] as [string, string],

  // Glass effects
  glass: 'rgba(0, 0, 0, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // Grid pattern (more visible in dark theme)
  gridLine: 'rgba(255, 255, 255, 0.15)',

  // Blur tint
  blurTint: 'dark' as 'light' | 'dark',
};

const typography = {
  displayLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

const createShadows = (isDark: boolean) => ({
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: isDark ? 0.2 : 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
});

// ============================================================================
// THEME TYPES
// ============================================================================

export type ThemeColors = typeof lightColors;

export interface Theme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: ReturnType<typeof createShadows>;
  isDark: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference().then((savedMode) => {
      setThemeModeState(savedMode);
      setIsLoaded(true);
    });
  }, []);

  // Determine actual theme based on mode
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // Build theme object
  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
    const shadows = createShadows(isDark);

    return {
      colors,
      typography,
      spacing,
      borderRadius,
      shadows,
      isDark,
    };
  }, [isDark]);

  // Handle theme mode change
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemePreference(mode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeMode,
      setThemeMode,
      isDark,
    }),
    [theme, themeMode, setThemeMode, isDark]
  );

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within AppThemeProvider');
  }
  return context;
}

/**
 * Hook to get just the theme colors (for use in StyleSheet.create)
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return theme.colors;
}
