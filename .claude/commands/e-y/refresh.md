---
name: ey-refresh
description: Clear cache and restart development server
---

# E-Y Refresh Command

Clear all caches and restart fresh.

## Process

1. Stop any running servers
2. Clear Metro bundler cache
3. Clear Expo cache
4. Restart development server

## Command

```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/mobile"

# Clear and restart
npx expo start --clear
```

## When to Use

- After installing new packages
- When seeing stale/cached code
- After changing babel/metro config
- When hot reload stops working

## Full Reset (if needed)

```bash
cd "/Users/daniillogachev/Ma project/E-Y"

# Remove all node_modules and reinstall
pnpm clean
pnpm install

# Then restart
cd apps/mobile && npx expo start --clear
```
