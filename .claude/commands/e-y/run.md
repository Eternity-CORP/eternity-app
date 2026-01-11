---
name: ey-run
description: Run the latest build on simulator/emulator
---

# E-Y Run Command

Run the latest development build on simulator or emulator.

## Process

1. Check for latest build
2. Download and install on simulator/emulator
3. Launch the app

## Commands

### iOS Simulator
```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"
eas build:run --platform ios
```

### Android Emulator
```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"
eas build:run --platform android
```

## Notes

- This runs the LATEST cloud build
- For code changes, use `/ey-dev` (hot reload)
- Rebuild only needed for native module changes
