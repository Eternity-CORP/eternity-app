/**
 * AI Chat Dark Glass Morphism Theme
 * Always-dark color tokens for the AI chat screen
 */

export const aiChat = {
  // Screen
  screen: '#000000',

  // User bubble — translucent white glass
  userBubble: {
    gradientStart: 'rgba(255,255,255,0.12)',
    gradientEnd: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
  },

  // AI bubble — dark semi-transparent
  aiBubble: {
    bg: 'rgba(19,19,19,0.8)',
    border: 'rgba(255,255,255,0.06)',
  },

  // Text hierarchy
  text: {
    primary: 'rgba(255,255,255,0.9)',
    secondary: 'rgba(255,255,255,0.6)',
    tertiary: 'rgba(255,255,255,0.4)',
    timestamp: 'rgba(255,255,255,0.3)',
    muted: 'rgba(255,255,255,0.2)',
  },

  // Glass card (inputs, suggestion cards, generic containers)
  glassCard: {
    bg: 'rgba(19,19,19,0.6)',
    border: 'rgba(255,255,255,0.08)',
  },

  // Input
  input: {
    bg: 'rgba(19,19,19,0.6)',
    border: 'rgba(255,255,255,0.08)',
    placeholder: 'rgba(255,255,255,0.3)',
  },

  // Accent colors
  accentBlue: '#3388FF',
  accentGreen: '#22C55E',
  accentRed: '#EF4444',
  accentAmber: '#F59E0B',
  accentPurple: '#8B5CF6',

  // Divider
  divider: 'rgba(255,255,255,0.06)',

  // Grid
  grid: {
    stroke: 'rgba(255,255,255,0.06)',
    cellSize: 60,
  },
} as const;
