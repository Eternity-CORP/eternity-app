# Sprint 05: Demo/Live Mode

**Sprint ID:** SPRINT-05
**Status:** ✅ Done
**Priority:** MEDIUM
**Duration:** 2 days

---

## Goal

Allow switching between testnet (demo) and mainnet (live) modes.

## Stories

| ID | Title | Status | Estimate |
|----|-------|--------|----------|
| [Story-5.1](./stories/Story-5.1-demo-live-mode.md) | Demo/Live mode toggle | ✅ Done | 6h |

## Definition of Done

- [x] Toggle in settings
- [x] Testnet uses Sepolia, Arbitrum Sepolia, etc.
- [x] Mainnet uses production networks
- [x] Visual indicator of current mode
- [x] Balance cache clears on mode switch
- [x] Event listeners propagate mode changes

## Implementation Notes

- Network configuration in `networkModeService.ts`
- Event-based architecture for mode changes
- Clear all cached data on switch
