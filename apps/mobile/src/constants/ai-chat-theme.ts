/**
 * AI Chat Theme
 * Theme-aware color tokens for the AI chat screen.
 * Supports both dark and light modes via getAiChatTheme(isDark).
 */

export function getAiChatTheme(isDark: boolean) {
  return {
    // Screen
    screen: isDark ? '#000000' : '#FFFFFF',

    // User bubble — translucent glass
    userBubble: {
      gradientStart: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
      gradientEnd: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    },

    // AI bubble — semi-transparent
    aiBubble: {
      bg: isDark ? 'rgba(19,19,19,0.8)' : 'rgba(245,245,245,0.9)',
      border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },

    // Text hierarchy
    text: {
      primary: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
      secondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      tertiary: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
      timestamp: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      muted: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
    },

    // Glass card (inputs, suggestion cards, generic containers)
    glassCard: {
      bg: isDark ? 'rgba(19,19,19,0.6)' : 'rgba(240,240,240,0.8)',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },

    // Input
    input: {
      bg: isDark ? 'rgba(19,19,19,0.6)' : 'rgba(240,240,240,0.8)',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      placeholder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    },

    // Accent colors — same in both themes (semantic)
    accentBlue: '#3388FF',
    accentGreen: '#22C55E',
    accentRed: '#EF4444',
    accentAmber: '#F59E0B',
    accentPurple: '#8B5CF6',

    // Divider
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',

    // Grid
    grid: {
      stroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      cellSize: 60,
    },

    // Cancel button background
    cancelButtonBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',

    // Misc surface tints
    surfaceTint: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    surfaceTintLight: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    surfaceTintInput: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    borderTint: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    borderTintLight: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderTintMedium: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',

    // Dismiss button
    dismissBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    dismissIcon: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',

    // Action button (idle state)
    actionButtonBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    actionButtonIcon: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',

    // Quick chip
    quickChipBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    quickChipBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',

    // Participant avatar
    participantAvatarBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',

    // Done button
    doneButtonBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    doneButtonBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',

    // Success state text — always white on gradient
    onGradientText: '#FFFFFF',

    // Amount value text (card headers)
    amountText: isDark ? '#FFFFFF' : '#000000',

    // Success card secondary text
    successSubtitleColor: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.9)',
    txHashColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)',

    // Contact name input text color
    contactInputText: isDark ? '#FFFFFF' : '#000000',
  } as const;
}

/** AI chat theme type */
export type AiChatTheme = ReturnType<typeof getAiChatTheme>;

// Backward compatibility — export dark version as default
export const aiChat = getAiChatTheme(true);
