---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['prd.md', 'architecture.md']
project_name: 'E-Y'
date: '2026-01-11'
status: 'IN_PROGRESS'
total_epics: 6
total_stories: 21
completed_stories: 2
last_updated: '2026-01-11'
---

# E-Y - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for E-Y, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Create new wallet with BIP-39 seed phrase | MUST |
| FR-1.2 | Import wallet from 12/24-word seed phrase | MUST |
| FR-1.3 | Multi-account support from single seed | SHOULD |
| FR-1.4 | View token balances with USD equivalent | MUST |
| FR-1.5 | Transaction history with status and details | MUST |
| FR-2.1 | Send ETH/tokens to valid EVM address | MUST |
| FR-2.2 | Send to registered @username | MUST |
| FR-2.3 | Send via BLIK (6-digit code for receiver) | MUST |
| FR-2.4 | Show estimated gas fee before confirmation | MUST |
| FR-2.5 | Clear confirmation screen before sending | MUST |
| FR-3.1 | Display wallet address with copy button | MUST |
| FR-3.2 | Generate QR code for easy scanning | MUST |
| FR-3.3 | Show registered @username for sharing | SHOULD |
| FR-3.4 | Generate BLIK code for sender to pay | MUST |
| FR-4.1 | Generate unique 6-digit BLIK code | MUST |
| FR-4.2 | Code expires after 2 minutes | MUST |
| FR-4.3 | Receiver enters code to initiate transfer | MUST |
| FR-4.4 | Real-time notification when code entered | MUST |
| FR-4.5 | Code cannot be reused after transaction | MUST |
| FR-5.1 | User can claim unique @username | SHOULD |
| FR-5.2 | Resolve @username to wallet address | MUST |
| FR-5.3 | User can change their @username | SHOULD |
| FR-6.1 | Save and manage frequent recipients | SHOULD |
| FR-6.2 | Set up recurring transfers | COULD |
| FR-6.3 | Request payments from multiple people | COULD |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | App launch time | < 2 seconds |
| NFR-1.2 | Balance refresh | < 1 second |
| NFR-1.3 | BLIK code generation | < 500ms |
| NFR-1.4 | Transaction submission | < 3 seconds |
| NFR-2.1 | App crash rate | < 0.1% |
| NFR-2.2 | Transaction success rate | > 99% |
| NFR-2.3 | BLIK match rate | > 99.9% |
| NFR-3.1 | Seed phrase security | Secure enclave, never transmitted |
| NFR-3.2 | Private key protection | Never leave device, encrypted |
| NFR-3.3 | Network security | HTTPS only, certificate pinning |
| NFR-3.4 | Code audit readiness | Clean architecture, documented |
| NFR-4.1 | Onboarding completion | > 90% |
| NFR-4.2 | First transaction time | < 3 minutes |
| NFR-4.3 | BLIK flow completion | < 2 minutes |
| NFR-4.4 | Network abstraction | Zero chain selection |
| NFR-5.1 | iOS support | iOS 14+ |
| NFR-5.2 | Android support | Android 8+ (API 26) |

### Additional Requirements (from Architecture)

- **Starter Template:** create-expo-app with Development Builds (not Expo Go)
- **Monorepo:** Turborepo + pnpm with node-linker=hoisted
- **Mobile:** Expo SDK 54+, TypeScript strict, Redux Toolkit, Expo Router
- **Backend:** NestJS + PostgreSQL + WebSocket gateway for BLIK
- **Packages:** @e-y/shared (types, utils), @e-y/crypto (wallet, signing)
- **Storage:** expo-secure-store (secrets) + MMKV (settings)
- **RPC:** Alchemy primary, Infura fallback
- **Security:** User-configurable biometrics/PIN (off by default)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-1.1 | Epic 2 | Create wallet |
| FR-1.2 | Epic 2 | Import wallet |
| FR-1.3 | Epic 2 | Multi-account |
| FR-1.4 | Epic 2 | View balances |
| FR-1.5 | Epic 2 | Transaction history |
| FR-2.1 | Epic 3 | Send to address |
| FR-2.2 | Epic 5 | Send to @username |
| FR-2.3 | Epic 4 | Send via BLIK |
| FR-2.4 | Epic 3 | Gas estimation |
| FR-2.5 | Epic 3 | Transaction confirmation |
| FR-3.1 | Epic 3 | Show address |
| FR-3.2 | Epic 3 | QR code |
| FR-3.3 | Epic 5 | @username display |
| FR-3.4 | Epic 4 | BLIK receive |
| FR-4.1 | Epic 4 | Code generation |
| FR-4.2 | Epic 4 | Code expiration |
| FR-4.3 | Epic 4 | Code redemption |
| FR-4.4 | Epic 4 | Real-time matching |
| FR-4.5 | Epic 4 | Single use |
| FR-5.1 | Epic 5 | Register @username |
| FR-5.2 | Epic 5 | Lookup @username |
| FR-5.3 | Epic 5 | Update @username |
| FR-6.1 | Epic 6 | Contact book |
| FR-6.2 | Epic 6 | Scheduled payments |
| FR-6.3 | Epic 6 | Split bill |

## Epic List

### Epic 1: Project Foundation
**Goal:** Development infrastructure ready for feature implementation
**Outcome:** Developer can start building features with proper tooling

### Epic 2: Wallet Core
**Goal:** User can manage their crypto wallet
**FRs:** FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5
**Outcome:** Create, import, multi-account, balances, history

### Epic 3: Basic Transfers
**Goal:** User can send and receive crypto via address
**FRs:** FR-2.1, FR-2.4, FR-2.5, FR-3.1, FR-3.2
**Outcome:** Send to address, receive via QR, gas estimation

### Epic 4: BLIK System
**Goal:** User can transfer crypto via 6-digit codes
**FRs:** FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-2.3, FR-3.4
**Outcome:** BLIK codes for P2P transfers (killer feature)

### Epic 5: Identity (@username)
**Goal:** User can use human-readable addresses
**FRs:** FR-5.1, FR-5.2, FR-5.3, FR-2.2, FR-3.3
**Outcome:** @username instead of 0x addresses

### Epic 6: Feature Overlays
**Goal:** Additional convenience for regular users
**FRs:** FR-6.1, FR-6.2, FR-6.3
**Outcome:** Contacts, scheduled payments, split bill

---

## Epic 1: Project Foundation

**Goal:** Development infrastructure ready for feature implementation

### Story 1.1: Initialize Monorepo Structure ✅ COMPLETED

As a **developer**,
I want to have a configured monorepo with Turborepo and pnpm,
So that I can develop mobile and backend apps with shared packages.

**Status:** COMPLETED (2026-01-11)

**Acceptance Criteria:**

**Given** an empty project directory
**When** I run the initialization scripts
**Then** monorepo structure is created with:
- [x] `apps/mobile/` - Expo placeholder
- [x] `apps/api/` - NestJS placeholder
- [x] `packages/shared/` - @e-y/shared
- [x] `packages/crypto/` - @e-y/crypto
- [x] `turbo.json`, `pnpm-workspace.yaml`, `.npmrc` configured
**And** [x] `pnpm install` works without errors
**And** [x] `pnpm dev` starts all apps

---

### Story 1.2: Setup Expo Mobile App ✅ COMPLETED

As a **developer**,
I want the mobile app initialized with correct dependencies,
So that I can start building wallet features.

**Status:** COMPLETED (2026-01-11)

**Acceptance Criteria:**

**Given** monorepo from Story 1.1
**When** I initialize the Expo app
**Then** `apps/mobile/` contains:
- [x] Expo SDK 52+ with TypeScript
- [x] Expo Router with tabs template (Home, Wallet, Shard)
- [x] Redux Toolkit configured
- [x] expo-dev-client installed
- [x] EAS Build configured (eas.json)
- [x] Design system theme constants
**And** [x] `pnpm dev` starts the app in dev client mode

---

### Story 1.3: Setup NestJS Backend

As a **developer**,
I want the backend API initialized,
So that I can build @username and BLIK services.

**Acceptance Criteria:**

**Given** monorepo from Story 1.1
**When** I initialize the NestJS app
**Then** `apps/api/` contains:
- NestJS with TypeScript
- WebSocket gateway configured
- Health check endpoint at `/health`
- Environment config setup
**And** `pnpm dev` starts the API on port 3000

---

### Story 1.4: Create Shared Packages

As a **developer**,
I want shared packages with types and crypto utilities,
So that mobile and API can share code.

**Acceptance Criteria:**

**Given** monorepo from Story 1.1
**When** I build shared packages
**Then** `@e-y/shared` exports:
- TypeScript types (User, Wallet, Transaction, BlikCode)
- Constants (error codes, limits)
- Validation utilities
**And** `@e-y/crypto` exports:
- Wallet generation (BIP-39)
- Key derivation (HD wallet)
- Transaction signing
**And** both packages are importable from `apps/mobile` and `apps/api`

---

## Epic 2: Wallet Core

**Goal:** User can manage their crypto wallet

### Story 2.1: Create New Wallet

As a **user**,
I want to create a new wallet with a seed phrase,
So that I can start using E-Y.

**Acceptance Criteria:**

**Given** I am on the onboarding screen
**When** I tap "Create Wallet"
**Then** app generates 12-word BIP-39 seed phrase
**And** displays words with clear "write these down" instruction
**And** asks me to verify 3 random words
**And** on success, derives wallet address and stores encrypted seed in secure storage
**And** navigates to home screen with 0 balance

---

### Story 2.2: Import Existing Wallet

As a **user**,
I want to import my existing wallet,
So that I can access my funds in E-Y.

**Acceptance Criteria:**

**Given** I am on the onboarding screen
**When** I tap "Import Wallet" and enter valid 12/24-word seed
**Then** app validates seed phrase format
**And** derives wallet address
**And** stores encrypted seed in secure storage
**And** navigates to home screen
**Given** I enter invalid seed phrase
**Then** app shows error "Invalid seed phrase"

---

### Story 2.3: Multi-Account Support

As a **user**,
I want to create multiple accounts from one seed,
So that I can organize my funds.

**Acceptance Criteria:**

**Given** I have a wallet created
**When** I tap "Add Account" in settings
**Then** app derives new address (HD path index +1)
**And** shows new account in account selector
**And** I can switch between accounts
**And** each account shows its own balance

---

### Story 2.4: View Token Balances

As a **user**,
I want to see my token balances with USD value,
So that I know how much I have.

**Acceptance Criteria:**

**Given** I am on the home screen
**When** app loads
**Then** displays total balance in USD (prominent)
**And** lists tokens with:
- Token icon and symbol
- Token balance
- USD equivalent
**And** pull-to-refresh updates balances
**And** balance refresh < 1 second

---

### Story 2.5: Transaction History

As a **user**,
I want to see my transaction history,
So that I can track my activity.

**Acceptance Criteria:**

**Given** I am on the home screen
**When** I scroll to "Recent Transactions"
**Then** displays list of transactions with:
- Direction (sent/received)
- Amount and token
- Date/time
- Status (pending/confirmed/failed)
**And** tapping transaction shows details screen
**And** details include: tx hash, from/to addresses, gas used, block number

---

## Epic 3: Basic Transfers

**Goal:** User can send and receive crypto via address

### Story 3.1: Send to Address

As a **user**,
I want to send crypto to a wallet address,
So that I can transfer funds.

**Acceptance Criteria:**

**Given** I am on the Send screen
**When** I enter valid EVM address, amount, and select token
**Then** app validates address format
**And** checks sufficient balance (amount + gas)
**And** shows confirmation screen with amount, recipient, gas fee
**When** I confirm
**Then** app signs and broadcasts transaction
**And** shows pending status
**And** updates to confirmed when included in block
**Given** I enter invalid address
**Then** app shows "Invalid address" error

---

### Story 3.2: Gas Estimation & Confirmation

As a **user**,
I want to see gas fees before confirming,
So that I know the total cost.

**Acceptance Criteria:**

**Given** I am about to send a transaction
**When** I reach confirmation screen
**Then** displays:
- Amount being sent
- Estimated gas fee in ETH and USD
- Total cost (amount + gas)
**And** gas estimate updates if network conditions change
**And** "Confirm" button is disabled if insufficient balance for gas

---

### Story 3.3: Receive Screen (Address + QR)

As a **user**,
I want to display my address and QR code,
So that others can send me crypto.

**Acceptance Criteria:**

**Given** I am on the Receive screen
**When** screen loads
**Then** displays:
- My wallet address (truncated with full on tap)
- Copy button (copies full address)
- QR code encoding my address
- Share button
**And** copying shows "Address copied" toast
**And** QR code is scannable by other wallets

---

## Epic 4: BLIK System

**Goal:** User can transfer crypto via 6-digit codes

### Story 4.1: BLIK Backend (WebSocket Gateway)

As a **developer**,
I want WebSocket backend for BLIK coordination,
So that codes can be matched in real-time.

**Acceptance Criteria:**

**Given** NestJS backend from Epic 1
**When** I connect to `/blik` WebSocket namespace
**Then** can emit `create-code` with {amount, token, senderAddress}
**And** receives `code-created` with {code, expiresAt}
**And** can emit `redeem-code` with {code, receiverAddress}
**And** both parties receive `code-matched` with transfer details
**And** code auto-expires after 2 minutes with `code-expired` event
**And** code cannot be reused after transaction

---

### Story 4.2: Generate BLIK Code (Send Mode)

As a **sender**,
I want to generate a BLIK code for someone to receive,
So that I can send crypto without knowing their address.

**Acceptance Criteria:**

**Given** I am on Send screen, BLIK tab
**When** I enter amount and token and tap "Generate Code"
**Then** app connects to WebSocket and requests code
**And** displays large 6-digit code (e.g., "847291")
**And** shows countdown timer (2 minutes)
**And** shows "Waiting for receiver..."
**When** receiver enters code
**Then** I see "Receiver confirmed" with their address
**And** I can confirm and sign the transaction

---

### Story 4.3: Generate BLIK Code (Receive Mode)

As a **receiver**,
I want to generate a BLIK code for someone to send to me,
So that I can receive crypto without sharing my address.

**Acceptance Criteria:**

**Given** I am on Receive screen, BLIK tab
**When** I tap "Generate Code"
**Then** app creates receive-mode BLIK code
**And** displays large 6-digit code
**And** shows countdown timer (2 minutes)
**And** shows "Share this code with sender"
**When** sender enters my code
**Then** I see "Sender matched" with amount/token
**And** transaction proceeds automatically

---

### Story 4.4: Redeem BLIK Code

As a **user**,
I want to enter a BLIK code,
So that I can complete a transfer.

**Acceptance Criteria:**

**Given** I have a 6-digit BLIK code from another user
**When** I go to BLIK screen and enter the code
**Then** app sends code to WebSocket for matching
**Given** code is valid and not expired
**Then** shows matched transfer details (amount, token, counterparty)
**Given** code is expired or invalid
**Then** shows "Code expired" or "Invalid code" error

---

### Story 4.5: Real-time BLIK Transfer Completion

As a **user**,
I want the BLIK transfer to complete after matching,
So that funds are transferred.

**Acceptance Criteria:**

**Given** BLIK code is matched between sender and receiver
**When** sender confirms the transaction
**Then** sender signs and broadcasts on-chain transfer
**And** both parties see "Transaction pending" status
**When** transaction is confirmed on-chain
**Then** both parties see "Transfer complete" with tx hash
**And** balances update automatically
**And** transaction appears in history for both users

---

## Epic 5: Identity (@username)

**Goal:** User can use human-readable addresses

### Story 5.1: Register @username

As a **user**,
I want to claim a unique @username,
So that people can send to me easily.

**Acceptance Criteria:**

**Given** I am in Settings > Username
**When** I enter a username (3-20 chars, alphanumeric + underscore)
**Then** app checks availability via API
**Given** username is available
**Then** registers it linked to my current wallet address
**And** shows "Username registered" success
**Given** username is taken
**Then** shows "Username already taken" error

---

### Story 5.2: Username Lookup API

As a **developer**,
I want API endpoint to resolve usernames,
So that app can find addresses by username.

**Acceptance Criteria:**

**Given** username registry in database
**When** GET `/api/username/:name` is called
**Then** returns `{address, createdAt}` if found
**And** returns 404 if not found
**And** lookup is case-insensitive
**And** response time < 100ms

---

### Story 5.3: Send to @username

As a **user**,
I want to send crypto to @username,
So that I don't need wallet addresses.

**Acceptance Criteria:**

**Given** I am on Send screen
**When** I enter @username in recipient field
**Then** app resolves username to address via API
**Given** username exists
**Then** shows resolved address (truncated)
**And** allows me to proceed with transfer
**Given** username not found
**Then** shows "Username not found" error

---

### Story 5.4: Display @username on Receive

As a **user**,
I want my @username shown on receive screen,
So that I can share it instead of my address.

**Acceptance Criteria:**

**Given** I have registered @username
**When** I am on Receive screen
**Then** displays @username prominently above address
**And** "Share" includes @username in message
**Given** I don't have @username
**Then** shows "Set up @username" link

---

## Epic 6: Feature Overlays

**Goal:** Additional convenience for regular users

### Story 6.1: Contact Book

As a **user**,
I want to save frequent recipients,
So that I can send to them quickly.

**Acceptance Criteria:**

**Given** I am viewing a transaction or send screen
**When** I tap "Save Contact"
**Then** can enter a nickname for the address/@username
**And** contact is saved locally (MMKV)
**Given** I am on Send screen
**When** I tap contacts icon
**Then** shows list of saved contacts
**And** selecting a contact fills in recipient
**And** can edit or delete contacts

---

### Story 6.2: Scheduled Payments

As a **user**,
I want to schedule recurring payments,
So that I can automate regular transfers.

**Acceptance Criteria:**

**Given** I am on Send screen after entering details
**When** I tap "Schedule"
**Then** can select frequency (weekly, monthly)
**And** select start date and optional end date
**And** save scheduled payment
**Given** scheduled time arrives
**When** app is open (or background task runs)
**Then** prompts me to confirm/sign the scheduled payment
**And** shows list of scheduled payments in Settings

---

### Story 6.3: Split Bill

As a **user**,
I want to request payments from multiple people,
So that I can split expenses.

**Acceptance Criteria:**

**Given** I am on Split Bill screen
**When** I enter total amount, select contacts, choose split method (equal/custom)
**Then** creates payment requests for each participant
**And** sends notifications/generates shareable link
**Given** participant opens request
**Then** shows amount owed and pay button
**When** participant pays
**Then** updates split status (X of Y paid)
**And** shows completion when all paid

