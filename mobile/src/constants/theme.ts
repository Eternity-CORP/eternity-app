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

// TON Wallet/Telegram style - more rounded corners
const baseRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

// TON Wallet/Telegram inspired color palette
export const lightTheme: Theme = {
  colors: {
    primary: '#3390EC',      // Telegram blue
    secondary: '#6BCF7F',    // Telegram green accent
    background: '#FFFFFF',   // Pure white
    card: 'rgba(255, 255, 255, 0.8)',  // Semi-transparent white for glassmorphism
    surface: 'rgba(247, 248, 250, 0.9)', // Light surface with transparency
    text: '#000000',         // Pure black text
    textSecondary: '#6D6D70',
    muted: 'rgba(0, 0, 0, 0.3)',
    border: 'rgba(0, 0, 0, 0.06)', // Very subtle borders
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    accent: '#3390EC',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

// Dark theme inspired by Telegram dark mode
export const darkTheme: Theme = {
  colors: {
    primary: '#3390EC',      // Telegram blue
    secondary: '#6BCF7F',    // Telegram green accent
    background: '#0E1621',   // Telegram dark background
    card: 'rgba(31, 45, 61, 0.7)',  // Semi-transparent dark cards (glassmorphism)
    surface: 'rgba(22, 32, 45, 0.8)', // Dark surface with transparency
    text: '#FFFFFF',         // Pure white text
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    muted: 'rgba(255, 255, 255, 0.3)',
    border: 'rgba(255, 255, 255, 0.08)', // Very subtle borders
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    accent: '#3390EC',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export type ThemeMode = 'light' | 'dark';

export const getThemeByMode = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);
