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

// Bittensor style - minimal rounded corners
const baseRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

// Bittensor inspired color palette - Light theme (white background)
export const lightTheme: Theme = {
  colors: {
    primary: '#000000',      // Black primary
    secondary: '#737373',    // Gray secondary
    background: '#FFFFFF',   // Pure white
    card: '#FAFAFA',         // Very light gray cards
    surface: '#F5F5F5',      // Light surface
    text: '#000000',         // Pure black text
    textSecondary: '#737373', // Gray text
    muted: 'rgba(0, 0, 0, 0.2)',
    border: 'rgba(0, 0, 0, 0.08)', // Subtle borders
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
    accent: '#000000',       // Black accent
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

// Bittensor inspired - Dark theme (black background)
export const darkTheme: Theme = {
  colors: {
    primary: '#FFFFFF',      // White primary
    secondary: '#A3A3A3',    // Gray secondary
    background: '#000000',   // Pure black
    card: '#0A0A0A',         // Very dark cards
    surface: '#171717',      // Dark surface
    text: '#FFFFFF',         // Pure white text
    textSecondary: 'rgba(255, 255, 255, 0.5)', // Gray text
    muted: 'rgba(255, 255, 255, 0.2)',
    border: 'rgba(255, 255, 255, 0.08)', // Subtle borders
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    accent: '#FFFFFF',       // White accent
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export type ThemeMode = 'light' | 'dark';

export const getThemeByMode = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);
