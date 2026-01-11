# E-Y Design System

Based on World App reference design.

## Color Palette

```typescript
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
};
```

## Typography

```typescript
export const typography = {
  // Large display (balance)
  displayLarge: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },

  // Page titles
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },

  // Section headers
  heading: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Secondary/caption
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Small labels
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
};
```

## Spacing

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

## Border Radius

```typescript
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,  // Circular buttons, avatars
};
```

## Components Reference

### 1. Home Screen (`home-screen.png`)
- Total balance: `displayLarge`, centered
- Action buttons row: Buy (filled), Send (outlined), More (icon)
- Token card: Large with sparkline chart
- Token grid: 2 columns, smaller cards
- Bottom tab bar: 3 tabs (Home, Wallet, World ID)

### 2. Action Menu (`all-function-from-home-screen.png`)
- Blurred overlay background
- List items with circular black icons
- Actions: Buy, Sell, Send, Receive, Pay, Withdraw

### 3. Send Flow

**Screen 1 - Token Selection** (`send-screen-1.png`)
- Back button: circular, gray background
- Title: "Send" (title style)
- Subtitle: gray caption
- Token list: icon (40px), name, ticker, balance

**Screen 2 - Recipient** (`send-screen-2.png`)
- Search input: gray background, rounded
- QR scanner icon in header
- Contact list with gradient avatars
- Verified badge (blue checkmark)
- @username format

**Screen 3 - Amount** (`send-screen-3.png`)
- Large amount display (centered)
- Token equivalent below
- Quick amount chips: zł12, zł24, Max
- Custom numeric keypad (no system keyboard)
- Continue button: full width, disabled state gray

**Screen 4 - Confirm** (`send-screen-4.png`)
- Send/Receive summary with avatars
- Details list: fee, address (truncated), network
- "Confirm send" button: black, full width

**Screen 5 - Success** (`send-screen-5.png`)
- Green checkmark circle (centered)
- "Send processing" text
- Done button: black, full width

### 4. History (`history.png`)
- Transaction list
- Each row: icon, title, subtitle, amount, date
- Green text for incoming amounts
- Dividers between rows

### 5. Settings (`settings-style.png`)
- Close button: X in circle
- Banner card at top (Invites)
- Menu items: icon, label, chevron
- Version number at bottom center

### 6. Identity/Shard (`shard-page-identity.png`)
- Large gradient avatar
- @username.0000 format
- Joined date
- Verification cards grid
- Action cards with Claim/Invite buttons

## Icon Style
- Line icons (not filled)
- 24px default size
- Circular backgrounds when needed
- Black on white, white on black

## Button Styles

### Primary Button
```typescript
{
  backgroundColor: '#000000',
  color: '#FFFFFF',
  borderRadius: 16,
  paddingVertical: 16,
  width: '100%',
}
```

### Secondary Button
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

### Disabled Button
```typescript
{
  backgroundColor: '#F5F5F5',
  color: '#AAAAAA',
}
```

## Card Styles

### Token Card (Large)
```typescript
{
  backgroundColor: '#F5F5F5',
  borderRadius: 16,
  padding: 16,
  // Contains: icon, name, chart, balance, change%
}
```

### Token Card (Small)
```typescript
{
  backgroundColor: '#F5F5F5',
  borderRadius: 16,
  padding: 16,
  width: '48%',  // Grid 2 columns
}
```

### List Item
```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: '#FFFFFF',
}
```

## Bottom Tab Bar
- 3 tabs: Home, Wallet, World ID (for E-Y: Home, Wallet, Shard)
- Active: black icon + label
- Inactive: gray icon + label
- Height: ~80px with safe area

## Numeric Keypad
- 3x4 grid + backspace
- Large touch targets
- No borders, clean look
- Quick amount buttons above

## Screen Reference Map

| Screen | File | Key Components |
|--------|------|----------------|
| Home | `home-screen.png` | Balance, actions, token cards, tabs |
| Actions | `all-function-from-home-screen.png` | Action menu overlay |
| Send: Token | `send-screen-1.png` | Token selection list |
| Send: Recipient | `send-screen-2.png` | Search, contacts |
| Send: Amount | `send-screen-3.png` | Keypad, amount input |
| Send: Confirm | `send-screen-4.png` | Transaction summary |
| Send: Success | `send-screen-5.png` | Success state |
| History | `history.png` | Transaction list |
| Settings | `settings-style.png` | Menu items |
| Identity | `shard-page-identity.png` | Profile, badges |
