# RPC Configuration Guide

## Overview

The app uses multiple RPC endpoints with automatic fallback for reliability. Public RPC endpoints can be unstable, so for production use, it's recommended to configure your own providers.

## Current Configuration

### Default Networks
- **Mainnet**: Cloudflare ETH
- **Sepolia**: Ethereum Foundation RPC (`rpc.sepolia.org`)
- **Holesky**: PublicNode (`ethereum-holesky-rpc.publicnode.com`)

### Fallback Chain
Each network has multiple fallback RPCs that are tested automatically:
1. Alchemy (if configured)
2. Infura (if configured)
3. Public fallback from `.env`
4. Additional public endpoints

## Recommended Setup for Production

### 1. Get API Keys (Free Tier Available)

**Alchemy** (Recommended)
- Sign up: https://www.alchemy.com/
- Create apps for each network
- Free tier: 300M compute units/month

**Infura** (Alternative)
- Sign up: https://www.infura.io/
- Create projects for each network
- Free tier: 100k requests/day

### 2. Configure Environment Variables

Edit `mobile/.env`:

```bash
# Alchemy URLs (recommended)
EXPO_PUBLIC_ALCHEMY_MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
EXPO_PUBLIC_ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
EXPO_PUBLIC_ALCHEMY_HOLESKY_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_API_KEY

# OR Infura URLs
EXPO_PUBLIC_INFURA_MAINNET_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
EXPO_PUBLIC_INFURA_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
EXPO_PUBLIC_INFURA_HOLESKY_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
```

### 3. Restart the App

```bash
cd mobile
npm start -- --clear
```

## Troubleshooting

### Common Issues

**"No nodes available" Error**
- Public RPC is overloaded or down
- App will automatically try fallback endpoints
- Configure Alchemy/Infura for better reliability

**Timeout Errors**
- Network congestion or slow endpoint
- App will retry with next fallback (5s timeout per endpoint)
- Check your internet connection

**403 "Unsupported platform" Error**
- Some public RPCs block mobile platforms
- Already handled by fallback mechanism
- Use Alchemy/Infura to avoid this

### Monitoring RPC Health

The app logs all RPC attempts:
```
🔍 Testing RPC endpoints...
✅ RPC https://rpc.sepolia.org works! Block: 12345 (234ms)
❌ RPC https://example.com failed: Timeout (5000ms)
```

### Manual Provider Cache Clear

If experiencing persistent issues:
```typescript
import { clearProviderCache } from './services/blockchain/ethereumProvider';

// Clear cache for specific network
clearProviderCache('sepolia');

// Or clear all
clearProviderCache();
```

## Best Practices

1. **Always configure Alchemy or Infura for production**
   - Public RPCs are unreliable and rate-limited
   - Free tiers are sufficient for most apps

2. **Monitor RPC performance**
   - Check logs for frequent fallbacks
   - Switch to better providers if needed

3. **Use multiple providers**
   - Configure both Alchemy AND Infura
   - App will use the first available

4. **Test on real devices**
   - Some RPCs behave differently on mobile vs web
   - Test all networks before production

## Technical Details

### Fallback Mechanism
- Each RPC is tested with 5-second timeout
- First successful response is used
- Failed providers are skipped
- Cache is cleared on network switch

### Provider Priority
1. Alchemy (env var)
2. Infura (env var)
3. Public fallback (env var)
4. Hardcoded public endpoints

### Files
- `mobile/.env` - Environment configuration
- `mobile/src/config/env.ts` - Config loader
- `mobile/src/constants/rpcUrls.ts` - RPC lists
- `mobile/src/services/blockchain/ethereumProvider.ts` - Provider logic
