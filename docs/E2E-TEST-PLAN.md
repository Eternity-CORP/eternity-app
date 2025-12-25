# E-Y Wallet — E2E Test Plan

**Version:** 1.0  
**Created:** December 24, 2025  
**Target:** MVP Completion Testing

---

## Prerequisites

### Environment Setup
```bash
# Terminal 1: Start Backend
cd backend
cp .env.example .env  # Configure DB connection
npm install
npm run start:dev

# Terminal 2: Start Mobile
cd mobile
npm install
npx expo start
```

### Test Accounts
- **Testnet Faucets:**
  - Sepolia: https://sepoliafaucet.com/ or https://faucet.sepolia.dev/
  - Holesky: https://holesky-faucet.pk910.de/
- **Minimum Balance:** 0.1 ETH on Sepolia for gas fees

---

## Test Scenarios

### 1. Wallet Creation & Import

#### TC-1.1: Create New Wallet (12 words)
- [ ] Open app → Tap "Create Wallet"
- [ ] Select "12 words"
- [ ] Verify 12-word mnemonic is displayed
- [ ] Confirm mnemonic backup
- [ ] Wallet created successfully
- [ ] Home screen shows address and 0 balance

#### TC-1.2: Create New Wallet (24 words)
- [ ] Open app → Tap "Create Wallet"
- [ ] Select "24 words"
- [ ] Verify 24-word mnemonic is displayed
- [ ] Confirm backup
- [ ] Wallet created successfully

#### TC-1.3: Import Existing Wallet
- [ ] Open app → Tap "Import Wallet"
- [ ] Enter valid 12/24 word mnemonic
- [ ] Wallet imported successfully
- [ ] Verify address matches expected

#### TC-1.4: Invalid Mnemonic Rejection
- [ ] Try to import with invalid words
- [ ] Error message displayed
- [ ] App doesn't crash

---

### 2. Security Features

#### TC-2.1: PIN Setup
- [ ] Navigate to Settings → Security
- [ ] Set PIN (minimum 4 characters)
- [ ] Confirm PIN
- [ ] Close and reopen app
- [ ] PIN required on app launch

#### TC-2.2: Biometric Setup (if available)
- [ ] Enable biometric in Security settings
- [ ] Close and reopen app
- [ ] Biometric prompt shown
- [ ] Successful authentication

#### TC-2.3: PIN Lockout
- [ ] Enter wrong PIN 5 times
- [ ] Lockout message displayed
- [ ] Wait for lockout period
- [ ] Can try again after lockout

---

### 3. Demo/Live Mode

#### TC-3.1: Demo Mode (Default)
- [ ] Fresh install shows Demo mode
- [ ] Only testnet networks available (Sepolia, Holesky)
- [ ] Demo indicator visible on Home screen

#### TC-3.2: Switch to Live Mode
- [ ] Settings → Wallet Mode → Live
- [ ] Warning dialog shown
- [ ] Confirm switch
- [ ] Only Mainnet available
- [ ] Network switches to Mainnet

#### TC-3.3: Switch back to Demo
- [ ] Settings → Wallet Mode → Demo
- [ ] Network switches to Sepolia
- [ ] Testnets available again

---

### 4. Same-Chain Transfers

#### TC-4.1: Send ETH (Sepolia)
- [ ] Ensure Demo mode + Sepolia selected
- [ ] Have at least 0.01 ETH balance
- [ ] Tap Send → Enter recipient address
- [ ] Enter amount (0.001 ETH)
- [ ] Review gas estimation
- [ ] Confirm transaction
- [ ] Biometric/PIN authentication
- [ ] Transaction submitted
- [ ] txHash displayed
- [ ] Balance updated after confirmation

#### TC-4.2: Receive ETH
- [ ] Tap Receive
- [ ] QR code displayed
- [ ] Address displayed and copyable
- [ ] Send from external wallet to this address
- [ ] Balance updates

#### TC-4.3: Insufficient Balance Error
- [ ] Try to send more than balance
- [ ] Error message shown
- [ ] Transaction not submitted

---

### 5. BLIK Payments

#### TC-5.1: Create BLIK Code
- [ ] Navigate to BLIK → Create Code
- [ ] Enter amount (0.001 ETH)
- [ ] Select token (ETH)
- [ ] Generate code
- [ ] 6-character code displayed
- [ ] Expiration timer shown (5 min default)

#### TC-5.2: Pay BLIK Code (Same-chain)
- [ ] Different wallet: Navigate to BLIK → Pay Code
- [ ] Enter the generated code
- [ ] Code info displayed (recipient, amount)
- [ ] Get quote
- [ ] Confirm payment
- [ ] Transaction sent
- [ ] Code marked as used

#### TC-5.3: BLIK Code Expiration
- [ ] Create code with short TTL
- [ ] Wait for expiration
- [ ] Try to pay → Error "Code expired"

#### TC-5.4: Cancel BLIK Code
- [ ] Create code
- [ ] Cancel code before payment
- [ ] Code no longer payable

---

### 6. Cross-Chain Transfers

#### TC-6.1: Cross-chain Quote
- [ ] Send screen → Select different destination chain
- [ ] Get cross-chain quote
- [ ] Multiple routes displayed (LiFi, Socket)
- [ ] Fee and duration shown

#### TC-6.2: Execute Cross-chain Transfer
- [ ] Select best route
- [ ] Confirm transaction
- [ ] Biometric/PIN authentication
- [ ] Transaction submitted
- [ ] Status screen shows progress
- [ ] Transaction completes on destination chain

**Note:** Cross-chain between testnets may not be supported by bridges. Test on mainnet if needed.

---

### 7. Transaction History

#### TC-7.1: View Transaction History
- [ ] After sending transactions
- [ ] Navigate to History
- [ ] Transactions listed
- [ ] Correct amounts and addresses shown

#### TC-7.2: Transaction Details
- [ ] Tap on transaction
- [ ] Details screen opens
- [ ] txHash, status, gas fee displayed
- [ ] Explorer link works

---

### 8. Global Identity

#### TC-8.1: Register Nickname
- [ ] Profile → Register nickname
- [ ] Enter unique nickname (@username)
- [ ] Registration successful
- [ ] Nickname displayed in profile

#### TC-8.2: Send by Nickname
- [ ] Send screen → Enter @nickname
- [ ] Recipient resolved
- [ ] Transaction sends to correct address

---

### 9. Settings & Preferences

#### TC-9.1: Language Change
- [ ] Settings → Language
- [ ] Change to Russian
- [ ] App text changes to Russian
- [ ] Restart app → Language persists

#### TC-9.2: Privacy Settings
- [ ] Settings → Privacy
- [ ] Enable "Hide Balance"
- [ ] Balance shows "***"
- [ ] Restart app → Setting persists

#### TC-9.3: Notification Settings
- [ ] Settings → Notifications
- [ ] Toggle settings
- [ ] Restart app → Settings persist

---

### 10. Multi-Account Management

#### TC-10.1: Create Second Account
- [ ] Account switcher → Create new account
- [ ] Account 2 created
- [ ] Different address from Account 1

#### TC-10.2: Switch Accounts
- [ ] Switch to Account 2
- [ ] Balance and address update
- [ ] Switch back to Account 1

#### TC-10.3: Rename Account
- [ ] Account settings → Rename
- [ ] New name saved
- [ ] Name persists after restart

---

## Regression Checklist

After all tests pass, verify:
- [ ] App doesn't crash on any flow
- [ ] All settings persist across restarts
- [ ] Balances update correctly
- [ ] Transactions appear in history
- [ ] Error messages are user-friendly
- [ ] No console errors in Metro bundler

---

## Test Results

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Wallet Creation | | | |
| Security | | | |
| Demo/Live Mode | | | |
| Same-chain Transfers | | | |
| BLIK Payments | | | |
| Cross-chain | | | |
| Transaction History | | | |
| Global Identity | | | |
| Settings | | | |
| Multi-Account | | | |

---

## Known Limitations

1. **Cross-chain testnets:** Most bridges don't support testnet-to-testnet transfers
2. **Faucet limits:** Testnet faucets may have daily limits
3. **BLIK cross-chain:** Requires real cross-chain route availability

---

**Tester:** _______________  
**Date:** _______________  
**Result:** ☐ PASS / ☐ FAIL
