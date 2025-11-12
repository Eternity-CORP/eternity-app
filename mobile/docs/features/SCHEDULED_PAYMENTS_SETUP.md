# 📦 Scheduled Payments - Setup Guide

## Required Dependencies

### Install NPM Packages

```bash
# Core dependencies
npm install zustand rrule uuid

# Type definitions
npm install --save-dev @types/uuid

# Background execution (optional, for BackgroundFetchAdapter)
npm install react-native-background-fetch

# iOS setup for background fetch
cd ios && pod install && cd ..
```

### Package Versions

```json
{
  "dependencies": {
    "zustand": "^4.4.7",
    "rrule": "^2.8.1",
    "uuid": "^9.0.1",
    "react-native-background-fetch": "^4.2.2"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.7"
  }
}
```

## Configuration

### iOS (Info.plist)

Add background modes:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>processing</string>
</array>
```

### Android (AndroidManifest.xml)

Add permissions:

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## Integration Steps

### 1. Install Dependencies

```bash
npm install zustand rrule uuid @types/uuid
npm install react-native-background-fetch
cd ios && pod install && cd ..
```

### 2. Add to App.tsx

```typescript
import { useSchedulerIntegration } from './features/schedule/integration/AppIntegration';

export default function App() {
  useSchedulerIntegration();
  
  return <YourApp />;
}
```

### 3. Add Settings Screen to Navigation

```typescript
import { SchedulerSettingsScreen } from './features/schedule/screens/SchedulerSettingsScreen';

// In your navigator
<Stack.Screen 
  name="SchedulerSettings" 
  component={SchedulerSettingsScreen}
  options={{ title: 'Scheduler Settings' }}
/>
```

### 4. Configure SendService Integration

```typescript
import { JobRunner } from './features/schedule/JobRunner';
import { sendNative, sendErc20 } from './wallet/send-service';
import { getProvider } from './wallet/providers';

// Create JobRunner with dependencies
const runner = new JobRunner({
  sendNative: async (params) => {
    return await sendNative({
      to: params.to,
      amount: params.amount,
      chainId: params.chainId,
      maxFeePerGas: params.maxFeePerGas,
      maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    });
  },
  sendErc20: async (params) => {
    return await sendErc20({
      tokenAddress: params.tokenAddress,
      to: params.to,
      amount: params.amount,
      chainId: params.chainId,
      maxFeePerGas: params.maxFeePerGas,
      maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    });
  },
  getProvider: (chainId) => getProvider(chainId),
});
```

## Testing

### Run Unit Tests

```bash
npm test src/features/schedule/__tests__/time-helpers.test.ts
npm test src/features/schedule/__tests__/JobRunner.test.ts
```

### Manual Testing

1. **Create a test payment:**
```typescript
const payment = useScheduledPayments.getState().addPayment({
  kind: 'one_time',
  chainId: 11155111, // Sepolia
  asset: { type: 'ETH' },
  fromAccountId: 'test-wallet',
  to: '0xRecipient...',
  amountHuman: '0.001',
  scheduleAt: Date.now() + 60000, // 1 minute from now
  tz: 'UTC',
});
```

2. **Enable background execution:**
   - Open Settings screen
   - Toggle "Background Execution"
   - Or manually: `await getSchedulerManager().setBackgroundEnabled(true)`

3. **Trigger manual execution:**
   - Tap "Execute Now" in Settings
   - Or: `await getSchedulerManager().tick()`

4. **Monitor execution:**
```typescript
getJobRunner().onJobStatusChanged((event) => {
  console.log('Payment status:', event);
});
```

## Troubleshooting

### Background Fetch Not Working

**iOS:**
- Check Background Modes in Xcode
- Enable Background App Refresh in Settings
- Test on real device (not simulator)

**Android:**
- Disable battery optimization for your app
- Check Doze mode settings
- Test on real device

### Payments Not Executing

1. **Check scheduler status:**
```typescript
const manager = getSchedulerManager();
console.log('Adapter:', manager.getAdapterName());
console.log('Background:', manager.isBackgroundEnabled());
```

2. **Check due payments:**
```typescript
const due = useScheduledPayments.getState().getDuePayments();
console.log('Due payments:', due.length);
```

3. **Check payment status:**
```typescript
const payment = useScheduledPayments.getState().getPayment(paymentId);
console.log('Status:', payment?.status);
console.log('Next run:', new Date(payment?.nextRunAt || 0));
```

### Lint Errors

The following lint errors are expected until dependencies are installed:

- `Cannot find module 'zustand'` - Install: `npm install zustand`
- `Cannot find module 'rrule'` - Install: `npm install rrule`
- `Cannot find module 'uuid'` - Install: `npm install uuid @types/uuid`
- `Cannot find module 'react-native-background-fetch'` - Install: `npm install react-native-background-fetch`

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure platform settings
3. ✅ Integrate into App.tsx
4. ✅ Add settings screen to navigation
5. ✅ Connect SendService
6. ✅ Test on Sepolia
7. ✅ Enable background execution
8. ✅ Monitor production usage

## Support

For issues or questions:
- Check logs: `console.log` statements throughout
- Review documentation: `docs/features/SCHEDULED_PAYMENTS.md`
- Test manually: Use Settings screen "Execute Now" button

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
