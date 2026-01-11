/**
 * E-Y Design System Theme Constants
 * Based on World App reference design
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F5F5F5',      // Cards, inputs
  surfaceHover: '#EBEBEB',

  // Text
  textPrimary: '#000000',
  textSecondary: '#888888',
  textTertiary: '#AAAAAA',

  // Accents
  success: '#22C55E',      // Green - positive values
  error: '#EF4444',        // Red - negative values

  // Buttons
  buttonPrimary: '#000000',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFFFFF',
  buttonSecondaryBorder: '#E5E5E5',

  // Gradients (avatars)
  gradientPink: ['#EC4899', '#8B5CF6'],
  gradientBlue: ['#3B82F6', '#8B5CF6'],
  gradientGreen: ['#22C55E', '#84CC16'],
} as const;

export const typography = {
  // Large display (balance)
  displayLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
  },

  // Page titles
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },

  // Section headers
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },

  // Secondary/caption
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 18,
  },

  // Small labels
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,  // Circular buttons, avatars
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
} as const;
