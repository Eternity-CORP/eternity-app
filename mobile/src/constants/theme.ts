import { Platform } from 'react-native';

export type Theme = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    surface: string;
    text: string;
    textSecondary: string;
    muted: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    accent: string;
  };
  typography: {
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    fontWeights: {
      regular: '400' | 'normal';
      medium: '500';
      semibold: '600';
      bold: '700' | 'bold';
    };
    fontFamilies: {
      regular: string;
      medium: string;
      bold: string;
      monospace: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

const baseTypography: Theme['typography'] = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  fontWeights: {
    regular: Platform.OS === 'ios' ? 'normal' : '400',
    medium: '500',
    semibold: '600',
    bold: Platform.OS === 'ios' ? 'bold' : '700',
  },
  fontFamilies: {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'System' : 'Roboto',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto',
    monospace: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
};

const baseSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

const baseRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const lightTheme: Theme = {
  colors: {
    primary: '#AB9FF2',      // Phantom-style purple
    secondary: '#22D3EE',    // Cyan accent
    background: '#FFFFFF',   // Clean white for light mode
    card: '#F5F5F7',         // Subtle gray cards
    surface: '#EBEBF0',      // Surface elements
    text: '#1C1C1E',         // Dark text
    textSecondary: '#8E8E93',
    muted: '#C7C7CC',
    border: '#E5E5EA',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    accent: '#5856D6',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export const darkTheme: Theme = {
  colors: {
    primary: '#AB9FF2',      // Phantom-style purple
    secondary: '#22D3EE',    // Cyan accent
    background: '#0D0D0D',   // Deep black like Trust Wallet
    card: '#1A1A1A',         // Slightly lighter cards
    surface: '#2C2C2E',      // Surface for tabs/buttons
    text: '#FFFFFF',         // Pure white text
    textSecondary: '#8E8E93',
    muted: '#636366',
    border: '#3A3A3C',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    accent: '#64D2FF',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export type ThemeMode = 'light' | 'dark';

export const getThemeByMode = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);
