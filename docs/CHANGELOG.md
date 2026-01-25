# E-Y Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### 2026-01-25 - Bridge Execution (Network Abstraction Complete)

#### Bridge Execution Implementation ✅
- **executeBridge()** — Execute bridge transactions via LI.FI Diamond contract
- **executeBridgeWithRetry()** — Automatic retry (2x) with exponential backoff
- **waitForBridgeCompletion()** — Poll LI.FI status API until bridge completes
- **checkBridgeAllowance() / approveBridgeToken()** — ERC-20 token approval flow
- **bridge-slice** — Redux state management for bridge progress tracking
- **Smart Send Thunks:**
  - `executeSmartSendThunk()` — Auto-routes to direct/bridge/consolidation
  - `executeBridgeSendThunk()` — Single bridge with approval flow
  - `executeConsolidationSendThunk()` — Collect funds from multiple networks
- **BridgeProgressSteps** — UI component for step-by-step progress display
- **Bridging Screen** — Full-screen progress with retry/cancel options
- **Confirm Screen Integration** — Automatically uses smart send when bridge needed

#### Network Abstraction v2 ✅
- Multi-network balance aggregation (ETH, Polygon, Arbitrum, Base, Optimism)
- Intelligent routing based on gas costs and recipient preferences
- Bridge quote fetching via LI.FI API
- Consolidation routing when no single network has enough funds
- Recipient network preferences support

#### AI Assistant v1.0 ✅
- Natural language interface for wallet operations
- Tools: get_balance, prepare_send, get_blik_code, prepare_swap
- Real blockchain data integration
- Follow-up responses after tool execution

### 2026-01-24 - AI Integration

#### Story: AI Assistant ✅
- Implemented AI chat interface with FAB (Floating Action Button)
- Created AI service with tool calling support
- Added backend AI endpoints with OpenRouter/Anthropic providers
- Integrated real blockchain data into AI tools
- Fixed tool execution and follow-up responses

### 2026-01-20 - Network Preferences

#### Story: Network Preferences ✅
- User can set default receiving network
- Per-token network overrides (e.g., "always receive USDC on Base")
- Backend API for preferences storage with signature verification
- Sender respects recipient's preferences when routing

### 2026-01-18 - Mobile Redesign

#### Story: Dark Theme Redesign ✅
- New dark theme matching website style
- Redesigned all screens with consistent styling
- Improved typography and spacing system
- New component library (ScreenHeader, TokenIcon, etc.)

### 2026-01-15 - Advanced Features

#### Story 6.1: Contact Book ✅
- Save frequent recipients with nicknames
- Auto-save option after transactions
- Quick selection in send flow

#### Story 6.2: Scheduled Payments ✅
- Create one-time or recurring payments
- Weekly/monthly intervals
- Execute from notification or app

#### Story 6.3: Split Bill ✅
- Create splits with multiple participants
- Track payment status per participant
- Share via link or contacts

### 2026-01-14 - BLIK & Username Systems

#### Epic 4: BLIK System ✅
- 6-digit code generation (send and receive modes)
- WebSocket real-time matching
- 2-minute expiration with countdown
- Single-use enforcement

#### Epic 5: Identity (@username) ✅
- Username registration with signature verification
- Username lookup and reverse lookup
- Send to @username in send flow

### 2026-01-13 - ERC-20 Token Support

#### Story: ERC-20 Tokens ✅
- Display ERC-20 balances with USD values
- Send ERC-20 tokens
- Token icons from CoinGecko

### 2026-01-12 - Transaction History

#### Story 2.5: Transaction History ✅
- Implemented Alchemy API integration for complete transaction history
- Created transaction service with `getAssetTransfers` API
- Added transaction history screen with pull-to-refresh
- Display transaction direction, amount, date/time, status
- Show recent transactions on home screen
- Fallback to block scanning if API unavailable
- Fixed text rendering errors in transaction UI

### 2026-01-11 - Project Foundation

#### Story 1.1: Initialize Monorepo Structure ✅
- Created monorepo with Turborepo + pnpm
- Setup `apps/mobile/` - Expo React Native app
- Setup `apps/api/` - NestJS backend
- Setup `packages/shared/` - @e-y/shared (types, utils)
- Setup `packages/crypto/` - @e-y/crypto (wallet, signing with ethers.js v6)
- Configured `turbo.json`, `pnpm-workspace.yaml`, `.npmrc`

#### Story 1.2: Setup Expo Mobile App ✅
- Configured Expo SDK 52+ with TypeScript strict mode
- Setup Expo Router with tabs (Home, Wallet, Shard)
- Configured Redux Toolkit store
- Added expo-dev-client for development builds
- Created EAS Build configuration (eas.json)
- Added design system theme constants (`src/constants/theme.ts`)
- Setup metro.config.js for monorepo support

#### Design System
- Analyzed World App reference design (10 screenshots)
- Created `docs/design/DESIGN_SYSTEM.md` with:
  - Color palette
  - Typography scale
  - Spacing system
  - Component patterns
  - Screen reference map

### Project Structure
```
e-y/
├── apps/
│   ├── mobile/           # Expo React Native
│   │   ├── app/          # Expo Router pages
│   │   │   └── (tabs)/   # Tab navigation
│   │   └── src/          # Source code
│   └── api/              # NestJS backend
├── packages/
│   ├── shared/           # @e-y/shared
│   └── crypto/           # @e-y/crypto
└── docs/
    ├── v1.0/             # Documentation
    └── design/           # Design assets
```

---

## Upcoming

### Story 1.3: Setup NestJS Backend
- WebSocket gateway for BLIK
- Health check endpoint
- Environment configuration

### Story 1.4: Create Shared Packages
- Complete types (BlikCode, etc.)
- Validation utilities
- Error codes
