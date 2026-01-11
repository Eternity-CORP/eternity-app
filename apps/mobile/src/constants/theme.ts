// E-Y Design System - Based on World App reference

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceHover: '#EBEBEB',

  // Text
  textPrimary: '#000000',
  textSecondary: '#888888',
  textTertiary: '#AAAAAA',

  // Accents
  success: '#22C55E',
  error: '#EF4444',

  // Buttons
  buttonPrimary: '#000000',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFFFFF',
  buttonSecondaryBorder: '#E5E5E5',
  buttonDisabled: '#F5F5F5',
  buttonDisabledText: '#AAAAAA',

  // Tab bar
  tabActive: '#000000',
  tabInactive: '#888888',
};

export const typography = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
