# E-Y Mobile App Pre-Launch Code Audit Report

**Date:** 2026-01-30
**Auditor:** Claude Code (automated audit)
**Scope:** `/apps/mobile/` codebase
**PRD Reference:** `docs/v1.0/prd.md`

---

## 1. Executive Summary

### Launch Readiness Assessment: CONDITIONAL READY

The E-Y mobile app has a solid foundation with most MVP features implemented. However, there are several **blockers** and **critical items** that should be addressed before production launch.

| Category | Status | Notes |
|----------|--------|-------|
| Core Wallet | READY | Create, import, multi-account working |
| BLIK System | READY | Full flow implemented with WebSocket |
| Send/Receive | READY | Address, @username, QR all working |
| Security | PARTIAL | Mnemonic secure, but no app lock |
| Feature Overlays | READY | Contacts, Scheduled, Split Bill done |
| Error Handling | ADEQUATE | Sentry integrated, basic error handling |
| Test Coverage | LOW | Only 6 test files, critical paths untested |

### Critical Blockers

1. **No App Lock / Biometric Authentication** - Architecture specifies this but not implemented
2. **Console.log statements** - 40+ instances in production code need removal/replacement
3. **Missing seed phrase verification step security** - Words shown on screen without biometric gate

### High Priority Items

1. Test coverage critically low (6 test files, 0 component tests)
2. Bridge feature incomplete (placeholder alerts)
3. Private key exposed in scheduled payment signing flow

---

## 2. TODO/FIXME List

| File | Line | Content |
|------|------|---------|
| `app/blik/confirm.tsx` | 463 | `TODO: Move to a config or fetch from backend` |
| `app/(tabs)/home.tsx` | 130 | `TODO: Integrate with bridge-service when ready` |

**Analysis:** Only 2 TODO comments found. The codebase is relatively clean in this regard.

---

## 3. Security Review

### 3.1 CRITICAL ISSUES

#### 3.1.1 No App Lock / Biometric Authentication

**Status:** NOT IMPLEMENTED

Per `architecture.md`, the app should have:
- Biometric authentication (FaceID/TouchID) for app launch
- PIN code option
- Transaction confirmation thresholds

**Current state:** The dependency `expo-local-authentication` is installed but **never used**. No security features directory exists (`features/security/`) and no auth screens exist (`app/(auth)/`).

**Impact:** Anyone with physical access to an unlocked phone can access the wallet and send funds.

**Recommendation:** HIGH PRIORITY - Implement app lock before any mainnet deployment.

#### 3.1.2 Private Key Exposure in Scheduled Payments

**Location:** `/apps/mobile/src/services/scheduled-signing.ts:33`

```typescript
interface SignScheduledPaymentParams {
  privateKey: string;  // Private key passed as parameter
  // ...
}
```

The private key is passed as a string parameter through the signing flow. While this happens in-memory, it creates a larger attack surface.

**Also found in:**
- `app/scheduled/create/confirm.tsx:103` - `privateKey: signingWallet.privateKey`
- `app/scheduled/[id].tsx:212` - `privateKey: signingWallet.privateKey`

**Recommendation:** Refactor to use wallet instance directly rather than extracting private key.

### 3.2 MODERATE ISSUES

#### 3.2.1 Mnemonic Stored in Redux State

**Location:** `/apps/mobile/src/store/slices/wallet-slice.ts:25`

```typescript
interface WalletState {
  mnemonic: string | null;  // Stored in Redux
  // ...
}
```

The mnemonic is kept in Redux state for the app session. While necessary for deriving wallets, this means:
- It persists in memory for the entire session
- Could be visible in Redux DevTools (if enabled)
- Survives navigation between screens

**Mitigation:** The mnemonic is stored securely via `expo-secure-store` on disk. Memory exposure is acceptable for a mobile app session.

#### 3.2.2 Environment Variables Properly Configured

**Status:** GOOD

- `.env` is gitignored
- `.env.example` exists with placeholder values
- API keys read from `process.env.EXPO_PUBLIC_*`
- No hardcoded API keys found

#### 3.2.3 Test File Contains Hardcoded Private Key

**Location:** `/apps/mobile/src/services/__tests__/scheduled-signing.test.ts:119`

```typescript
privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
```

This is the default Hardhat/Anvil test account private key (Account #0). This is acceptable for tests as long as it's never used with real funds.

**Recommendation:** Add a comment clarifying this is a well-known test key.

### 3.3 Security Best Practices Checklist

| Practice | Status | Notes |
|----------|--------|-------|
| Mnemonic never logged | YES | No console.log of mnemonic found |
| Mnemonic in SecureStore | YES | Using expo-secure-store |
| Private keys never transmitted | YES | All signing done locally |
| HTTPS for API calls | YES | API client uses HTTPS |
| No secrets in git | YES | .env gitignored |
| Input validation | PARTIAL | Address validation exists, some inputs unchecked |

---

## 4. Feature Completeness (vs PRD)

### 4.1 MVP Requirements Status

#### FR-1: Wallet Management

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-1.1 Create wallet | DONE | `app/(onboarding)/create-wallet.tsx` |
| FR-1.2 Import wallet | DONE | `app/(onboarding)/import-wallet.tsx` |
| FR-1.3 Multi-account | DONE | Home screen account selector |
| FR-1.4 View balances | DONE | Multi-network balance display |
| FR-1.5 Transaction history | DONE | `app/(tabs)/transactions.tsx` |

#### FR-2: Send Functionality

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-2.1 Send to address | DONE | Full send flow |
| FR-2.2 Send to @username | DONE | Integrated in recipient screen |
| FR-2.3 Send via BLIK | DONE | `app/blik/enter-code.tsx` |
| FR-2.4 Gas estimation | DONE | `send-service.ts` |
| FR-2.5 Transaction confirmation | DONE | `app/send/confirm.tsx` |

#### FR-3: Receive Functionality

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-3.1 Show address | DONE | `app/receive/index.tsx` |
| FR-3.2 QR code | DONE | Using react-native-qrcode-svg |
| FR-3.3 @username display | DONE | Shows if registered |
| FR-3.4 BLIK receive | DONE | `app/blik/receive/` flow |

#### FR-4: BLIK Code System

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-4.1 Code generation | DONE | WebSocket-based |
| FR-4.2 Code expiration | DONE | 2-minute timer displayed |
| FR-4.3 Code redemption | DONE | Enter code flow |
| FR-4.4 Real-time matching | DONE | Socket.IO integration |
| FR-4.5 Single use | DONE | Backend enforced |

#### FR-5: Identity (@username)

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-5.1 Register @username | DONE | `app/profile/username.tsx` |
| FR-5.2 Lookup @username | DONE | `username-service.ts` |
| FR-5.3 Update @username | DONE | Profile screen |

#### FR-6: Feature Overlays

| Requirement | Status | Location |
|-------------|--------|----------|
| FR-6.1 Contact book | DONE | contacts-slice, contacts-service |
| FR-6.2 Scheduled payments | DONE | Full CRUD flow |
| FR-6.3 Split bill | DONE | Full flow with privacy settings |

### 4.2 Additional Features Implemented (Beyond MVP)

| Feature | Status | Notes |
|---------|--------|-------|
| Token swap | PARTIAL | UI exists, LI.FI integration started |
| Bridge | PLACEHOLDER | UI exists, shows "Coming Soon" alert |
| AI Assistant | PARTIAL | UI exists, basic suggestions working |
| Network preferences | DONE | Per-user network selection |
| Smart scanning | DONE | Detects tokens on Tier 2 networks |
| Price charts | DONE | CoinGecko integration |
| Theme (light/dark) | DONE | System preference support |
| Test/Real account types | DONE | Separate testnet/mainnet accounts |

### 4.3 Missing from PRD

| Feature | PRD Priority | Status |
|---------|--------------|--------|
| App lock (biometric/PIN) | MUST (NFR-3) | NOT IMPLEMENTED |
| Certificate pinning | SHOULD (NFR-3) | NOT IMPLEMENTED |
| Seed phrase verification step | MUST | DONE |

---

## 5. Test Coverage

### 5.1 Current Test Files

| Test File | Coverage Area |
|-----------|---------------|
| `swap-service.test.ts` | Token formatting, chain detection |
| `preferences-service.test.ts` | Network preferences |
| `routing-service.test.ts` | Transaction routing |
| `bridge-service.test.ts` | Bridge functionality |
| `bridge-execution.test.ts` | Bridge execution flow |
| `scheduled-signing.test.ts` | Payment signing |

**Total: 6 test files**

### 5.2 Missing Test Coverage

| Critical Path | Test Status | Risk |
|---------------|-------------|------|
| Wallet generation/import | NO TESTS | HIGH |
| BLIK flow (send/receive) | NO TESTS | HIGH |
| Send transaction flow | NO TESTS | HIGH |
| Balance fetching | NO TESTS | MEDIUM |
| Contacts CRUD | NO TESTS | LOW |
| Split bill flow | NO TESTS | MEDIUM |

### 5.3 No Component Tests

**Status:** Zero `.test.tsx` files found

The entire component layer is untested. This includes:
- Onboarding flow
- Send flow screens
- BLIK screens
- Transaction confirmation

### 5.4 Test Configuration

Jest is properly configured with:
- ts-jest transform
- Path aliases (@/)
- Setup file exists
- Coverage collection configured for services

---

## 6. Console.log Audit

### 6.1 Production Console Statements

**Total: 40+ console.log/warn/error statements found**

| File | Count | Severity |
|------|-------|----------|
| `migration-service.ts` | 3 | LOW |
| `wallet-service.ts` | 3 | MEDIUM |
| `notification-service.ts` | 6 | LOW |
| `contacts-service.ts` | 1 | LOW |
| `storage.ts` | 5 | LOW |
| `smart-scanning-service.ts` | 4 | LOW |
| `price-chart-service.ts` | 8 | LOW |
| `theme-service.ts` | 3 | LOW |
| `swap-service.ts` | 1 | LOW |
| `send-service.ts` | 1 | MEDIUM |
| `transaction-service.ts` | 5 | LOW |

### 6.2 Recommended Action

The app has a `logger.ts` utility that wraps console methods with log levels. Most console statements should be migrated to use `createLogger()` for consistent logging that can be disabled in production.

**Example migration:**
```typescript
// Before
console.error('Error loading wallet:', error);

// After
const log = createLogger('WalletService');
log.error('Error loading wallet', error);
```

---

## 7. Recommendations (Prioritized)

### 7.1 CRITICAL (Block Launch)

1. **Implement App Lock / Biometric Authentication**
   - Create `app/(auth)/` screens for PIN and biometric
   - Create `features/security/` services and hooks
   - Add to settings menu
   - Gate seed phrase display behind authentication
   - **Effort:** 2-3 days

2. **Refactor Private Key Handling in Scheduled Payments**
   - Pass wallet instance instead of extracted private key
   - Use secure in-memory handling
   - **Effort:** 4 hours

### 7.2 HIGH PRIORITY (Pre-Launch)

3. **Add Core Unit Tests**
   - Wallet service tests (generate, import, derive)
   - BLIK service tests
   - Send service tests
   - Target: 60% coverage on services
   - **Effort:** 2-3 days

4. **Remove/Replace Console Statements**
   - Migrate all console.* to logger utility
   - Ensure logger is disabled in production builds
   - **Effort:** 4 hours

5. **Complete Bridge Integration**
   - Replace "Coming Soon" alerts with actual functionality
   - Or clearly disable the feature in UI
   - **Effort:** 1-2 days if disabling, 1 week if implementing

### 7.3 MEDIUM PRIORITY (Post-Launch)

6. **Add Component Tests**
   - Focus on critical flows: onboarding, send, BLIK
   - Use React Native Testing Library
   - **Effort:** 1 week

7. **Implement Certificate Pinning**
   - Add SSL pinning for API calls
   - Prevents MITM attacks
   - **Effort:** 1 day

8. **Add E2E Tests**
   - Detox or Maestro for critical user journeys
   - **Effort:** 1 week

### 7.4 LOW PRIORITY (Enhancement)

9. **Input Validation Hardening**
   - Add Zod schemas for all API responses
   - Validate user inputs more thoroughly
   - **Effort:** 2-3 days

10. **Performance Monitoring**
    - Add performance tracking for key flows
    - Monitor BLIK code resolution time (target <500ms)
    - **Effort:** 1 day

---

## 8. Positive Findings

The audit also identified several well-implemented aspects:

1. **Clean Architecture**: Feature-based organization matches architecture.md
2. **Type Safety**: TypeScript used throughout with proper typing
3. **State Management**: Redux Toolkit with proper status patterns (idle/loading/succeeded/failed)
4. **Error Tracking**: Sentry integration is well-configured
5. **Secure Storage**: Mnemonic properly stored in expo-secure-store
6. **Multi-Network Support**: Comprehensive network configuration
7. **Theme Support**: Dark/light mode with system preference
8. **Privacy Controls**: Split bill privacy settings implemented
9. **WebSocket Handling**: BLIK service has proper connection management
10. **Naming Conventions**: Consistent with architecture patterns

---

## 9. Appendix

### A. Files Reviewed

```
/apps/mobile/
├── app/                    # 60+ screen files
├── src/
│   ├── components/         # 35+ component files
│   ├── services/           # 20+ service files
│   ├── store/slices/       # 15+ Redux slices
│   ├── constants/          # Network, theme, faucet configs
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Format, logger, storage utilities
│   └── contexts/           # Theme context
├── package.json
├── app.json
├── jest.config.js
└── .env.example
```

### B. Tools Used

- Grep pattern search for TODOs, console statements, security patterns
- Glob file discovery
- Direct file reading for detailed analysis
- PRD cross-reference for feature completeness

### C. Audit Methodology

1. Scanned for TODO/FIXME comments
2. Searched for security anti-patterns (exposed keys, console.log with sensitive data)
3. Cross-referenced implemented features against PRD requirements
4. Reviewed test coverage
5. Analyzed error handling patterns
6. Checked architecture compliance

---

**Report Generated:** 2026-01-30
**Next Audit Recommended:** Before mainnet launch
