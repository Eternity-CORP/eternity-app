/**
 * E-Y Design System Theme Constants
 * Light theme matching website style
 */

export const colors = {
  // Backgrounds - LIGHT THEME
  background: '#FFFFFF',
  surface: '#F5F5F5',      // Cards, inputs
  surfaceElevated: '#FFFFFF', // Elevated cards, modals
  surfaceHover: '#EEEEEE',

  // Text - inverted for light theme
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // Accents - monochrome (status colors kept for semantics)
  accent: '#000000',       // Primary black
  accentSecondary: '#333333', // Secondary dark gray
  accentCyan: '#333333',   // Legacy - now dark gray
  success: '#22C55E',      // Green - positive values (keep colored)
  error: '#EF4444',        // Red - negative values (keep colored)
  warning: '#F59E0B',      // Orange - warnings (keep colored)

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

  // Gradients (for LinearGradient) - monochrome
  gradientPrimary: ['#000000', '#333333'],
  gradientSecondary: ['#333333', '#666666'],
  gradientLight: ['#FFFFFF', '#F0F0F0'],
  // Legacy gradient names (now monochrome)
  gradientBlue: ['#000000', '#333333'],
  gradientPurple: ['#333333', '#666666'],
  gradientGreen: ['#333333', '#666666'],

  // Avatar gradients (keep colored for personality)
  avatarGradient1: ['#0066FF', '#00D4FF'],
  avatarGradient2: ['#8B5CF6', '#EC4899'],
  avatarGradient3: ['#22C55E', '#84CC16'],

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',

  // Grid pattern color
  gridLine: 'rgba(0, 0, 0, 0.06)',
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  // Glass effect shadow
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
} as const;

// Glass card style preset
export const glassCard = {
  backgroundColor: colors.glass,
  borderWidth: 1,
  borderColor: colors.glassBorder,
  borderRadius: borderRadius.lg,
  ...shadows.glass,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  glassCard,
} as const;
