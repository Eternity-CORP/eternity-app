# E-Y Mobile App Redesign Plan

**Author:** Claude + Daniel
**Date:** 2026-01-18
**Version:** 1.0

---

## Overview

Redesign the E-Y mobile app to match the website's visual style while preserving all existing functionality.

### Goals
- Match website's dark theme aesthetic
- Maintain 100% feature parity
- Improve visual consistency across platforms
- Keep the same UX patterns and navigation

---

## Design System Changes

### Color Palette

| Element | Current (Light) | New (Dark) |
|---------|-----------------|------------|
| Background | `#FFFFFF` | `#000000` |
| Surface | `#F5F5F5` | `#0A0A0A` |
| Surface Elevated | `#EBEBEB` | `#111111` |
| Text Primary | `#000000` | `#FFFFFF` |
| Text Secondary | `#888888` | `#888888` |
| Text Tertiary | `#AAAAAA` | `#666666` |
| Accent Primary | `#000000` | `#0066FF` |
| Accent Cyan | - | `#00D4FF` |
| Success | `#22C55E` | `#22C55E` |
| Error | `#EF4444` | `#EF4444` |
| Border | `#E5E5E5` | `#1A1A1A` |

### Buttons

| Type | Current | New |
|------|---------|-----|
| Primary | Black bg, white text | Blue gradient bg, white text |
| Secondary | White bg, black border | Transparent, white border |
| Disabled | Gray | Muted blue |

### Cards & Surfaces

```
Current: Light gray (#F5F5F5) solid background
New:     Dark (#0A0A0A) with subtle border (#1A1A1A)
         Optional: glass effect with blur
```

### Typography

Keep existing sizes, change colors:
- Primary text: White
- Secondary text: Gray (#888888)
- Accent text: Blue (#0066FF)

---

## Implementation Approach

### Phase 1: Theme System Update
1. Update `theme.ts` with new dark colors
2. Add new accent colors (blue, cyan)
3. Add glass/gradient utilities

### Phase 2: Core Components
1. ScreenHeader - dark background
2. Tab bar - dark with blue accents
3. Buttons - gradient primary button
4. Cards - dark surface with borders

### Phase 3: Screen Updates (by priority)
1. Home screen (most visible)
2. Send flow screens
3. BLIK screens
4. Transaction screens
5. Settings and utility screens

---

## Files to Modify

### Theme System
- `apps/mobile/src/constants/theme.ts` - Complete color palette update

### Navigation
- `apps/mobile/app/(tabs)/_layout.tsx` - Tab bar styling
- `apps/mobile/app/_layout.tsx` - Root background

### Components
- `apps/mobile/src/components/ScreenHeader.tsx`
- `apps/mobile/src/components/BlikCodeInput.tsx`
- `apps/mobile/src/components/TokenIcon.tsx`

### Screens (Main)
- `apps/mobile/app/(tabs)/home.tsx`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/app/(tabs)/transactions.tsx`

### Screens (Flows)
- `apps/mobile/app/send/*.tsx`
- `apps/mobile/app/blik/*.tsx`
- `apps/mobile/app/receive/*.tsx`
- `apps/mobile/app/transaction/*.tsx`
- `apps/mobile/app/scheduled/*.tsx`
- `apps/mobile/app/split/*.tsx`

---

## Preserved Functionality

All features remain unchanged:
- Wallet creation/import
- BLIK code generation/redemption
- Username system
- Token balances
- Transaction history
- Contacts management
- Scheduled payments
- Split bills
- Settings

---

## Visual References

Website color scheme:
```css
--background: #000000;
--surface: #0A0A0A;
--surface-elevated: #111111;
--text-primary: #FFFFFF;
--text-secondary: #888888;
--accent-blue: #0066FF;
--accent-cyan: #00D4FF;
--border: #1A1A1A;
```

Gradient for buttons:
```css
background: linear-gradient(135deg, #0066FF 0%, #00D4FF 100%);
```

---

## Success Criteria

- [ ] All screens use dark theme
- [ ] Primary buttons use blue gradient
- [ ] Cards have dark surface with subtle borders
- [ ] Text is readable (white on black)
- [ ] All existing features work identically
- [ ] No TypeScript errors
- [ ] App builds successfully
