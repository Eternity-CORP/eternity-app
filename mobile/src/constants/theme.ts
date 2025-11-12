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

const baseTypography = {
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
    primary: '#7C3AED',
    secondary: '#10B981',
    background: '#0F1224', // using dark gradient background for modern feel
    card: '#15193A',
    surface: '#1B1F49',
    text: '#E5E7EB',
    textSecondary: '#A1A7C4',
    muted: '#A1A7C4',
    border: '#2A2F63',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    accent: '#06B6D4',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export const darkTheme: Theme = {
  colors: {
    primary: '#8B5CF6',
    secondary: '#34D399',
    background: '#0A0C1C',
    card: '#121434',
    surface: '#17193F',
    text: '#E6E8F1',
    textSecondary: '#9AA0B8',
    muted: '#9AA0B8',
    border: '#272B57',
    error: '#F87171',
    success: '#4ADE80',
    warning: '#FDBA74',
    accent: '#22D3EE',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
};

export type ThemeMode = 'light' | 'dark';

export const getThemeByMode = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);
