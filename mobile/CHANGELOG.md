# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Notification Trigger Format** - Updated deprecated notification trigger format
  - Changed from `trigger: new Date()` to `trigger: { type: 'date', date: new Date() }`
  - Fixes warning: "You are using a deprecated parameter type for the notification trigger"
  - Added missing `shouldShowBanner` and `shouldShowList` fields to NotificationBehavior
  - Files affected: `src/services/scheduledPaymentService.ts`

### Added
- **Feature Flags** - Mainnet rollout system with kill-switch
  - `SCHEDULE_MAINNET_ENABLED` flag (default: false)
  - `SPLIT_MAINNET_ENABLED` flag (default: false)
  - Network-specific feature control
  - UI blocking components for disabled features

- **Smoke Tests** - Manual mainnet validation scripts
  - `scripts/mainnet/schedule-smoke.ts` - Schedule payment smoke test
  - `scripts/mainnet/split-smoke.ts` - Split bill smoke test
  - Manual confirmation required
  - Detailed logging with transaction hashes

- **Error Handling** - Unified error mapping and retry policies
  - `ErrorMapper` for blockchain errors
  - `RetryPolicy` with exponential backoff
  - Localized error messages (EN/RU)
  - Action suggestions for users

- **E2E Tests** - Sepolia testnet integration tests
  - Schedule one-time payment tests
  - Schedule recurring payment tests (RRULE)
  - Split bill payment tests
  - Split bill collection tests

- **Security Features** - Fee caps and biometric approval
  - Configurable fee limits (soft/hard caps)
  - Biometric confirmation for high-value transactions
  - Batch transaction fee checking
  - Warning system for fee overages

### Documentation
- Release checklist for mainnet rollout
- Mainnet rollout guide
- Error handling guide
- Fee caps and biometric approval guide
- E2E testing documentation

## [1.0.0] - 2025-11-12

### Initial Release
- Scheduled payments (one-time and recurring)
- Split bills (payment and collection)
- Multi-network support (Ethereum, Polygon, BSC, etc.)
- Testnet support (Sepolia, Mumbai, etc.)
- Transaction management
- Wallet integration
