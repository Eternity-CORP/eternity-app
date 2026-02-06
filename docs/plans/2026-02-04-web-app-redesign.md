# E-Y Web App Redesign

**Date:** 2026-02-04
**Status:** Approved
**Author:** Claude + Daniil

## Overview

Полный редизайн веб-приложения E-Y в минималистичном стиле, вдохновлённом лендингом и подходом Phantom/Rainbow кошельков.

## Design Principles

1. **Минимализм** — только необходимые элементы, много воздуха
2. **Центрированный фокус** — весь контент в узкой карточке по центру
3. **Монохром** — белый на чёрном, без цветных акцентов
4. **Консистентность** — единый стиль с лендингом

---

## Global Styles

### Background

```css
.bg-vignette-grid {
  background-color: #0A0A0A;
  background-image:
    radial-gradient(ellipse at center, transparent 0%, #0A0A0A 70%),
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 100% 100%, 50px 50px, 50px 50px;
}
```

- Чёрный фон `#0A0A0A`
- Сетка 50x50px с opacity 0.03
- Radial gradient создаёт виньетку — сетка затухает к краям

### Glass Card

```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}
```

### Container

```css
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.content-card {
  width: 100%;
  max-width: 384px; /* max-w-sm */
  padding: 32px;
}
```

---

## Components

### Primary Button

```jsx
<button className="
  w-full py-4 px-6
  bg-white text-black font-medium
  rounded-full
  hover:bg-white/90
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Button Text
</button>
```

### Secondary Button

```jsx
<button className="
  w-full py-4 px-6
  bg-transparent text-white font-medium
  border border-white/20
  rounded-full
  hover:bg-white/5
  transition-all duration-200
">
  Button Text
</button>
```

### Input Field

```jsx
<input className="
  w-full py-4 px-6
  bg-white/5 text-white
  border border-white/10
  rounded-full
  placeholder:text-white/30
  focus:border-white/30 focus:outline-none
  transition-all duration-200
"/>
```

### Input Field (Centered - for codes/amounts)

```jsx
<input className="
  w-full py-4 px-6
  bg-white/5 text-white text-center text-2xl
  border border-white/10
  rounded-full
  placeholder:text-white/30
  focus:border-white/30 focus:outline-none
  transition-all duration-200
"/>
```

### Back Link

```jsx
<a className="
  text-white/50 hover:text-white
  transition-colors duration-200
">
  ← Back
</a>
```

### Loading Spinner

```jsx
<div className="
  w-5 h-5
  border-2 border-white/20 border-t-white
  rounded-full animate-spin
"/>
```

---

## Screen Layouts

### Base Layout (all screens)

```jsx
<main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
  <div className="w-full max-w-sm glass-card p-8">
    {/* Content */}
  </div>
</main>
```

### Home Screen

```
┌────────────────────────┐
│                        │
│       Eternity         │  text-4xl font-bold mb-2
│  The wallet for everyone│  text-white/50 mb-10
│                        │
│  ┌──────────────────┐  │
│  │ Create New Wallet│  │  Primary button
│  └──────────────────┘  │
│         mb-4           │
│  ┌──────────────────┐  │
│  │Import Existing   │  │  Secondary button
│  └──────────────────┘  │
│                        │
└────────────────────────┘
```

### Unlock Screen

```
┌────────────────────────┐
│                        │
│       Eternity         │  text-4xl font-bold mb-2
│  Enter password to unlock│  text-white/50 mb-10
│                        │
│  ┌──────────────────┐  │
│  │    ••••••••      │  │  Password input (centered)
│  └──────────────────┘  │
│         mb-6           │
│  ┌──────────────────┐  │
│  │     Unlock       │  │  Primary button
│  └──────────────────┘  │
│                        │
└────────────────────────┘
```

### Wallet Dashboard

```
┌────────────────────────┐
│  Eternity        Lock  │  Header row, mb-8
├────────────────────────┤
│                        │
│     0.0000 ETH         │  text-4xl font-bold mb-1
│     0x1a2b...3c4d      │  text-white/50 text-sm mb-8
│                        │
│  ┌─────────┐┌─────────┐│
│  │  ↑ Send ││↓ Receive││  Two buttons, gap-3
│  └─────────┘└─────────┘│
│         mb-4           │
│  ┌──────────────────┐  │
│  │   BLIK Payment   │  │  Feature row
│  │   6-digit code →  │  │
│  └──────────────────┘  │
│         mb-4           │
│  ┌──────────────────┐  │
│  │   History    →   │  │  Nav row
│  └──────────────────┘  │
│         mb-6           │
│      · Sepolia         │  Network indicator
│                        │
└────────────────────────┘
```

### Send Screen

```
┌────────────────────────┐
│  ← Back       Send     │  Header row, mb-8
├────────────────────────┤
│                        │
│  To                    │  Label, text-white/50 text-sm mb-2
│  ┌──────────────────┐  │
│  │ Address or @user │  │  Input
│  └──────────────────┘  │
│         mb-6           │
│  Amount                │  Label
│  ┌──────────────────┐  │
│  │      0.0     MAX │  │  Input with MAX button
│  └──────────────────┘  │
│  Balance: 0.0000 ETH   │  text-white/30 text-sm mb-8
│                        │
│  ┌──────────────────┐  │
│  │      Send        │  │  Primary button
│  └──────────────────┘  │
│         mb-6           │
│      · Sepolia         │  Network indicator
│                        │
└────────────────────────┘
```

### Success Screen

```
┌────────────────────────┐
│                        │
│          ✓             │  Big checkmark, mb-6
│                        │
│        Sent!           │  text-3xl font-bold mb-2
│  Transaction submitted │  text-white/50 mb-8
│                        │
│  ┌──────────────────┐  │
│  │ View on Etherscan│  │  Secondary button
│  └──────────────────┘  │
│         mb-3           │
│  ┌──────────────────┐  │
│  │  Back to Wallet  │  │  Primary button
│  └──────────────────┘  │
│                        │
└────────────────────────┘
```

---

## Spacing System

| Element | Value |
|---------|-------|
| Card padding | `p-8` (32px) |
| Section gap | `space-y-6` or `mb-6` |
| Element gap | `space-y-4` or `mb-4` |
| Title → subtitle | `mb-2` |
| Title block → content | `mb-10` |
| Before primary button | `mt-8` |
| Button gap | `gap-3` |

---

## Animations

### Card Appear

```css
@keyframes cardAppear {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.glass-card {
  animation: cardAppear 0.3s ease-out;
}
```

### All Transitions

```css
.transition-default {
  transition: all 0.2s ease;
}
```

---

## Responsive Behavior

```css
/* Mobile: card fills width with margin */
@media (max-width: 639px) {
  .content-card {
    max-width: 100%;
  }
}

/* Desktop: fixed narrow width */
@media (min-width: 640px) {
  .content-card {
    max-width: 384px;
  }
}
```

---

## Files to Modify

1. `apps/web/src/app/globals.css` — добавить новые стили
2. `apps/web/src/app/page.tsx` — Home screen
3. `apps/web/src/app/unlock/page.tsx` — Unlock screen
4. `apps/web/src/app/create/page.tsx` — Create wallet
5. `apps/web/src/app/create/password/page.tsx` — Set password
6. `apps/web/src/app/import/page.tsx` — Import wallet
7. `apps/web/src/app/import/password/page.tsx` — Set password
8. `apps/web/src/app/wallet/page.tsx` — Dashboard
9. `apps/web/src/app/wallet/send/page.tsx` — Send
10. `apps/web/src/app/wallet/receive/page.tsx` — Receive
11. `apps/web/src/app/wallet/blik/page.tsx` — BLIK
12. `apps/web/src/app/wallet/history/page.tsx` — History
13. `apps/web/src/app/wallet/send/success/page.tsx` — Success
14. `apps/web/src/app/wallet/blik/received/page.tsx` — BLIK received
15. `apps/web/src/app/pay/[recipient]/page.tsx` — Pay link

---

## Implementation Notes

- Все экраны используют один и тот же base layout
- Header внутри карточки, не отдельно
- Никаких цветных акцентов, только белый/серый
- BLIK карточка тоже в монохроме (убрать градиент)
- Network indicator всегда внизу карточки
