# 🧪 Sepolia E2E Tests

End-to-end tests on live Sepolia testnet without mocks or local nodes.

## 📋 Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **Package Manager**: npm or pnpm
- **Test Framework**: Vitest
- **Testnet ETH**: Get from faucet
- **Test Tokens**: Optional ERC-20 tokens for token tests

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile
npm install
# or
pnpm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cd scripts/sepolia
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Your test wallet private key (NEVER use mainnet keys!)
TEST_PRIVKEY=0x1234...

# Recipient address for test transactions
TEST_RECIPIENT=0x742d...

# ERC-20 token address (e.g., Sepolia USDC)
TEST_TOKEN_ADDRESS=0x1c7D...

# Optional: Custom RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Rate limiting (ms between requests)
RPC_RATE_LIMIT_MS=1000

# Minimum confirmations to wait
MIN_CONFIRMATIONS=2
```

### 3. Get Testnet ETH

Use one of these faucets:

- **Alchemy Faucet**: https://sepoliafaucet.com/
- **PoW Faucet**: https://sepolia-faucet.pk910.de/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia

You'll need:
- ~0.1 ETH for ETH tests
- ~0.05 ETH for ERC-20 tests (gas only)

### 4. Get Test Tokens (Optional)

For ERC-20 tests, you need tokens. Options:

**A. Use existing testnet tokens:**
- Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Get from: https://faucet.circle.com/

**B. Deploy your own test token:**
```bash
# Use Remix or Hardhat to deploy a simple ERC-20
```

### 5. Run Tests

```bash
# Run all tests
npm run test:sepolia

# Run specific test
npx vitest scripts/sepolia/send-eth.spec.ts

# Run with verbose output
npx vitest scripts/sepolia/send-eth.spec.ts --reporter=verbose

# Run in watch mode
npx vitest scripts/sepolia/ --watch
```

## 📁 File Structure

```
scripts/sepolia/
├── .env.example                  # Environment template
├── .env                          # Your config (gitignored)
├── README.md                     # This file
├── helpers/
│   └── testUtils.ts              # Test utilities
├── schedule-one-time.spec.ts     # One-time scheduled payment tests
├── schedule-recurring.spec.ts    # Recurring payment tests (RRULE)
├── split-pay.spec.ts             # Split bill payment tests
└── split-collect.spec.ts         # Split bill collection tests
```

## 🧪 Test Suites

### Scheduled One-Time Payment (`schedule-one-time.spec.ts`)

Tests scheduled one-time ETH payments:

1. ✅ **Create Scheduled Payment** - Schedule payment for 30 seconds in future
2. ✅ **Wait for Execution** - Wait for scheduled time
3. ✅ **Execute Payment** - Send transaction at scheduled time
4. ✅ **Verify Confirmation** - Wait for 2+ confirmations
5. ✅ **Check Balances** - Verify recipient received funds
6. ✅ **Multiple Payments** - Execute multiple scheduled payments

**Expected Output:**
```
📍 Step 1: Check wallet balance
   Sender balance: 0.1234 ETH
   ✅ Sufficient balance: 0.1234 ETH

📍 Step 2: Schedule one-time payment
   Scheduled for: 2025-11-11T19:30:00.000Z
   Current time: 2025-11-11T19:29:30.000Z

📍 Step 3: Wait for scheduled time
   Waiting 30 seconds for scheduled time...

📍 Step 4: Execute scheduled payment
   📤 Transaction sent:
   Hash: 0xabc123...
   From: 0x742d...
   To: 0x3C44...
   Value: 0.001 ETH
   Explorer: https://sepolia.etherscan.io/tx/0xabc123...

📍 Step 5: Wait for transaction confirmation
   ⏳ Waiting for 2 confirmations...
   ✅ Transaction confirmed!
   Block: 5678901
   Gas Used: 21000

📍 Step 6: Verify balances changed
   Balance Changes:
   Sender: 0.1234 -> 0.1223 ETH
   Recipient: 0.0567 -> 0.0577 ETH
   ✅ Recipient received 0.001000 ETH
```

### Scheduled Recurring Payment (`schedule-recurring.spec.ts`)

Tests RRULE-based recurring payments:

1. ✅ **Create RRULE Schedule** - Daily recurring payment (2 occurrences)
2. ✅ **Execute First Payment** - Send first scheduled payment
3. ✅ **Wait for Next Occurrence** - Simulate 24-hour wait (accelerated)
4. ✅ **Execute Second Payment** - Send second scheduled payment
5. ✅ **Verify Total Amount** - Check total received matches expected
6. ✅ **Weekly Recurring** - Test weekly RRULE schedule

**Expected Output:**
```
📍 Step 2: Create RRULE schedule
   RRULE: FREQ=DAILY;COUNT=2
   Occurrences:
     1. 2025-11-11T19:00:00.000Z
     2. 2025-11-12T19:00:00.000Z

📍 Step 3: Execute first payment (Day 1)
   Executing payment 1/2...
   ✅ Transaction sent: 0xdef456...
   ✅ Payment confirmed!
   Recipient balance after first payment: 0.0572 ETH
   ✅ First payment received: 0.000500 ETH

📍 Step 4: Execute second payment (Day 2)
   Simulating 24-hour wait (actually 10 seconds)...
   Executing payment 2/2...
   ✅ Transaction sent: 0xghi789...
   ✅ Payment confirmed!
   Recipient balance after second payment: 0.0577 ETH
   ✅ Second payment received: 0.000500 ETH

📍 Step 5: Verify total balance increase
   ✅ Total received: 0.001000 ETH (expected 0.001)
```

### Split Bill Payment (`split-pay.spec.ts`)

Tests split bill payments to multiple participants:

1. ✅ **Split ETH to 3 Participants** - Equal split of 0.003 ETH
2. ✅ **Split ERC-20 to 3 Participants** - Equal split of 3 tokens
3. ✅ **Weighted Split** - Unequal distribution (2:1:1)
4. ✅ **Sequential Payments** - Avoid nonce conflicts
5. ✅ **Verify All Received** - Check each participant got correct amount

**Expected Output:**
```
📍 Step 3: Pay all participants
   Payment 1/3 to 0x742d...
   📤 Transaction sent: 0xjkl012...
   
   Payment 2/3 to 0x3C44...
   📤 Transaction sent: 0xmno345...
   
   Payment 3/3 to 0x90F7...
   📤 Transaction sent: 0xpqr678...

📍 Step 4: Wait for all confirmations
   Confirming payment 1/3...
   ✅ Transaction confirmed!
   Confirming payment 2/3...
   ✅ Transaction confirmed!
   Confirming payment 3/3...
   ✅ Transaction confirmed!

📍 Step 5: Verify all recipients received funds
   0x742d...:
     Initial: 0.0567 ETH
     Final: 0.0577 ETH
     Increase: 0.001000 ETH
   ✅ Received 0.001000 ETH
   
   [Similar for other 2 participants]
```

### Split Bill Collection (`split-collect.spec.ts`)

Tests incoming payment collection for split bills:

1. ✅ **Generate Payment Requests** - Create EIP-681 URIs
2. ✅ **Simulate Incoming Payment** - Send from second wallet
3. ✅ **Verify Payment Received** - Check collector balance increased
4. ✅ **Match to Participant** - Verify payment matches expected participant
5. ✅ **Multiple Incoming** - Collect from multiple participants

**Expected Output:**
```
📍 Step 2: Generate payment requests
   Participant: 0xstu901...
   Amount: 0.001 ETH
   URI: ethereum:742d35cc6634c0532925a3b844bc9e7595f0beb?value=1000000000000000000&chain_id=11155111
   ✅ Generated 3 payment requests

📍 Step 4: Simulate incoming payment from participant
   Sending payment from 0xstu901...
   To: 0x742d...
   Amount: 0.001 ETH
   📤 Transaction sent: 0xvwx234...

📍 Step 5: Wait for transaction confirmation
   ⏳ Waiting for 2 confirmations...
   ✅ Payment confirmed!

📍 Step 6: Verify collector received payment
   Balance change:
     Initial: 0.1234 ETH
     Final: 0.1244 ETH
     Increase: 0.001000 ETH
   ✅ Collector received 0.001000 ETH

📍 Step 7: Verify payment can be matched to participant
   ✅ Payment matched to participant: 0xstu901...
```

### ETH Tests (`send-eth.spec.ts`)

Tests real ETH transfers on Sepolia:

1. ✅ **Balance Check** - Verify sufficient balance
2. ✅ **Send ETH** - Transfer 0.001 ETH and wait for 2+ confirmations
3. ✅ **Insufficient Funds** - Test error handling
4. ✅ **Invalid Address** - Test validation
5. ✅ **Gas Estimation** - Estimate gas correctly
6. ✅ **Gas Price** - Get current gas price
7. ✅ **Block Info** - Get block with base fee (EIP-1559)

**Expected Output:**
```
🔧 Test Configuration:
   Network: Sepolia
   RPC: https://rpc.sepolia.org
   Sender: 0x742d...
   Recipient: 0xabcd...
   Amount: 0.001 ETH
   Min Confirmations: 2

💰 Checking balance...
   Balance: 0.1234 ETH
   ✅ Sufficient balance

📤 Sending ETH transaction...
   Sender balance (before): 0.1234 ETH
   Recipient balance (before): 0.0567 ETH

   ✅ Transaction sent!
   Hash: 0xabc123...
   Nonce: 42
   Explorer: https://sepolia.etherscan.io/tx/0xabc123...

   ⏳ Waiting for 2 confirmations...
   ✅ Confirmed in block 5678901
   Status: Success
   Gas used: 21000
   Effective gas price: 2.5 Gwei
   Gas cost: 0.0000525 ETH

   💰 Sender balance (after): 0.1229 ETH
   💰 Recipient balance (after): 0.0577 ETH

   📊 Changes:
   Sender: -0.0010525 ETH (amount + gas)
   Recipient: +0.001 ETH

   ✅ Transaction verified!
```

### ERC-20 Tests (`send-erc20.spec.ts`)

Tests real token transfers on Sepolia:

1. ✅ **Token Metadata** - Get name, symbol, decimals
2. ✅ **Token Balance** - Check token balance
3. ✅ **Send Tokens** - Transfer tokens and wait for confirmations
4. ✅ **Insufficient Balance** - Test error handling
5. ✅ **Gas Estimation** - Estimate gas for token transfer
6. ✅ **Transfer Events** - Query Transfer events
7. ✅ **ETH for Gas** - Verify sufficient ETH for gas

**Expected Output:**
```
🔧 Test Configuration:
   Network: Sepolia
   Token: 0x1c7D...
   Symbol: USDC
   Decimals: 6

📋 Getting token metadata...
   Name: USD Coin
   Symbol: USDC
   Decimals: 6
   ✅ Metadata retrieved

💰 Checking token balance...
   Balance: 100.0 USDC
   ✅ Has token balance

📤 Sending USDC tokens...
   Sender balance (before): 100.0 USDC
   Recipient balance (before): 50.0 USDC
   Amount to send: 1.0 USDC

   ✅ Transaction sent!
   Hash: 0xdef456...
   Explorer: https://sepolia.etherscan.io/tx/0xdef456...

   ⏳ Waiting for 2 confirmations...
   ✅ Confirmed in block 5678902
   ✅ Transfer event found

   💰 Sender balance (after): 99.0 USDC
   💰 Recipient balance (after): 51.0 USDC

   ✅ Transaction verified!
```

## 🔧 Helper Scripts

### Fund Test Wallet

If you have a master wallet with testnet ETH:

```bash
# Set in .env:
MASTER_PRIVKEY=0x...
TEST_WALLET_ADDRESS=0x...
FUND_AMOUNT_ETH=0.1

# Run:
npx ts-node scripts/sepolia/fund-test-wallet.ts
```

**Output:**
```
🚰 Funding Test Wallet on Sepolia...

📍 Master Wallet: 0x1234...
📍 Test Wallet: 0x5678...
💰 Amount: 0.1 ETH

Master Balance: 1.5 ETH
Test Wallet Balance (before): 0.0 ETH

📤 Sending transaction...
✅ Transaction sent!
   Hash: 0xabc...
   Explorer: https://sepolia.etherscan.io/tx/0xabc...

⏳ Waiting for confirmation...
✅ Confirmed in block 5678900

💰 Test Wallet Balance (after): 0.1 ETH
   Increase: +0.1 ETH

✅ Funding complete!
```

## ⚠️ Rate Limiting

Public RPC endpoints have rate limits. The tests include:

1. **Delays between requests** (`RPC_RATE_LIMIT_MS`)
2. **Retry logic** with exponential backoff
3. **Error handling** for rate limit errors

**Recommended settings:**
- Public RPC: `RPC_RATE_LIMIT_MS=1000` (1 second)
- Infura/Alchemy: `RPC_RATE_LIMIT_MS=500` (0.5 seconds)
- Private RPC: `RPC_RATE_LIMIT_MS=100` (0.1 seconds)

## 🐛 Troubleshooting

### "Insufficient funds" error

**Problem:** Not enough ETH for transaction + gas

**Solution:**
```bash
# Check balance
cast balance YOUR_ADDRESS --rpc-url https://rpc.sepolia.org

# Get more from faucet
# Visit: https://sepoliafaucet.com/
```

### "Nonce too low" error

**Problem:** Transaction with same nonce already sent

**Solution:**
```bash
# Wait for pending transactions to confirm
# Or reset nonce in wallet
```

### "Transaction underpriced" error

**Problem:** Gas price too low for current network

**Solution:**
- Tests use default gas price from provider
- Network may be congested, try again later
- Or increase gas price in transaction

### "Rate limit exceeded" error

**Problem:** Too many requests to RPC

**Solution:**
```env
# Increase rate limit delay
RPC_RATE_LIMIT_MS=2000

# Or use paid RPC (Infura/Alchemy)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

### "Connection timeout" error

**Problem:** RPC endpoint slow or unavailable

**Solution:**
```env
# Try different RPC
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
# Or: https://rpc2.sepolia.org
```

## 📊 Test Results

Tests log detailed information:

- ✅ Transaction hashes
- ✅ Block numbers
- ✅ Confirmation counts
- ✅ Gas used and costs
- ✅ Balance changes
- ✅ Event logs

**Example CI Integration:**
```yaml
# .github/workflows/sepolia-tests.yml
name: Sepolia E2E Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Sepolia tests
        env:
          TEST_PRIVKEY: ${{ secrets.TEST_PRIVKEY }}
          TEST_RECIPIENT: ${{ secrets.TEST_RECIPIENT }}
          TEST_TOKEN_ADDRESS: ${{ secrets.TEST_TOKEN_ADDRESS }}
        run: npm run test:sepolia
```

## 🔒 Security

**⚠️ IMPORTANT:**

1. **NEVER use mainnet private keys**
2. **NEVER commit `.env` file**
3. **Use dedicated test wallets**
4. **Keep test amounts small**
5. **Rotate test keys regularly**

**.gitignore:**
```
scripts/sepolia/.env
scripts/sepolia/*.log
```

## 📚 Additional Resources

- **Sepolia Faucets**: https://sepoliafaucet.com/
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Sepolia Docs**: https://ethereum.org/en/developers/docs/networks/#sepolia
- **Vitest Docs**: https://vitest.dev/
- **Ethers.js Docs**: https://docs.ethers.org/v5/

## 🎯 Acceptance Criteria - 100%

- ✅ Tests run on Sepolia without Docker
- ✅ No mocks - real RPC calls
- ✅ Logs contain txHash and confirmations
- ✅ Documentation for setup and running
- ✅ Rate limiting with retries
- ✅ Error handling
- ✅ Node 20+ compatible

---

**Last Updated:** 2025-11-10
**Status:** ✅ Production Ready
