# 📱 Manual QA: Send & Receive Testing

**Comprehensive manual testing scenarios for wallet functionality**

## 📋 Test Environment Setup

### Prerequisites

- [ ] Device/Emulator ready (iOS or Android)
- [ ] App installed and running
- [ ] Test seed phrase available
- [ ] Access to Sepolia faucet
- [ ] Test recipient address ready
- [ ] Network connection stable

### Test Data

**Test Seed Phrase:**
```
test test test test test test test test test test test junk
```
**Expected Address:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Test Recipient:**
```
0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Sepolia Faucets:**
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/

---

## 🧪 Test Scenario 1: Import Wallet & Receive ETH

**Objective:** Verify wallet import and incoming transaction detection

### 1.1 Import Seed Phrase

**Steps:**
1. [ ] Open app
2. [ ] Tap "Import Wallet" (or "Restore from Seed")
3. [ ] Enter test seed phrase word by word
4. [ ] Tap "Import" or "Continue"
5. [ ] Wait for wallet creation

**Expected Results:**
- [ ] Seed phrase accepted without errors
- [ ] Wallet created successfully
- [ ] Home screen displayed

**Actual Results:**
```
Status: ___________
Notes: _____________________________________________
```

### 1.2 Verify Address

**Steps:**
1. [ ] Navigate to "Receive" screen
2. [ ] Check displayed address
3. [ ] Verify QR code generated
4. [ ] Tap "Copy Address"

**Expected Results:**
- [ ] Address matches: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- [ ] QR code displayed correctly
- [ ] Address copied to clipboard
- [ ] Success toast/message shown

**Actual Results:**
```
Address: ___________________________________________
QR Code: [ ] OK  [ ] Not OK
Copy: [ ] OK  [ ] Not OK
```

### 1.3 Get Test ETH from Faucet

**Steps:**
1. [ ] Copy wallet address
2. [ ] Open faucet: https://sepoliafaucet.com/
3. [ ] Paste address
4. [ ] Request test ETH
5. [ ] Wait for faucet confirmation

**Expected Results:**
- [ ] Faucet accepts request
- [ ] Transaction hash provided
- [ ] Confirmation message shown

**Actual Results:**
```
Faucet TX: __________________________________________
Amount: ____________________________________________
Time: ______________________________________________
```

### 1.4 Detect Incoming Transaction

**Steps:**
1. [ ] Return to app
2. [ ] Wait on Home screen (or pull to refresh)
3. [ ] Observe for incoming transaction notification
4. [ ] Check balance update
5. [ ] Navigate to "History" or "Transactions"

**Expected Results:**
- [ ] Incoming transaction detected within 30 seconds
- [ ] Notification/banner shown: "You received X ETH"
- [ ] Balance updated on Home screen
- [ ] Transaction appears in history
- [ ] Status shows "Pending" initially
- [ ] Status updates to "Confirmed" after 2+ blocks

**Actual Results:**
```
Detection Time: ____________________________________
Notification: [ ] Shown  [ ] Not Shown
Balance Updated: [ ] Yes  [ ] No
In History: [ ] Yes  [ ] No
Status: ____________________________________________
Confirmations: _____________________________________
```

**Screenshots:**
- [ ] Home screen with balance
- [ ] Incoming notification
- [ ] Transaction in history

---

## 🧪 Test Scenario 2: Send ETH

**Objective:** Verify outgoing ETH transactions with various scenarios

### 2.1 Send to Valid Address (Happy Path)

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Select "ETH" (if token selection available)
3. [ ] Enter recipient: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
4. [ ] Enter amount: `0.001` ETH
5. [ ] Review gas fee options (Low/Medium/High)
6. [ ] Select "Medium" gas
7. [ ] Tap "Send" or "Continue"
8. [ ] Review transaction summary
9. [ ] Confirm transaction

**Expected Results:**
- [ ] Address validation passes (checksum)
- [ ] Amount accepted
- [ ] Gas fees displayed in ETH and USD (if available)
- [ ] Summary shows:
  - Recipient address
  - Amount: 0.001 ETH
  - Gas fee estimate
  - Total cost
- [ ] Transaction sent successfully
- [ ] Transaction hash shown
- [ ] "Pending" status displayed
- [ ] Redirected to transaction details or history

**Actual Results:**
```
TX Hash: ___________________________________________
Gas Fee: ___________________________________________
Total Cost: ________________________________________
Status: ____________________________________________
Time to Confirm: ___________________________________
```

**Screenshots:**
- [ ] Send screen with filled data
- [ ] Transaction summary
- [ ] Success confirmation
- [ ] Transaction in history

### 2.2 Send to Invalid Address

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Enter invalid address: `0xinvalid`
3. [ ] Try to proceed

**Expected Results:**
- [ ] Error shown: "Invalid address"
- [ ] Cannot proceed to next step
- [ ] Error message clear and helpful

**Actual Results:**
```
Error Message: _____________________________________
Blocked: [ ] Yes  [ ] No
```

### 2.3 Send to Non-Checksum Address

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Enter lowercase address: `0x70997970c51812dc3a010c7d01b50e0d17dc79c8`
3. [ ] Observe behavior

**Expected Results:**
- [ ] Address auto-converted to checksum, OR
- [ ] Warning shown about checksum, OR
- [ ] Address accepted as-is (depending on implementation)

**Actual Results:**
```
Behavior: __________________________________________
Warning: [ ] Shown  [ ] Not Shown
```

### 2.4 Insufficient Funds

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Enter amount greater than balance (e.g., `100` ETH)
3. [ ] Try to proceed

**Expected Results:**
- [ ] Error shown: "Insufficient balance" or similar
- [ ] Cannot proceed
- [ ] Shows available balance
- [ ] Suggests reducing amount

**Actual Results:**
```
Error Message: _____________________________________
Available Balance Shown: [ ] Yes  [ ] No
Helpful Hint: [ ] Yes  [ ] No
```

### 2.5 Insufficient Funds for Gas

**Steps:**
1. [ ] Send almost all balance (leave < 0.001 ETH)
2. [ ] Try to send remaining amount
3. [ ] Observe error

**Expected Results:**
- [ ] Error shown: "Insufficient funds for gas"
- [ ] Explains gas fee needed
- [ ] Suggests reducing amount

**Actual Results:**
```
Error Message: _____________________________________
Gas Fee Shown: [ ] Yes  [ ] No
```

### 2.6 Manual Gas Fee Adjustment

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Enter valid recipient and amount
3. [ ] Tap "Advanced" or "Edit Gas"
4. [ ] Manually adjust gas price or limit
5. [ ] Set very low gas price (e.g., 1 Gwei)
6. [ ] Confirm and send

**Expected Results:**
- [ ] Advanced gas options accessible
- [ ] Can edit gas price/limit
- [ ] Warning shown for low gas price
- [ ] Transaction sent (may be slow)
- [ ] Transaction pending for longer time

**Actual Results:**
```
Advanced Options: [ ] Available  [ ] Not Available
Gas Price Set: _____________________________________
Warning Shown: [ ] Yes  [ ] No
TX Status: _________________________________________
```

### 2.7 Transaction Speed Up (Replacement)

**Prerequisites:** Have a pending transaction with low gas

**Steps:**
1. [ ] Send transaction with low gas (from 2.6)
2. [ ] Wait for it to be pending (not confirmed)
3. [ ] Navigate to transaction in history
4. [ ] Tap "Speed Up" or similar option
5. [ ] Review new gas fee (should be ~12.5% higher)
6. [ ] Confirm speed up

**Expected Results:**
- [ ] "Speed Up" option available for pending tx
- [ ] New gas fee shown (at least 10% higher)
- [ ] Additional cost displayed
- [ ] Confirmation dialog shown
- [ ] Replacement transaction sent
- [ ] Original transaction replaced
- [ ] New transaction confirmed faster

**Actual Results:**
```
Speed Up Available: [ ] Yes  [ ] No
Old Gas Fee: _______________________________________
New Gas Fee: _______________________________________
Increase %: ________________________________________
Replacement TX: ____________________________________
Confirmed: [ ] Yes  [ ] No
```

**Screenshots:**
- [ ] Pending transaction
- [ ] Speed up dialog
- [ ] New transaction confirmed

---

## 🧪 Test Scenario 3: Add Token & Send ERC-20

**Objective:** Verify token management and ERC-20 transactions

### 3.1 Add Custom Token

**Test Token (Sepolia USDC):**
```
Address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Symbol: USDC
Decimals: 6
```

**Steps:**
1. [ ] Navigate to "Manage Tokens" or "Add Token"
2. [ ] Tap "Add Custom Token"
3. [ ] Enter token address
4. [ ] Wait for auto-fill (symbol, decimals)
5. [ ] Verify token details
6. [ ] Tap "Add" or "Save"
7. [ ] Return to Home screen

**Expected Results:**
- [ ] Token address accepted
- [ ] Symbol auto-filled: "USDC"
- [ ] Decimals auto-filled: 6
- [ ] Token added successfully
- [ ] Token appears in token list
- [ ] Balance shown (0 or actual balance)

**Actual Results:**
```
Symbol: ____________________________________________
Decimals: __________________________________________
Balance: ___________________________________________
Visible on Home: [ ] Yes  [ ] No
```

### 3.2 Get Test Tokens

**Steps:**
1. [ ] Visit token faucet (if available)
2. [ ] Or use test account with tokens
3. [ ] Send tokens to your address
4. [ ] Wait for transaction

**Expected Results:**
- [ ] Incoming token transaction detected
- [ ] Token balance updated
- [ ] Transaction in history

**Actual Results:**
```
Faucet/Source: _____________________________________
Amount Received: ___________________________________
Balance Updated: [ ] Yes  [ ] No
```

### 3.3 Send ERC-20 Token

**Steps:**
1. [ ] Navigate to "Send" screen
2. [ ] Select token (USDC)
3. [ ] Enter recipient address
4. [ ] Enter amount (e.g., `10` USDC)
5. [ ] Review gas fee (in ETH)
6. [ ] Confirm and send

**Expected Results:**
- [ ] Token selected correctly
- [ ] Amount validated against token balance
- [ ] Gas fee shown in ETH (not token)
- [ ] Transaction summary shows:
  - Token symbol and amount
  - Recipient
  - Gas fee in ETH
- [ ] Transaction sent successfully
- [ ] Token balance decreased
- [ ] ETH balance decreased (gas only)

**Actual Results:**
```
Token: _____________________________________________
Amount Sent: _______________________________________
Gas Fee (ETH): _____________________________________
TX Hash: ___________________________________________
Token Balance After: _______________________________
ETH Balance After: _________________________________
```

**Screenshots:**
- [ ] Token selection
- [ ] Send screen
- [ ] Transaction confirmed

### 3.4 View Token Transaction in History

**Steps:**
1. [ ] Navigate to "History" or "Transactions"
2. [ ] Find token transaction
3. [ ] Tap to view details

**Expected Results:**
- [ ] Transaction appears in history
- [ ] Shows token symbol and amount
- [ ] Direction indicator (sent/received)
- [ ] Status (pending/confirmed)
- [ ] Details show:
  - Token contract address
  - Recipient
  - Amount
  - Gas fee
  - Transaction hash
  - Block number
  - Timestamp

**Actual Results:**
```
In History: [ ] Yes  [ ] No
Token Symbol Shown: [ ] Yes  [ ] No
Direction: _________________________________________
Status: ____________________________________________
Details Complete: [ ] Yes  [ ] No
```

### 3.5 Filter History by Token

**Steps:**
1. [ ] Navigate to "History"
2. [ ] Apply filter: "ERC-20" or specific token
3. [ ] Verify results

**Expected Results:**
- [ ] Filter options available
- [ ] Only token transactions shown
- [ ] ETH transactions hidden

**Actual Results:**
```
Filter Available: [ ] Yes  [ ] No
Results Correct: [ ] Yes  [ ] No
```

---

## 🧪 Test Scenario 4: Network Switching

**Objective:** Verify multi-network support and data isolation

### 4.1 Switch from Sepolia to Holesky

**Steps:**
1. [ ] Navigate to Settings or Network selector
2. [ ] Current network: Sepolia
3. [ ] Select "Holesky" network
4. [ ] Confirm network switch
5. [ ] Observe changes

**Expected Results:**
- [ ] Network switched successfully
- [ ] Balance reset to 0 (or actual Holesky balance)
- [ ] Transaction history cleared/filtered
- [ ] Network indicator updated
- [ ] Token list updated (network-specific)

**Actual Results:**
```
Network Switched: [ ] Yes  [ ] No
Balance: ___________________________________________
History: ___________________________________________
Network Indicator: _________________________________
```

### 4.2 Get Holesky Test ETH

**Steps:**
1. [ ] Get Holesky ETH from faucet
2. [ ] Wait for incoming transaction
3. [ ] Verify detection

**Expected Results:**
- [ ] Incoming transaction detected
- [ ] Balance updated
- [ ] Transaction in history

**Actual Results:**
```
Detected: [ ] Yes  [ ] No
Balance: ___________________________________________
```

### 4.3 Send on Holesky

**Steps:**
1. [ ] Send 0.001 ETH on Holesky
2. [ ] Verify transaction

**Expected Results:**
- [ ] Transaction sent on Holesky (not Sepolia)
- [ ] Correct network in transaction details
- [ ] Explorer link points to Holesky

**Actual Results:**
```
Network: ___________________________________________
TX Hash: ___________________________________________
Explorer: __________________________________________
```

### 4.4 Switch Back to Sepolia

**Steps:**
1. [ ] Switch network back to Sepolia
2. [ ] Verify Sepolia data restored

**Expected Results:**
- [ ] Sepolia balance restored
- [ ] Sepolia transaction history shown
- [ ] Holesky transactions not visible
- [ ] Tokens specific to Sepolia shown

**Actual Results:**
```
Balance Restored: [ ] Yes  [ ] No
History Restored: [ ] Yes  [ ] No
Tokens Correct: [ ] Yes  [ ] No
```

---

## 🧪 Test Scenario 5: App Restart & Data Persistence

**Objective:** Verify data integrity after app restart

### 5.1 Record Current State

**Before Restart:**
- [ ] ETH Balance: _______________
- [ ] Token Balance: _______________
- [ ] Number of transactions: _______________
- [ ] Pending transactions: _______________
- [ ] Current network: _______________

### 5.2 Force Close App

**Steps:**
1. [ ] Force close app (swipe up on iOS, recent apps on Android)
2. [ ] Wait 10 seconds
3. [ ] Reopen app

**Expected Results:**
- [ ] App reopens successfully
- [ ] No crash or error
- [ ] Wallet still accessible (no re-import needed)

**Actual Results:**
```
Reopened: [ ] OK  [ ] Error
Error (if any): ____________________________________
```

### 5.3 Verify Data Integrity

**After Restart:**
- [ ] ETH Balance: _______________ (should match)
- [ ] Token Balance: _______________ (should match)
- [ ] Number of transactions: _______________ (should match)
- [ ] Pending transactions: _______________ (check status)
- [ ] Current network: _______________ (should match)

**Expected Results:**
- [ ] All balances match
- [ ] Transaction history intact
- [ ] Pending transactions updated to confirmed (if enough time passed)
- [ ] Network selection preserved
- [ ] Token list preserved

**Actual Results:**
```
Balances Match: [ ] Yes  [ ] No
History Intact: [ ] Yes  [ ] No
Pending Updated: [ ] Yes  [ ] No  [ ] N/A
Network Preserved: [ ] Yes  [ ] No
Tokens Preserved: [ ] Yes  [ ] No
```

### 5.4 Device Restart

**Steps:**
1. [ ] Restart device completely
2. [ ] Reopen app
3. [ ] Verify all data

**Expected Results:**
- [ ] Same as 5.3
- [ ] No data loss
- [ ] No corruption

**Actual Results:**
```
Data Intact: [ ] Yes  [ ] No
Issues: ____________________________________________
```

---

## 🧪 Test Scenario 6: Edge Cases & Error Handling

### 6.1 Network Disconnection

**Steps:**
1. [ ] Start sending transaction
2. [ ] Turn off WiFi/mobile data mid-transaction
3. [ ] Observe behavior

**Expected Results:**
- [ ] Error shown: "Network error" or "No connection"
- [ ] Transaction not sent
- [ ] Graceful error handling
- [ ] Retry option available

**Actual Results:**
```
Error Message: _____________________________________
Transaction Sent: [ ] Yes  [ ] No
Retry Available: [ ] Yes  [ ] No
```

### 6.2 Very Low Balance (Dust)

**Steps:**
1. [ ] Send almost all ETH, leaving < 0.0001 ETH
2. [ ] Try to send remaining amount
3. [ ] Observe behavior

**Expected Results:**
- [ ] Error: "Amount too small" or "Insufficient for gas"
- [ ] Clear explanation
- [ ] Cannot proceed

**Actual Results:**
```
Error: _____________________________________________
Helpful: [ ] Yes  [ ] No
```

### 6.3 Maximum Amount Button

**Steps:**
1. [ ] Navigate to Send screen
2. [ ] Tap "Max" or "Send All" button
3. [ ] Verify amount

**Expected Results:**
- [ ] Amount = Balance - Gas Fee
- [ ] Leaves enough for gas
- [ ] Can successfully send

**Actual Results:**
```
Amount Set: ________________________________________
Gas Reserved: [ ] Yes  [ ] No
Send Successful: [ ] Yes  [ ] No
```

### 6.4 Rapid Network Switching

**Steps:**
1. [ ] Switch network rapidly (Sepolia → Holesky → Sepolia)
2. [ ] Observe behavior

**Expected Results:**
- [ ] No crash
- [ ] Correct network selected
- [ ] Correct data shown
- [ ] No data corruption

**Actual Results:**
```
Stable: [ ] Yes  [ ] No
Issues: ____________________________________________
```

### 6.5 Transaction Reorg Handling

**Steps:**
1. [ ] Send transaction
2. [ ] Wait for 1 confirmation
3. [ ] Monitor for potential reorg (rare on testnet)

**Expected Results:**
- [ ] If reorg occurs, transaction status updates
- [ ] Confirmation count may decrease temporarily
- [ ] Eventually confirms permanently

**Actual Results:**
```
Reorg Observed: [ ] Yes  [ ] No
Handled Correctly: [ ] Yes  [ ] No
```

---

## 📊 Test Summary

### Overall Results

**Date:** _______________
**Tester:** _______________
**App Version:** _______________
**Device:** _______________

### Scenario Results

| Scenario | Pass | Fail | Notes |
|----------|------|------|-------|
| 1. Import & Receive | [ ] | [ ] | __________ |
| 2. Send ETH | [ ] | [ ] | __________ |
| 3. Token Management | [ ] | [ ] | __________ |
| 4. Network Switching | [ ] | [ ] | __________ |
| 5. Data Persistence | [ ] | [ ] | __________ |
| 6. Edge Cases | [ ] | [ ] | __________ |

### Critical Issues Found

```
1. ___________________________________________________
2. ___________________________________________________
3. ___________________________________________________
```

### Minor Issues Found

```
1. ___________________________________________________
2. ___________________________________________________
3. ___________________________________________________
```

### Suggestions

```
1. ___________________________________________________
2. ___________________________________________________
3. ___________________________________________________
```

---

## 🎯 Acceptance Criteria

- [ ] All happy path scenarios pass
- [ ] Error handling graceful and user-friendly
- [ ] No crashes or data loss
- [ ] Transaction detection reliable
- [ ] Network switching works correctly
- [ ] Data persists across restarts
- [ ] UI responsive and intuitive

---

## 📸 Required Screenshots

Attach screenshots for:

1. [ ] Home screen with balance
2. [ ] Receive screen with QR code
3. [ ] Send screen (filled)
4. [ ] Transaction summary
5. [ ] Transaction history
6. [ ] Incoming notification
7. [ ] Token list
8. [ ] Network selector
9. [ ] Error messages (various)
10. [ ] Transaction details

---

## 📝 Notes

Use this section for additional observations:

```
_______________________________________________________
_______________________________________________________
_______________________________________________________
_______________________________________________________
_______________________________________________________
```

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
**Status:** ✅ Ready for QA
