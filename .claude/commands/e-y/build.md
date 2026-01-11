---
name: ey-build
description: Build development client or production app
---

# E-Y Build Command

Build the mobile app for testing or production.

## Process

1. Check current platform target
2. Run EAS build with appropriate profile
3. Provide download/install instructions

## Commands by Profile

### Development (for testing)
```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"

# iOS Simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android
```

### Preview (internal testing)
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

### Production (app store)
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

## After Build

For simulator:
```bash
eas build:run --platform ios
```

For device: Download from EAS dashboard or scan QR code.

## Arguments

Parse user input:
- `ios` / `android` / `all` - platform selection
- `dev` / `preview` / `prod` - profile selection
- `--run` - auto-run after build (simulator only)
