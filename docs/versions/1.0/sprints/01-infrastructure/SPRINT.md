# Sprint 01: Infrastructure

**Sprint ID:** SPRINT-01
**Status:** ✅ Done
**Priority:** CRITICAL
**Duration:** 3 days

---

## Goal

Setup API keys for aggregators and fund testnet wallets for real transactions.

## Stories

| ID | Title | Status | Estimate |
|----|-------|--------|----------|
| [Story-1.1](./stories/Story-1.1-api-keys.md) | Get API keys (LiFi, Socket) | ✅ Done | 4h |
| [Story-1.2](./stories/Story-1.2-testnet-wallet.md) | Create and fund testnet wallet | ⏳ Pending | 2h |

## Definition of Done

- [x] API key LiFi — not required (free tier works)
- [x] Rango → replaced by Socket (see ADR-002)
- [x] Socket API — public key available
- [ ] Testnet wallet created and documented
- [ ] Wallet funded with Sepolia ETH (≥0.5)
- [ ] Wallet funded with testnet USDC (≥100)
- [x] Backend executes requests to LiFi/Socket

## Notes

- **LiFi:** Works without API key on free tier
- **Rango:** Deferred (API key issues) → replaced by Socket
- **Socket:** Public API key: `72a5b4b0-e727-48be-8aa1-5da9d62fe635`

See [ADR-002: Rango to Socket Migration](../../../decisions/ADR-002-rango-to-socket-migration.md)
