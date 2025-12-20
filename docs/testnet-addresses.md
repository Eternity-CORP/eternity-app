# Testnet Addresses & Resources

## Quick Reference

| Network | Chain ID | Native Token | Faucet |
|---------|----------|--------------|--------|
| Sepolia | 11155111 | ETH | [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia) |
| Polygon Mumbai | 80001 | MATIC | [Polygon Faucet](https://faucet.polygon.technology/) |
| Arbitrum Sepolia | 421614 | ETH | [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia) |

---

## Token Addresses

### Sepolia (Ethereum Testnet)

| Token | Address | Decimals |
|-------|---------|----------|
| USDC (Circle) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | 6 |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | 18 |
| DAI | `0x68194a729C2450ad26072b3D33ADaCbcef39D574` | 18 |

### Polygon Mumbai

| Token | Address | Decimals |
|-------|---------|----------|
| USDC | `0x0FA8781a83E46826621b3BC094Ea2A0212e71B23` | 6 |
| WMATIC | `0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889` | 18 |

---

## Test Wallet

> ⚠️ **NEVER commit private keys!** Store in `.env.local` (gitignored)

```
# Example test wallet (DO NOT USE IN PRODUCTION)
# Generate your own: npx ethers wallet random
Test Address: [TO BE FILLED BY DEVELOPER]
```

---

## Faucets

### ETH Faucets (Sepolia)
1. **Alchemy** (recommended): https://www.alchemy.com/faucets/ethereum-sepolia
2. **Infura**: https://www.infura.io/faucet/sepolia
3. **QuickNode**: https://faucet.quicknode.com/ethereum/sepolia

### MATIC Faucets (Mumbai)
1. **Polygon Official**: https://faucet.polygon.technology/
2. **Mumbai Faucet**: https://mumbaifaucet.com/

### Test Tokens
1. **Aave Testnet Faucet** (USDC, DAI, etc.): https://staging.aave.com/faucet/
2. **Circle USDC** (Sepolia): Mint via contract or use Aave faucet

---

## Block Explorers

| Network | Explorer URL |
|---------|--------------|
| Sepolia | https://sepolia.etherscan.io/ |
| Mumbai | https://mumbai.polygonscan.com/ |
| Arbitrum Sepolia | https://sepolia.arbiscan.io/ |

---

## RPC Endpoints

### Public RPCs (for development only)
```
Sepolia: https://rpc.sepolia.org
Mumbai: https://rpc-mumbai.maticvigil.com
```

### Alchemy RPCs (recommended - requires API key)
```
Sepolia: https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
Mumbai: https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
```

---

## Cross-Chain Aggregator Testnet Support

| Aggregator | Testnets Supported | Notes |
|------------|-------------------|-------|
| **LiFi** | Limited | Mostly mainnet bridges, some testnet DEXs |
| **Rango** | Limited | Similar to LiFi |
| **Socket** | Limited | Check per-route basis |

> **Recommendation:** For MVP testing, use small mainnet amounts ($1-5) if testnet bridges unavailable.

---

## Minimum Balances for Testing

| Network | Native Token | Minimum | Purpose |
|---------|--------------|---------|---------|
| Sepolia | ETH | 0.1 ETH | Gas fees |
| Mumbai | MATIC | 0.5 MATIC | Gas fees |
| Any | USDC | 10 USDC | Test transfers |

---

## How to Fund Test Wallet

### Step 1: Generate Wallet
```bash
# Using ethers.js CLI
npx ethers wallet random

# Save output:
# Address: 0x...
# Private Key: 0x... (KEEP SECRET!)
```

### Step 2: Add to .env.local
```env
TESTNET_PRIVATE_KEY=0x_your_private_key_here
```

### Step 3: Get Testnet ETH
1. Go to https://www.alchemy.com/faucets/ethereum-sepolia
2. Enter your wallet address
3. Request 0.5 ETH

### Step 4: Get Testnet USDC
1. Go to https://staging.aave.com/faucet/
2. Connect wallet (MetaMask)
3. Select Sepolia network
4. Mint 100 USDC

### Step 5: Verify Balances
```bash
# Check on Etherscan Sepolia
https://sepolia.etherscan.io/address/YOUR_ADDRESS
```

---

## Troubleshooting

### "Faucet says I already claimed"
- Most faucets have 24h cooldown
- Use different faucet
- Ask team member to send testnet tokens

### "Transaction stuck pending"
- Sepolia can be slow (2+ minutes)
- Check gas price, may need to increase
- Use Etherscan to monitor

### "Cross-chain bridge not available on testnet"
- This is common - bridges need liquidity
- Use mainnet with small amounts for bridge testing
- Focus on same-chain first

---

**Last Updated:** December 2025
