# E-Y Design System

## Overview

E-Y uses two distinct visual themes across its platforms:

- **Web App** -- a premium dark theme built on glass-morphism, ambient lighting, and translucent surfaces. Styled with Tailwind CSS v4 utility classes and custom CSS properties defined in `apps/web/src/app/globals.css`.
- **Mobile App** -- a clean, minimal light theme inspired by modern fintech apps. Styled with React Native `StyleSheet` and constants from `apps/mobile/src/constants/theme.ts`.

The two themes are intentionally different. The web app targets desktop and tablet users who expect a rich, immersive experience. The mobile app targets on-the-go users who need clarity, speed, and readability in variable lighting conditions.

One element is shared across both platforms: the **AI Chat interface** always renders in a dark theme, providing a consistent AI interaction experience regardless of platform.

### Shared Design Tokens

These values are consistent across web and mobile:

| Token | Value | Usage |
|-------|-------|-------|
| Success | `#22C55E` | Positive amounts, confirmations, online status |
| Error | `#EF4444` | Negative amounts, failures, destructive actions |
| Warning | `#F59E0B` | Pending states, caution alerts |
| Accent Blue | `#3388FF` | Links, active states, primary accent |
| Accent Purple | `#8B5CF6` | Badges, secondary accent, avatar gradients |
| Font (web) | Inter (Google Fonts) | All web typography |
| Font (mobile) | System default | All mobile typography |

---

## 1. Web App Design System (Dark Theme)

**Source of truth:** `apps/web/src/app/globals.css`
**Styling method:** Tailwind CSS v4 + custom CSS classes

### 1.1 CSS Variables

```css
:root {
  --background: #000000;
  --foreground: #FFFFFF;
  --foreground-muted: rgba(255, 255, 255, 0.6);
  --foreground-subtle: rgba(255, 255, 255, 0.4);
  --border: rgba(255, 255, 255, 0.1);
  --border-light: rgba(255, 255, 255, 0.05);
  --surface: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.06);
  --success: #22C55E;
  --error: #EF4444;
  --accent-blue: #3388FF;
  --accent-cyan: #00E5FF;
}
```

### 1.2 Glass Morphism Classes

| Class | Properties | Usage |
|-------|------------|-------|
| `.glass-card` | `background: rgba(19,19,19,0.6)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 1rem (rounded-2xl)` | Primary card/container surface |
| `.glass-card-glow` | Same as `.glass-card` plus blue glow on hover | Interactive cards (tokens, contacts) |
| `.gradient-border` | Animated gradient border cycling blue/cyan/green over 6s | Highlighted containers, active states |
| `.gradient-border-live` | Rotating conic gradient border with 3s rotation | Live/streaming indicators |
| `.shimmer` | Moving light sweep across surface, 3s cycle | Primary action buttons |
| `.pulse-ring` | Expanding/fading ring, loops continuously | Status indicators (online, syncing) |
| `.noise` | Fractal noise texture overlay at 5% opacity | Applied to page-level containers |
| `.bg-grid` | Grid background with 60px cells and 6% white lines | Applied to `<body>` |

### 1.3 Layout and Ambient Effects

The web app uses a layered layout to create depth:

```
Layer 0  --  <body> with .bg-grid (grid background)
Layer 1  --  .noise overlay (texture)
Layer 1  --  .glow-orb-1, .glow-orb-2, .glow-orb-3 (ambient lighting, fixed position)
Layer 2  --  All page content (z-[2] via Tailwind)
```

**Glow orbs:**

| Orb | Color | Purpose |
|-----|-------|---------|
| `.glow-orb-1` | Blue | Top-left ambient glow, float animation |
| `.glow-orb-2` | Cyan | Center-right ambient glow, float animation |
| `.glow-orb-3` | Green | Bottom ambient glow, float animation |

All three orbs use `position: fixed` and a slow floating animation. Page content must use `relative z-[2]` to render above them.

### 1.4 Typography Classes

| Class | Effect | Usage |
|-------|--------|-------|
| `.text-gradient` | White to 70% white vertical gradient | Section headings, card titles |
| `.text-gradient-accent` | `#3388FF` to `#00E5FF` horizontal gradient | Feature highlights, accent labels |
| `.hero-gradient-text` | 30% white to 10% white gradient | Background hero text, decorative |

Standard text uses Tailwind utilities (`text-white`, `text-white/60`, `text-white/40`) mapped to the CSS variables above.

### 1.5 Chat-Specific Classes (Web)

| Class | Properties | Usage |
|-------|------------|-------|
| `.chat-bubble-user` | Translucent white glass bubble | User messages in AI chat |
| `.chat-bubble-ai` | Dark semi-transparent bubble | AI responses in AI chat |
| `.chat-input-container` | Input field with blue focus border | Chat text input |
| `.suggestion-chip` | Pill-shaped chip with hover glow | Quick action suggestions |
| `.mode-toggle` | Toggle switch component | AI/Classic mode selector |

### 1.6 Button Patterns (Web)

**Primary button:**
- White background with `.shimmer` effect
- Black text
- Used for main CTAs (Send, Confirm, Connect)

**Secondary/ghost button:**
- Transparent background, `border: 1px solid rgba(255,255,255,0.1)`
- White text
- Used for secondary actions (Cancel, Back)

**Disabled state:**
- Reduced opacity (`opacity-50`)
- `cursor-not-allowed`

### 1.7 Card Patterns (Web)

All cards use `.glass-card` as their base. Additional patterns:

- **Token card:** `.glass-card` with token icon, name, balance, and percentage change
- **Transaction item:** Row layout inside `.glass-card`, icon + description + amount
- **Settings item:** Row with label, value, and chevron inside `.glass-card`

---

## 2. Mobile App Design System (Light Theme)

**Source of truth:** `apps/mobile/src/constants/theme.ts`
**Styling method:** React Native `StyleSheet` + theme constants

### 2.1 Colors

```typescript
export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#EEEEEE',

  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // Accent (monochrome)
  accent: '#000000',
  accentSecondary: '#333333',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Buttons
  buttonPrimary: '#000000',
  buttonPrimaryText: '#FFFFFF',

  // Borders and glass
  border: '#E8E8E8',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
};
```

### 2.2 Typography

```typescript
export const typography = {
  // Large display (balance)
  displayLarge: { fontSize: 48, fontWeight: '700', lineHeight: 56 },

  // Page titles
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },

  // Section headers
  heading: { fontSize: 18, fontWeight: '600', lineHeight: 24 },

  // Body text
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },

  // Secondary/caption
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 18 },

  // Small labels
  label: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
};
```

### 2.3 Spacing

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
```

### 2.4 Border Radius

```typescript
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,  // Circular buttons, avatars
};
```

### 2.5 Button Styles (Mobile)

**Primary button:**
```typescript
{
  backgroundColor: '#000000',
  color: '#FFFFFF',
  borderRadius: 16,
  paddingVertical: 16,
  width: '100%',
}
```

**Secondary button:**
```typescript
{
  backgroundColor: '#FFFFFF',
  color: '#000000',
  borderRadius: 24,
  borderWidth: 1,
  borderColor: '#E5E5E5',
  paddingVertical: 12,
  paddingHorizontal: 24,
}
```

**Disabled button:**
```typescript
{
  backgroundColor: '#F5F5F5',
  color: '#AAAAAA',
}
```

### 2.6 Card Styles (Mobile)

**Token card:**
```typescript
{
  backgroundColor: '#F5F5F5',
  borderRadius: 16,
  padding: 16,
  // Contains: icon, name, balance, change%
}
```

**List item:**
```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: '#FFFFFF',
}
```

### 2.7 Icon Style (Mobile)

- Line icons (not filled)
- 24px default size
- Circular backgrounds when used as action buttons
- Black on white, white on black (inverted in dark contexts)

### 2.8 Navigation (Mobile)

**Bottom Tab Bar:**
- 3 tabs: Home, Wallet, Shard
- Active state: black icon + label
- Inactive state: gray icon + label
- Height: approximately 80px including safe area inset

**Numeric Keypad (amount entry):**
- 3x4 grid with backspace key
- Large touch targets, no borders
- Quick amount chips displayed above the keypad

### 2.9 Mobile Screen Reference

| Screen | Key Components |
|--------|----------------|
| Home | Balance display, action buttons, token cards, bottom tabs |
| Send: Token Select | Token list with icon, name, ticker, balance |
| Send: Recipient | Search input, QR scanner, contact list with gradient avatars |
| Send: Amount | Large centered amount, token equivalent, keypad, quick chips |
| Send: Confirm | Send/receive summary, fee details, confirm button |
| Send: Success | Green checkmark, processing text, done button |
| History | Transaction list with icon, title, amount, date |
| Settings | Close button, menu items with icons and chevrons |

---

## 3. AI Chat Theme (Cross-Platform Dark)

**Source of truth (mobile):** `apps/mobile/src/constants/ai-chat-theme.ts`
**Source of truth (web):** Chat-specific classes in `apps/web/src/app/globals.css`

The AI chat interface uses a dark theme on both platforms, providing a distinct "AI space" that is visually separated from the rest of the app. On mobile, this overrides the default light theme for the chat screen only.

### 3.1 Colors

```typescript
// Mobile AI chat theme constants
screen: '#000000',

userBubble: {
  gradientStart: 'rgba(255, 255, 255, 0.12)',
  gradientEnd: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.10)',
},

aiBubble: {
  bg: 'rgba(19, 19, 19, 0.8)',
  border: 'rgba(255, 255, 255, 0.06)',
},

text: {
  primary: 'rgba(255, 255, 255, 0.9)',
  secondary: 'rgba(255, 255, 255, 0.6)',
},

// Semantic accents
accentBlue: '#3388FF',
accentGreen: '#22C55E',
accentRed: '#EF4444',
accentAmber: '#F59E0B',
accentPurple: '#8B5CF6',
```

### 3.2 Web Chat CSS Mapping

The web chat classes map to the same visual language:

| Mobile Constant | Web CSS Class | Visual Result |
|----------------|---------------|---------------|
| `userBubble` | `.chat-bubble-user` | Translucent white glass bubble |
| `aiBubble` | `.chat-bubble-ai` | Dark semi-transparent bubble (`rgba(19,19,19,0.8)`) |
| N/A | `.chat-input-container` | Input with blue focus border |
| N/A | `.suggestion-chip` | Quick action chips with hover glow |
| N/A | `.mode-toggle` | AI/Classic mode toggle |

### 3.3 Design Rationale

The AI chat is always dark because:
- It creates a clear visual boundary between "talking to AI" and "using the wallet"
- Dark backgrounds reduce eye strain for text-heavy conversational interfaces
- The dark aesthetic aligns with user expectations for AI/assistant interfaces
- Translucent bubbles on a dark background provide excellent readability

---

## 4. Implementation Guidelines

### For Web Developers

1. Always use CSS variables (`var(--background)`, `var(--accent-blue)`) instead of hardcoded hex values
2. Use `.glass-card` as the base for any new card or container component
3. Ensure all page-level content wrappers include `relative z-[2]`
4. Test hover states -- `.glass-card-glow` and `.shimmer` require interaction to verify
5. The grid background and glow orbs are rendered in the root layout; do not duplicate them in page components

### For Mobile Developers

1. Import theme values from `apps/mobile/src/constants/theme.ts` -- never hardcode colors or spacing
2. Use the `spacing` and `borderRadius` scales consistently; avoid arbitrary pixel values
3. The AI chat screen imports its own theme from `src/constants/ai-chat-theme.ts`; do not mix light theme constants into chat components
4. Button and card patterns are documented above; match them when creating new UI elements

### Cross-Platform Considerations

1. **Do not attempt to unify the themes.** The web and mobile themes serve different UX contexts and are intentionally distinct.
2. Shared semantic colors (success, error, warning, accent blue) must remain synchronized across platforms. If one changes, update both.
3. New shared design tokens should be documented in the "Shared Design Tokens" table at the top of this file.
4. The AI chat dark theme should remain visually consistent across platforms -- changes to bubble styles, accent colors, or background values should be applied to both `ai-chat-theme.ts` and `globals.css`.
