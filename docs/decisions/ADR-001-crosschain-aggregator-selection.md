# ADR-001: Cross-Chain Aggregator Selection

**Status:** Accepted  
**Date:** 2024-12-15  
**Decision Makers:** Architect, Backend Lead  
**Category:** Integration, Infrastructure

---

## Context

Eternity Wallet requires cross-chain transfer and swap functionality to enable users to:
1. Send tokens across different blockchain networks (e.g., Ethereum → Polygon)
2. Swap tokens within the same chain (e.g., ETH → USDC)
3. Combined cross-chain swaps (e.g., ETH on Ethereum → USDC on Arbitrum)

We need to select aggregator service(s) that provide reliable, cost-effective bridging and swapping.

---

## Options Considered

### 1. LI.FI (li.fi)

**Overview:** Meta-aggregator that aggregates 15+ bridges and 30+ DEXs

| Criteria | Score | Notes |
|----------|-------|-------|
| Chain Coverage | ⭐⭐⭐⭐⭐ | 20+ EVM chains, expanding to non-EVM |
| Bridge Options | ⭐⭐⭐⭐⭐ | Stargate, Hop, Across, Celer, Multichain, etc. |
| DEX Coverage | ⭐⭐⭐⭐⭐ | 1inch, Paraswap, 0x, Uniswap, etc. |
| API Quality | ⭐⭐⭐⭐⭐ | Excellent docs, SDK available |
| Rate Limits | ⭐⭐⭐⭐ | Generous free tier, API key for higher limits |
| Reliability | ⭐⭐⭐⭐ | High uptime, active development |
| Fees | ⭐⭐⭐⭐ | No protocol fee, only underlying bridge/DEX fees |
| Testnet Support | ⭐⭐⭐ | Limited, mostly mainnet |

**Pros:**
- Best-in-class route optimization across multiple bridges
- Single API for all cross-chain needs
- Active development and responsive support
- No additional protocol fees
- Excellent documentation and SDK

**Cons:**
- Limited testnet support (need to test with small mainnet amounts)
- Depends on underlying bridge availability

---

### 2. Rango Exchange (rango.exchange)

**Overview:** Cross-chain DEX aggregator supporting EVM, Solana, Cosmos, and more

| Criteria | Score | Notes |
|----------|-------|-------|
| Chain Coverage | ⭐⭐⭐⭐⭐ | EVM + Solana + Cosmos + Bitcoin |
| Bridge Options | ⭐⭐⭐⭐ | THORChain, Satellite, Wormhole, etc. |
| DEX Coverage | ⭐⭐⭐⭐ | Major DEXs on each chain |
| API Quality | ⭐⭐⭐⭐ | Good docs, requires API key |
| Rate Limits | ⭐⭐⭐ | API key required for all requests |
| Reliability | ⭐⭐⭐⭐ | Good uptime |
| Fees | ⭐⭐⭐ | Small protocol fee on some routes |
| Testnet Support | ⭐⭐ | Very limited |

**Pros:**
- Supports non-EVM chains (Solana, Cosmos) - future-proof
- THORChain integration for BTC bridging
- Good for multi-ecosystem wallet

**Cons:**
- Requires API key for all requests
- Small protocol fee on some routes
- Less mature than LiFi for EVM-only use cases

---

### 3. Socket (socket.tech)

**Overview:** Interoperability protocol with bridge aggregation

| Criteria | Score | Notes |
|----------|-------|-------|
| Chain Coverage | ⭐⭐⭐⭐ | 15+ EVM chains |
| Bridge Options | ⭐⭐⭐⭐ | Hop, Across, Stargate, Celer |
| DEX Coverage | ⭐⭐⭐ | Basic DEX support |
| API Quality | ⭐⭐⭐⭐ | Good docs |
| Rate Limits | ⭐⭐⭐⭐ | Reasonable free tier |
| Reliability | ⭐⭐⭐⭐ | Good uptime |
| Fees | ⭐⭐⭐⭐ | Minimal protocol fees |
| Testnet Support | ⭐⭐ | Limited |

**Pros:**
- Simple API
- Good for basic bridging needs
- Bungee.exchange powered by Socket

**Cons:**
- Fewer DEX integrations than LiFi
- Less route optimization

---

### 4. 1inch Fusion (1inch.io)

**Overview:** DEX aggregator with cross-chain capabilities

| Criteria | Score | Notes |
|----------|-------|-------|
| Chain Coverage | ⭐⭐⭐⭐ | Major EVM chains |
| Bridge Options | ⭐⭐ | Limited native bridging |
| DEX Coverage | ⭐⭐⭐⭐⭐ | Best DEX aggregation |
| API Quality | ⭐⭐⭐⭐⭐ | Excellent API |
| Rate Limits | ⭐⭐⭐⭐ | Good free tier |
| Reliability | ⭐⭐⭐⭐⭐ | Very reliable |
| Fees | ⭐⭐⭐⭐⭐ | No protocol fee |
| Testnet Support | ⭐⭐⭐ | Some testnet support |

**Pros:**
- Best DEX aggregation for same-chain swaps
- Very reliable and battle-tested
- Excellent gas optimization

**Cons:**
- **Limited cross-chain bridging** - primarily same-chain swaps
- Cross-chain requires separate bridge integration

---

### 5. Squid Router (squidrouter.com)

**Overview:** Cross-chain liquidity router powered by Axelar

| Criteria | Score | Notes |
|----------|-------|-------|
| Chain Coverage | ⭐⭐⭐⭐ | EVM + Cosmos via Axelar |
| Bridge Options | ⭐⭐⭐ | Axelar-focused |
| DEX Coverage | ⭐⭐⭐ | Basic |
| API Quality | ⭐⭐⭐⭐ | Good docs |
| Rate Limits | ⭐⭐⭐ | API key required |
| Reliability | ⭐⭐⭐ | Depends on Axelar |
| Fees | ⭐⭐⭐ | Protocol fees apply |
| Testnet Support | ⭐⭐⭐ | Axelar testnet available |

**Pros:**
- Good Cosmos ecosystem support
- Native cross-chain messaging

**Cons:**
- Tied to Axelar ecosystem
- Less bridge diversity

---

## Decision

### Primary: **LI.FI** ⭐ Recommended

**Reasoning:**
1. **Best route optimization** - Aggregates 15+ bridges to find cheapest/fastest path
2. **No protocol fees** - Only pay underlying bridge/DEX fees
3. **Excellent API** - Well-documented, SDK available, responsive support
4. **Single integration** - One API covers bridging + swapping
5. **Active development** - Regular updates, new chain support

### Secondary (Fallback): **Rango Exchange**

**Reasoning:**
1. **Non-EVM support** - Future-proof for Solana, Cosmos expansion
2. **Different bridge set** - May find routes LiFi misses
3. **Redundancy** - If LiFi is down, Rango provides backup

### Same-Chain Swaps: **1inch** (Optional Enhancement)

**Reasoning:**
1. **Best swap execution** - Superior DEX aggregation
2. **Can be added later** - LiFi includes 1inch for swaps anyway
3. **Not critical for MVP** - LiFi handles swaps adequately

---

## Implementation Strategy

### Phase 1: MVP (Week 1-2)
```
┌─────────────────────────────────────────────┐
│              Eternity Wallet                │
│                    │                        │
│     CrosschainService (orchestrator)        │
│           │                │                │
│    ┌──────┴──────┐   ┌─────┴─────┐          │
│    │   LiFi      │   │  (future) │          │
│    │  Router     │   │   Rango   │          │
│    └─────────────┘   └───────────┘          │
└─────────────────────────────────────────────┘
```

- Implement LiFi integration fully
- Test with real transactions (small mainnet amounts)
- Validate quote → prepare → execute → monitor flow

### Phase 2: Redundancy (Week 3-4)
- Add Rango as fallback router
- Implement automatic failover
- Compare quotes across both

### Phase 3: Optimization (Post-MVP)
- Add 1inch for same-chain swap optimization
- Implement quote caching
- Add Socket as tertiary option

---

## API Key Requirements

| Service | Free Tier | Production | Get Key |
|---------|-----------|------------|---------|
| LiFi | Yes (limited) | Recommended | https://li.fi/ |
| Rango | No | Required | https://rango.exchange/ |
| 1inch | Yes (generous) | Optional | https://portal.1inch.dev/ |
| Socket | Yes | Optional | https://socket.tech/ |

---

## Configuration

```env
# .env configuration
LIFI_API_KEY=your_lifi_key          # Primary
RANGO_API_KEY=your_rango_key        # Fallback
ONEINCH_API_KEY=your_1inch_key      # Optional enhancement
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiFi API downtime | High | Rango fallback, health checks |
| Bridge liquidity issues | Medium | Multi-bridge via aggregator |
| Rate limiting | Low | API keys, request caching |
| Testnet limitations | Medium | Test with small mainnet amounts |

---

## Success Metrics

- **Quote success rate:** >95% of quote requests return valid routes
- **Execution success rate:** >90% of submitted transactions complete
- **Average bridge time:** <5 minutes for common routes
- **Fallback activation:** <1% of requests need fallback router

---

## References

- [LiFi Documentation](https://docs.li.fi/)
- [Rango API Docs](https://docs.rango.exchange/)
- [Socket Tech Docs](https://docs.socket.tech/)
- [1inch Developer Portal](https://portal.1inch.dev/)

---

**Decision Date:** December 15, 2024  
**Review Date:** January 15, 2025 (post-MVP)
