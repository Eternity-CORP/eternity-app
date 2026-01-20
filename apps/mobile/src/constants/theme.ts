/**
 * E-Y Design System Theme Constants
 * Dark theme matching website style
 */

export const colors = {
  // Backgrounds
  background: '#000000',
  surface: '#0A0A0A',      // Cards, inputs
  surfaceElevated: '#111111', // Elevated cards, modals
  surfaceHover: '#1A1A1A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textTertiary: '#666666',

  // Accents
  accent: '#0066FF',       // Primary blue
  accentCyan: '#00D4FF',   // Secondary cyan
  success: '#22C55E',      // Green - positive values
  error: '#EF4444',        // Red - negative values
  warning: '#F59E0B',      // Orange - warnings

  // Buttons
  buttonPrimary: '#0066FF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#333333',
  buttonSecondaryText: '#FFFFFF',
  buttonDisabled: '#1A1A1A',
  buttonDisabledText: '#666666',

  // Borders
  border: '#1A1A1A',
  borderLight: '#333333',

  // Gradients (for LinearGradient)
  gradientBlue: ['#0066FF', '#00D4FF'],
  gradientPurple: ['#8B5CF6', '#EC4899'],
  gradientGreen: ['#22C55E', '#84CC16'],

  // Avatar gradients
  avatarGradient1: ['#0066FF', '#00D4FF'],
  avatarGradient2: ['#8B5CF6', '#EC4899'],
  avatarGradient3: ['#22C55E', '#84CC16'],
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

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;
