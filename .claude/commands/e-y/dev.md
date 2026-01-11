---
name: ey-dev
description: Start development server for mobile app (Expo Go or dev client)
---

# E-Y Dev Command

Start the mobile development server.

## Process

1. Navigate to mobile app directory
2. Start Expo development server
3. Display QR code for Expo Go

## Command

```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile" && npx expo start
```

## Options

If user specifies:
- `--clear` or `-c`: Add `--clear` flag to clear cache
- `--tunnel` or `-t`: Add `--tunnel` flag for remote access
- `--lan` or `-l`: Add `--lan` flag for LAN access

## Output

Display the QR code and instructions:
- "Scan QR with Expo Go on iPhone"
- "Press 'i' for iOS simulator"
- "Press 'a' for Android emulator"
