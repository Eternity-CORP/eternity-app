# E-Y Manual Testing Checklist
## Date: 2026-02-27

**Web App:** https://e-y-app.vercel.app
**Mobile:** Expo Go -> e-y-api-production.up.railway.app
**Landing:** https://eternity-wallet.vercel.app

---

## FLOW 1: Onboarding (Web + Mobile)

### Web
- [x] W1.1: Open https://e-y-app.vercel.app — landing/gate loads
- [x] W1.2: Create new wallet — password screen appears
- [x] W1.3: Set password — wallet created, seed phrase shown
- [x] W1.4: Copy seed phrase — all 12 words visible
- [x] W1.5: Dashboard loads — balance displayed (0 ETH)
- [x] W1.6: Wallet address shown (0x...)
- [x] W1.7: Logout and re-login with password — wallet unlocked

### Mobile
- [x] M1.1: App opens — onboarding screen
- [x] M1.2: Create new wallet — seed phrase generated
- [x] M1.3: Confirm seed phrase — wallet created
- [x] M1.4: Home screen — balance, address visible
- [x] M1.5: Import wallet (use same seed from web) — same address shown

---

## FLOW 2: Receive (Web + Mobile)

### Web
- [x] W2.1: Navigate to Receive — address + QR code shown
- [x] W2.2: Copy address button works
- [x] W2.3: QR code is scannable

### Mobile
- [x] M2.1: Tap Receive — address shown
- [x] M2.2: QR code displays
- [x] M2.3: Share button works

---

## FLOW 3: Faucet (Get Test ETH)

### Web
- [x] W3.1: Faucet card visible on dashboard
- [x] W3.2: Request test ETH — transaction sent
- [x] W3.3: Balance updates after faucet

### Mobile
- [x] M3.1: Faucet option accessible
- [x] M3.2: Request test ETH works
- [x] M3.3: Balance updates

---

## FLOW 4: Send ETH (Web + Mobile)

### Web
- [x] W4.1: Navigate to Send
- [x] W4.2: Enter recipient address (0x...)
- [x] W4.3: Enter amount (0.001 ETH)
- [x] W4.4: Gas estimation shown
- [x] W4.5: Confirm — transaction sent
- [x] W4.6: Success screen with TX hash
- [x] W4.7: Balance decreased

### Mobile
- [x] M4.1: Tap Send
- [x] M4.2: Enter recipient
- [x] M4.3: Enter amount
- [x] M4.4: Confirm screen shows gas
- [x] M4.5: Transaction succeeds
- [x] M4.6: History shows new TX

---

## FLOW 5: @username (Web + Mobile)

### Web
- [ ] W5.1: Go to username settings
- [ ] W5.2: Register @username
- [ ] W5.3: Username shown in profile
- [ ] W5.4: Send to @username works

### Mobile
- [ ] M5.1: Profile > set username
- [ ] M5.2: Register @username
- [ ] M5.3: Username visible
- [ ] M5.4: Send via @username resolves correctly

---

## FLOW 6: BLIK (Web + Mobile)

### Web
- [ ] W6.1: Generate BLIK code — 6 digits shown
- [ ] W6.2: Timer counting down (2 min)
- [ ] W6.3: Enter BLIK code from another user — match found
- [ ] W6.4: Confirm BLIK transfer — success

### Mobile
- [ ] M6.1: BLIK > Generate code — 6 digits
- [ ] M6.2: Timer visible
- [ ] M6.3: BLIK > Enter code — enter 6 digits
- [ ] M6.4: Amount + confirm — transfer completes
- [ ] M6.5: Real-time status via WebSocket

---

## FLOW 7: AI Assistant (Web + Mobile)

### Web
- [ ] W7.1: Open AI chat
- [ ] W7.2: Send "What is my balance?" — correct response
- [ ] W7.3: Send "Send 0.001 ETH to [address]" — creates TX proposal
- [ ] W7.4: Suggestions appear after response
- [ ] W7.5: Typing indicator works

### Mobile
- [ ] M7.1: AI tab opens (first tab)
- [ ] M7.2: Chat UI loads
- [ ] M7.3: Send message — response streams in
- [ ] M7.4: Tool calls display (balance check, etc.)
- [ ] M7.5: Suggestion chips appear

---

## FLOW 8: Contacts (Web + Mobile)

### Web
- [ ] W8.1: Navigate to Contacts
- [ ] W8.2: Add new contact
- [ ] W8.3: Contact appears in list
- [ ] W8.4: Send to contact works

### Mobile
- [ ] M8.1: Contacts accessible
- [ ] M8.2: Add contact
- [ ] M8.3: Contact in list
- [ ] M8.4: Quick send from contact

---

## FLOW 9: Business Wallet (Web + Mobile)

### Web
- [ ] W9.1: Navigate to Business section
- [ ] W9.2: Create Business wallet (if not created)
- [ ] W9.3: Dashboard shows treasury balance
- [ ] W9.4: Token holders / shares visible
- [ ] W9.5: Create proposal
- [ ] W9.6: Vote on proposal
- [ ] W9.7: Vesting info displayed

### Mobile
- [ ] M9.1: Business tab/section accessible
- [ ] M9.2: Business dashboard loads
- [ ] M9.3: Proposals list
- [ ] M9.4: Vesting info

---

## FLOW 10: Swap (Web + Mobile)

### Web
- [ ] W10.1: Navigate to Swap
- [ ] W10.2: Select from/to tokens
- [ ] W10.3: Quote appears with rate
- [ ] W10.4: Execute swap (if balance allows)

### Mobile
- [ ] M10.1: Swap screen accessible
- [ ] M10.2: Token selection works
- [ ] M10.3: Quote loads

---

## FLOW 11: Multi-Network (Web + Mobile)

### Web
- [ ] W11.1: Network selector visible
- [ ] W11.2: Switch network — balance updates
- [ ] W11.3: Tokens show per-network breakdown

### Mobile
- [ ] M11.1: Network selector works
- [ ] M11.2: Different balances per network
- [ ] M11.3: Send on different network

---

## FLOW 12: Scheduled Payments (Web + Mobile)

### Web
- [ ] W12.1: Navigate to Scheduled
- [ ] W12.2: Create scheduled payment
- [ ] W12.3: Payment appears in list

### Mobile
- [ ] M12.1: Scheduled section accessible
- [ ] M12.2: Create scheduled payment
- [ ] M12.3: List displays correctly

---

## FLOW 13: Split Bill (Web + Mobile)

### Web
- [ ] W13.1: Navigate to Split
- [ ] W13.2: Create split request
- [ ] W13.3: Add participants
- [ ] W13.4: Split calculates correctly

### Mobile
- [ ] M13.1: Split section accessible
- [ ] M13.2: Create split
- [ ] M13.3: Participants added
- [ ] M13.4: Amounts calculated

---

## FLOW 14: Transaction History (Web + Mobile)

### Web
- [ ] W14.1: History page loads
- [ ] W14.2: Transactions listed with dates/amounts
- [ ] W14.3: Click TX — details shown
- [ ] W14.4: Filter/search works (if available)

### Mobile
- [ ] M14.1: Transactions tab
- [ ] M14.2: TX list renders
- [ ] M14.3: Tap TX — detail screen
- [ ] M14.4: Pull to refresh

---

## FLOW 15: Landing / Website

- [ ] L15.1: https://eternity-wallet.vercel.app loads
- [ ] L15.2: Hero section with 3D crystal/animation
- [ ] L15.3: Scroll through sections (Problem, Features, Roadmap)
- [ ] L15.4: CTA buttons work
- [ ] L15.5: Mobile responsive
- [ ] L15.6: Footer links (Privacy, Terms)
- [ ] L15.7: Performance — loads under 3 seconds

---

## BUG LOG

| # | Flow | Step | Platform | Description | Severity | Status |
|---|------|------|----------|-------------|----------|--------|
| 1 | F1 | W1.1 | Web | CSP blocked Onramper iframe on Buy Crypto page (`frame-src 'none'`) | High | FIXED — allowed `buy.onramper.com` in CSP |
| 2 | F1 | W1.1 | Web | Gate page used old WarpEffect (star warp) instead of LogoReveal animation | Cosmetic | FIXED — replaced with GateReveal component |
| 3 | F1 | W1.1 | Web | Home page had full mini-landing instead of simple Create/Import buttons | Cosmetic | FIXED — simplified to minimal layout |
| 4 | F1 | M1.1 | Mobile | `expo-speech-recognition` native module crash in Expo Go — app won't start | Critical | FIXED — conditional require with graceful fallback |
| 5 | F1 | M1.1 | Mobile | iOS Keychain persists wallet data after app reinstall — can't reset state | Medium | FIXED — added Delete Account button to Profile |
| 6 | F1 | M1.1 | Mobile | Welcome screen had test wallet button and outdated design | Cosmetic | FIXED — redesigned with clean minimal layout |
| 7 | F1 | M1.1 | Mobile | Welcome screen used placeholder icon instead of real Eternity logo | Cosmetic | FIXED — added logo_white/logo_black with theme switching |
| 8 | F4 | W4.4 | Web | Gas estimation used mainnet provider for test accounts — "Insufficient funds" even with Sepolia balance | High | FIXED — added Sepolia provider routing for test accounts |

Severity: Critical / High / Medium / Low / Cosmetic

---

## COMPLETION LOG

| Flow | Name | Status | Date | Bugs Found | Bugs Fixed | Notes |
|------|------|--------|------|------------|------------|-------|
| FLOW 1 | Onboarding | PASSED | 2026-02-28 | 7 | 7/7 | Web + Mobile. All critical/high bugs fixed in-session. Commits: `0d94d6c`, `d303535`, `4b8b09e` |
| FLOW 2 | Receive | PASSED | 2026-03-01 | 2 | 2/2 | Web + Mobile. Fixed: balance refresh spinner stuck, redesigned wallet buttons |
| FLOW 3 | Faucet | PASSED | 2026-03-01 | 0 | 0/0 | Web + Mobile. All checks passed, no bugs found |
| FLOW 4 | Send ETH | PASSED | 2026-03-01 | 1 | 1/1 | Web + Mobile (testnet). Bug: gas estimation used mainnet provider for test accounts → "Insufficient funds". Fixed: Sepolia provider routing + gas reserve on Max |
| FLOW 5 | @username | — | — | — | — | |
| FLOW 6 | BLIK | — | — | — | — | |
| FLOW 7 | AI Assistant | — | — | — | — | |
| FLOW 8 | Contacts | — | — | — | — | |
| FLOW 9 | Business Wallet | — | — | — | — | |
| FLOW 10 | Swap | — | — | — | — | |
| FLOW 11 | Multi-Network | — | — | — | — | |
| FLOW 12 | Scheduled | — | — | — | — | |
| FLOW 13 | Split Bill | — | — | — | — | |
| FLOW 14 | TX History | — | — | — | — | |
| FLOW 15 | Landing | — | — | — | — | |
