# Remove Business Wallet Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely remove the Business Wallet feature from all layers of the E-Y project — contracts, database, API, shared packages, web app, mobile app, website, and documentation.

**Architecture:** Bottom-up removal starting from shared types/constants (leaf dependencies), then services, then API, then frontends, then contracts/docs. Each task commits independently so we can bisect if something breaks.

**Tech Stack:** TypeScript monorepo (Turborepo + pnpm), NestJS API, Next.js web, Expo mobile, Solidity contracts, Supabase DB.

---

### Task 1: Remove business types and constants from `packages/shared/`

**Files:**
- Delete: `packages/shared/src/types/business.ts`
- Delete: `packages/shared/src/api/business.ts`
- Delete: `packages/shared/src/constants/business.ts`
- Delete: `packages/shared/src/utils/business.ts`
- Delete: `packages/shared/src/services/business-factory.service.ts`
- Delete: `packages/shared/src/services/business-token.service.ts`
- Delete: `packages/shared/src/services/business-treasury.service.ts`
- Modify: `packages/shared/src/types/index.ts:15` — remove `export * from './business'`
- Modify: `packages/shared/src/api/index.ts:10` — remove `export * from './business'`
- Modify: `packages/shared/src/constants/index.ts:10` — remove `export * from './business'`
- Modify: `packages/shared/src/utils/index.ts:13` — remove `export * from './business'`
- Modify: `packages/shared/src/services/index.ts:16-18` — remove 3 business service exports

**Step 1: Delete 7 business-only files**

```bash
rm packages/shared/src/types/business.ts
rm packages/shared/src/api/business.ts
rm packages/shared/src/constants/business.ts
rm packages/shared/src/utils/business.ts
rm packages/shared/src/services/business-factory.service.ts
rm packages/shared/src/services/business-token.service.ts
rm packages/shared/src/services/business-treasury.service.ts
```

**Step 2: Remove barrel exports from 5 index files**

In `packages/shared/src/types/index.ts` — remove line: `export * from './business';`
In `packages/shared/src/api/index.ts` — remove line: `export * from './business';`
In `packages/shared/src/constants/index.ts` — remove line: `export * from './business';`
In `packages/shared/src/utils/index.ts` — remove line: `export * from './business';`
In `packages/shared/src/services/index.ts` — remove lines:
```
export * from './business-factory.service';
export * from './business-token.service';
export * from './business-treasury.service';
```

**Step 3: Clean inline business references in shared**

In `packages/shared/src/types/wallet.ts`:
- Line 10: Change `export type AccountType = 'test' | 'real' | 'business';` → `export type AccountType = 'test' | 'real';`
- Line 24: Remove `// 'business' for business wallets` from comment → `// Account type: 'test' for testnets, 'real' for mainnets`
- Line 26: Delete `businessId?: string;` line and its comment

In `packages/shared/src/types/ai.ts`:
- Line 243: Change `accountType?: 'test' | 'real' | 'business';` → `accountType?: 'test' | 'real';`

In `packages/shared/src/utils/account.ts`:
- Lines 7-8: Remove business branch from `generateAccountLabel`:
  ```typescript
  // DELETE these two lines:
  if (type === 'business') {
    return index === 0 ? 'Business Wallet' : `Business Wallet ${index}`;
  }
  ```
- Lines 65-68: Remove `businessId` param and `biz-` ID format from `createAccount`:
  - Remove `businessId?: string;` from params
  - Change `id: params.businessId ? \`biz-${params.businessId}\` : String(params.index),` → `id: String(params.index),`
  - Remove `...(params.businessId && { businessId: params.businessId }),`

In `packages/shared/src/constants/errors.ts`:
- Lines 36-43: Remove entire `// Business errors` block (7 error codes)

In `packages/shared/src/config/multi-network.ts`:
- Line 185: Change comment `Test/business accounts always use Sepolia` → `Test accounts always use Sepolia`

**Step 4: Delete dist artifacts**

```bash
rm -rf packages/shared/dist/
```

**Step 5: Build shared package to verify**

```bash
pnpm --filter @e-y/shared build
```
Expected: BUILD SUCCESS with no errors.

**Step 6: Commit**

```bash
git add -A packages/shared/
git commit -m "refactor(shared): remove all business wallet types, services, and constants"
```

---

### Task 2: Remove business module from API (`apps/api/`)

**Files:**
- Delete: `apps/api/src/business/` (entire directory — module, service, controller, gateway, DTOs, entities)
- Delete: `apps/api/src/ai/tools/business.tool.ts`
- Modify: `apps/api/src/app.module.ts:18,44` — remove BusinessModule import and registration
- Modify: `apps/api/src/ai/ai.module.ts:22-24,38,47,71-73` — remove 3 business tool imports, BusinessModule import, and provider registrations
- Modify: `apps/api/src/ai/ai.service.ts:24,64-66,102-104` — remove business tool imports, constructor params, and registrations
- Modify: `apps/api/src/ai/tools/index.ts:11` — remove `export * from './business.tool'`
- Modify: `apps/api/src/ai/ai.gateway.ts:49,75,95,287` — remove `'business'` from accountType unions and logic
- Modify: `apps/api/src/ai/dto/ws-subscribe.dto.ts:28-31` — remove `'business'` from validator and type
- Modify: `apps/api/src/ai/services/balance.service.ts:66,166` — remove `'business'` from comments
- Modify: `apps/api/src/common/sentry.interceptor.ts:36-37` — remove BusinessController and BusinessGateway entries
- Modify: `apps/api/src/common/app-errors.ts:103-113` — remove BusinessError class

**Step 1: Delete business module directory and AI tool**

```bash
rm -rf apps/api/src/business/
rm apps/api/src/ai/tools/business.tool.ts
```

**Step 2: Clean app.module.ts**

Remove line 18: `import { BusinessModule } from './business/business.module';`
Remove line 44: `BusinessModule,`

**Step 3: Clean ai.module.ts**

Remove from imports block (lines 22-24):
```typescript
  GetBusinessesTool,
  GetBusinessDetailTool,
  GetBusinessProposalsTool,
```
Remove line 38: `import { BusinessModule } from '../business/business.module';`
Remove from `imports` array (line 47): `BusinessModule,`
Remove from `providers` array (lines 71-73):
```typescript
    GetBusinessesTool,
    GetBusinessDetailTool,
    GetBusinessProposalsTool,
```

**Step 4: Clean ai.service.ts**

Remove line 24: `import { GetBusinessesTool, GetBusinessDetailTool, GetBusinessProposalsTool } from './tools/business.tool';`
Remove constructor params (lines 64-66):
```typescript
    private readonly getBusinessesTool: GetBusinessesTool,
    private readonly getBusinessDetailTool: GetBusinessDetailTool,
    private readonly getBusinessProposalsTool: GetBusinessProposalsTool,
```
Remove tool registrations (lines 102-104):
```typescript
    this.registerTool(getBusinessesTool);
    this.registerTool(getBusinessDetailTool);
    this.registerTool(getBusinessProposalsTool);
```

**Step 5: Clean ai/tools/index.ts**

Remove line 11: `export * from './business.tool';`

**Step 6: Clean ai.gateway.ts**

- Line 49: Change `accountType?: 'test' | 'real' | 'business';` → `accountType?: 'test' | 'real';`
- Line 75: Change comment `// Map of socket ID -> user's account type (test/real/business)` → `// Map of socket ID -> user's account type (test/real)`
- Line 95: Change `const effectiveNetwork = accountType === 'real' || accountType === 'business'` → `const effectiveNetwork = accountType === 'real'`
- Line 287: Same pattern — `accountType === 'real' || accountType === 'business'` → `accountType === 'real'`

**Step 7: Clean ws-subscribe.dto.ts**

- Line 28: Change `@IsIn(['test', 'real', 'business']` → `@IsIn(['test', 'real']`
- Line 29: Change message to `'accountType must be one of: test, real'`
- Line 31: Change `accountType?: 'test' | 'real' | 'business';` → `accountType?: 'test' | 'real';`

**Step 8: Clean balance.service.ts**

- Line 66: Change comment `// Use accountType to determine networks: 'real'/'business' = mainnet, 'test' = sepolia` → `// Use accountType to determine networks: 'real' = mainnet, 'test' = sepolia`
- Line 166: Change comment `@param accountType - Optional account type override ('test' | 'real' | 'business').` → `@param accountType - Optional account type override ('test' | 'real').`

**Step 9: Clean sentry.interceptor.ts**

Remove lines 36-37:
```typescript
  BusinessController: 'business',
  BusinessGateway: 'business',
```

**Step 10: Clean app-errors.ts**

Remove lines 103-113 (entire BusinessError class).

**Step 11: Delete API dist**

```bash
rm -rf apps/api/dist/
```

**Step 12: Build API to verify**

```bash
pnpm --filter @e-y/api build
```
Expected: BUILD SUCCESS.

**Step 13: Commit**

```bash
git add -A apps/api/
git commit -m "refactor(api): remove business wallet module, AI tools, and all references"
```

---

### Task 3: Remove business wallet from Web App (`apps/web/`)

**Files:**
- Delete: `apps/web/src/app/wallet/business/` (entire route tree — 6 pages)
- Delete: `apps/web/src/components/BusinessShares.tsx`
- Delete: `apps/web/src/hooks/useBusinessSync.ts`
- Modify: `apps/web/src/app/wallet/page.tsx:9,26-29,253-255` — remove BusinessShares import, business redirect, and render
- Modify: `apps/web/src/contexts/account-context.tsx:35-36,60-61,180-255` — remove addBusinessAccount, syncBusinessAccounts functions and interface members
- Modify: `apps/web/src/components/AccountSelector.tsx` — remove business badge, testnet logic, "New Business Wallet" button
- Modify: `apps/web/src/components/TokenList.tsx:7,33-58` — remove business imports and business link logic
- Modify: `apps/web/src/components/Providers.tsx:6,10-13,30` — remove BusinessSyncRunner import, component, and usage
- Modify: `apps/web/src/lib/multi-network.ts:155,158` — remove `'business'` from accountType
- Modify: `apps/web/src/lib/error-tracking.ts:189` — remove `BUSINESS: 'business'` from BreadcrumbCategory

**Step 1: Delete business-only files**

```bash
rm -rf apps/web/src/app/wallet/business/
rm apps/web/src/components/BusinessShares.tsx
rm apps/web/src/hooks/useBusinessSync.ts
```

**Step 2: Clean wallet dashboard page**

In `apps/web/src/app/wallet/page.tsx`:
- Remove line 9: `import BusinessShares from '@/components/BusinessShares'`
- Remove lines 26-29 (business redirect useEffect block):
  ```typescript
  useEffect(() => {
    if (currentAccount?.type === 'business' && currentAccount.businessId) {
      router.replace(`/wallet/business/${currentAccount.businessId}`)
    }
  ```
- Remove the `<BusinessShares />` render (around line 253-255)

**Step 3: Clean account-context.tsx**

- Remove `addBusinessAccount` and `syncBusinessAccounts` from `AccountContextValue` interface (lines 35-36)
- Remove default noop implementations (lines 60-61)
- Remove `addBusinessAccount` callback function (lines 180-206)
- Remove `syncBusinessAccounts` callback function (lines 208-255)
- Remove both from the value object passed to `AccountContext.Provider`

**Step 4: Clean AccountSelector.tsx**

- Remove business badge rendering (any `type === 'business'` checks)
- Remove business testnet logic
- Remove "New Business Wallet" button

**Step 5: Clean TokenList.tsx**

- Remove imports of `getUserBusinesses` and `BusinessWallet` from `@e-y/shared`
- Remove business fetch logic that links tokens to business pages

**Step 6: Clean Providers.tsx**

Replace entire file content:
```typescript
'use client'

import { AccountProvider } from '@/contexts/account-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { useErrorTrackingInit, useErrorTrackingUser } from '@/hooks/useErrorTracking'
import type { ReactNode } from 'react'

/** Syncs wallet address with error tracking user context */
function ErrorTrackingUserSync({ children }: { children: ReactNode }) {
  useErrorTrackingUser()
  return <>{children}</>
}

export default function Providers({ children }: { children: ReactNode }) {
  // Initialize error tracking on app startup
  useErrorTrackingInit()

  return (
    <ThemeProvider>
      <AccountProvider>
        <ErrorTrackingUserSync>
          <BalanceProvider>
            {children}
          </BalanceProvider>
        </ErrorTrackingUserSync>
      </AccountProvider>
    </ThemeProvider>
  )
}
```

**Step 7: Clean multi-network.ts and error-tracking.ts**

- In `multi-network.ts`: remove `'business'` from any `accountType` parameter handling (treat only `'test'` and `'real'`)
- In `error-tracking.ts`: remove `BUSINESS: 'business'` from `BreadcrumbCategory`

**Step 8: Clean .next cache**

```bash
rm -rf apps/web/.next/
```

**Step 9: Type-check web app**

```bash
pnpm --filter @e-y/web build
```
Expected: BUILD SUCCESS.

**Step 10: Commit**

```bash
git add -A apps/web/
git commit -m "refactor(web): remove business wallet pages, components, hooks, and all references"
```

---

### Task 4: Remove business wallet from Mobile App (`apps/mobile/`)

**Files:**
- Delete: `apps/mobile/app/business/` (entire route directory — _layout, create, [id]/index, [id]/proposals, [id]/transfer)
- Delete: `apps/mobile/src/components/business/` (entire directory — BusinessCreateScreen, BusinessDashboardScreen, BusinessProposalsScreen)
- Delete: `apps/mobile/src/store/slices/business-slice.ts`
- Delete: `apps/mobile/src/hooks/useBusinessSync.ts`
- Modify: `apps/mobile/app/_layout.tsx:24,108,200` — remove useBusinessSync import, call, and business Stack screen
- Modify: `apps/mobile/src/store/index.ts:22,42` — remove businessReducer import and registration
- Modify: `apps/mobile/src/store/slices/wallet-slice.ts:148-233,433-444` — remove addBusinessAccountThunk, syncBusinessAccountsThunk, and their extraReducers
- Modify: `apps/mobile/src/components/home/TokensList.tsx:12,36-55` — remove business imports and fetch logic
- Modify: `apps/mobile/src/components/home/SharesList.tsx` — likely entirely business-related, delete if so
- Modify: `apps/mobile/src/components/home/AccountSelectorSheet.tsx` — remove "New Business Wallet" button and business navigation
- Modify: `apps/mobile/src/components/AccountTypeBadge.tsx:10,37,50` — remove business type branch
- Modify: `apps/mobile/src/hooks/index.ts:7` — remove `useBusinessSync` export
- Modify: `apps/mobile/src/services/network-service.ts:241` — remove `'business'` from accountType

**Step 1: Delete business-only files and directories**

```bash
rm -rf apps/mobile/app/business/
rm -rf apps/mobile/src/components/business/
rm apps/mobile/src/store/slices/business-slice.ts
rm apps/mobile/src/hooks/useBusinessSync.ts
```

**Step 2: Check and delete SharesList.tsx if entirely business**

Read `apps/mobile/src/components/home/SharesList.tsx` — if it only renders business shares, delete it. If it has non-business functionality, remove only business parts.

**Step 3: Clean _layout.tsx**

- Remove line 24: `import { useBusinessSync } from '@/src/hooks/useBusinessSync';`
- Remove line 108: `useBusinessSync();`
- Remove line 200: `<Stack.Screen name="business" options={{ headerShown: false }} />`

**Step 4: Clean store/index.ts**

- Remove line 22: `import businessReducer from './slices/business-slice';`
- Remove line 42: `business: businessReducer,`

**Step 5: Clean wallet-slice.ts**

- Remove `addBusinessAccountThunk` (lines 148-181)
- Remove `syncBusinessAccountsThunk` (lines 187-233+)
- Remove their `extraReducers` cases (lines 433-444+)
- Also remove any imports related to these (e.g., `createAccount` from `@e-y/shared` if only used for business)

**Step 6: Clean TokensList.tsx**

- Remove business API imports (e.g., `getUserBusinesses`, `BusinessWallet`)
- Remove business fetch and link logic

**Step 7: Clean AccountSelectorSheet.tsx**

- Remove "New Business Wallet" button
- Remove business account navigation/handling

**Step 8: Clean AccountTypeBadge.tsx**

- Remove the `'business'` case from the type switch

**Step 9: Clean hooks/index.ts**

- Remove line 7: `export { useBusinessSync } from './useBusinessSync';`

**Step 10: Clean network-service.ts**

- Remove `'business'` from accountType handling

**Step 11: Type-check mobile app**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No type errors.

**Step 12: Commit**

```bash
git add -A apps/mobile/
git commit -m "refactor(mobile): remove business wallet screens, store, hooks, and all references"
```

---

### Task 5: Remove business wallet from Website (`apps/website/`)

**Files:**
- Delete: `apps/website/src/components/hud/sections/BusinessSection.tsx`
- Modify: `apps/website/src/components/sections/Showcase.tsx` — remove `'business'` category, `businessFeatures` array, category tab
- Modify: `apps/website/src/components/sections/Roadmap.tsx` — remove "Business Wallet & Governance" item (change "DeFi & Business" phase title to "DeFi")
- Modify: `apps/website/src/components/sections/SectionVisuals.tsx` — remove `BusinessVisual` component and `case 'business'`
- Modify: `apps/website/src/components/ShardLanding.tsx` — remove Business section from sections array and camera position
- Modify: `apps/website/src/components/SlidePresentation.tsx` — remove Business slide, `BusinessScreen` component
- Modify: `apps/website/src/components/CrystalLanding.tsx` — remove "Business" section
- Modify: `apps/website/src/components/3d/MorphSphere.tsx` — remove business morph config entry
- Modify: `apps/website/src/app/terms/page.tsx` — remove business wallet mention from terms text (line 64)
- Modify: `apps/website/src/app/press-kit/page.tsx` — remove "Business Wallet" from features list and marketing text
- **Keep:** Contact email `eternity.shard.business@gmail.com` in Footer, privacy, terms, press-kit

**Step 1: Delete BusinessSection**

```bash
rm apps/website/src/components/hud/sections/BusinessSection.tsx
```

**Step 2: Clean Showcase.tsx**

- Remove `'business'` from category type/union
- Remove `businessFeatures` array (lines 128-171)
- Remove Business Wallet category tab (lines 1295-1310)

**Step 3: Clean Roadmap.tsx**

- Change "DeFi & Business" phase title → "DeFi"
- Remove "Business Wallet & Governance" item

**Step 4: Clean remaining website components**

- `SectionVisuals.tsx`: Remove `BusinessVisual` and `case 'business'`
- `ShardLanding.tsx`: Remove business section from sections array
- `SlidePresentation.tsx`: Remove business slide and `BusinessScreen`
- `CrystalLanding.tsx`: Remove "Business" section
- `MorphSphere.tsx`: Remove business morph config

**Step 5: Clean terms and press-kit pages**

- `terms/page.tsx`: Remove business wallet mentions from terms text
- `press-kit/page.tsx`: Remove "Business Wallet" from features list and marketing text
- **Keep the contact email** everywhere — it's the company email, not a feature

**Step 6: Type-check website**

```bash
pnpm --filter @e-y/website build
```
Expected: BUILD SUCCESS.

**Step 7: Commit**

```bash
git add -A apps/website/
git commit -m "refactor(website): remove business wallet from showcase, roadmap, landing, and marketing pages"
```

---

### Task 6: Remove smart contracts and create database DROP migration

**Files:**
- Delete: `contracts/contracts/BusinessFactory.sol`
- Delete: `contracts/contracts/BusinessToken.sol`
- Delete: `contracts/contracts/BusinessTreasury.sol`
- Delete: `contracts/test/BusinessFactory.test.ts`
- Delete: `contracts/test/BusinessToken.test.ts`
- Delete: `contracts/test/BusinessTreasury.test.ts`
- Delete: `contracts/artifacts/contracts/BusinessToken.sol/`
- Delete: `contracts/artifacts/contracts/BusinessFactory.sol/`
- Delete: `contracts/artifacts/contracts/BusinessTreasury.sol/`
- Delete: `contracts/typechain-types/contracts/BusinessFactory.ts`
- Delete: `contracts/typechain-types/contracts/BusinessToken.ts`
- Delete: `contracts/typechain-types/contracts/BusinessTreasury.sol/`
- Delete: `contracts/typechain-types/factories/contracts/BusinessFactory__factory.ts`
- Delete: `contracts/typechain-types/factories/contracts/BusinessToken__factory.ts`
- Delete: `contracts/typechain-types/factories/contracts/BusinessTreasury.sol/`
- Modify: `contracts/scripts/deploy.ts` — remove BusinessFactory deployment (if present)
- Modify: `contracts/typechain-types/index.ts` — remove business re-exports (if present)
- Create: `supabase/migrations/20260312120000_drop_business_tables.sql`

**Step 1: Delete contract source files and tests**

```bash
rm contracts/contracts/BusinessFactory.sol
rm contracts/contracts/BusinessToken.sol
rm contracts/contracts/BusinessTreasury.sol
rm contracts/test/BusinessFactory.test.ts
rm contracts/test/BusinessToken.test.ts
rm contracts/test/BusinessTreasury.test.ts
```

**Step 2: Delete artifacts and typechain**

```bash
rm -rf contracts/artifacts/contracts/BusinessToken.sol/
rm -rf contracts/artifacts/contracts/BusinessFactory.sol/
rm -rf contracts/artifacts/contracts/BusinessTreasury.sol/
rm -f contracts/typechain-types/contracts/BusinessFactory.ts
rm -f contracts/typechain-types/contracts/BusinessToken.ts
rm -rf contracts/typechain-types/contracts/BusinessTreasury.sol/
rm -f contracts/typechain-types/factories/contracts/BusinessFactory__factory.ts
rm -f contracts/typechain-types/factories/contracts/BusinessToken__factory.ts
rm -rf contracts/typechain-types/factories/contracts/BusinessTreasury.sol/
```

**Step 3: Clean deploy.ts and typechain index**

Remove any BusinessFactory deployment code from `contracts/scripts/deploy.ts`.
Remove business re-exports from `contracts/typechain-types/index.ts` (if they exist).

**Step 4: Create DROP migration**

Create `supabase/migrations/20260312120000_drop_business_tables.sql`:
```sql
-- Drop business wallet tables (feature removed)
-- Order: activity → proposals → members → businesses (respect FK constraints)

DROP TABLE IF EXISTS business_activity CASCADE;
DROP TABLE IF EXISTS business_proposals CASCADE;
DROP TABLE IF EXISTS business_members CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
```

**Step 5: Commit**

```bash
git add -A contracts/ supabase/
git commit -m "refactor: remove business wallet smart contracts and create DROP migration for business tables"
```

---

### Task 7: Clean documentation

**Files:**
- Delete: `docs/plans/2026-02-13-business-wallet-plan.md`
- Delete: `docs/plans/2026-02-13-business-wallet-design.md`
- Modify: `docs/v1.0/prd.md` — remove business wallet section/references
- Modify: `docs/v1.0/architecture.md` — remove business wallet section/references
- Modify: `docs/v1.0/project-context.md` — remove business wallet references
- Modify: `docs/v1.0/product-brief.md` — remove business wallet references
- Modify: `docs/security-audit-plan.md` — remove business wallet audit sections
- Modify: `docs/university/manual-testing-checklist.md` — remove business wallet test flows
- Modify: `docs/university/test-plan.md` — remove business wallet test plan sections
- Modify: `docs/CHANGELOG.md` — keep historical entries (no change needed, CHANGELOG is history)

**Step 1: Delete dedicated plan docs**

```bash
rm docs/plans/2026-02-13-business-wallet-plan.md
rm docs/plans/2026-02-13-business-wallet-design.md
```

**Step 2: Clean core docs**

For each doc file listed above:
- Search for "business" (case-insensitive)
- Remove sections, bullet points, or paragraphs about business wallet
- Keep the document coherent after removal
- Do NOT remove references to the contact email

**Step 3: Commit**

```bash
git add -A docs/
git commit -m "docs: remove all business wallet documentation and plan files"
```

---

### Task 8: Clean memory, verify, and final commit

**Files:**
- Modify: `/Users/daniillogachev/.claude/projects/-Users-daniillogachev-Ma-project-E-Y/memory/MEMORY.md` — remove business wallet sections

**Step 1: Update MEMORY.md**

Remove these sections from MEMORY.md:
- "Business Wallet Status" (dividends, vesting status)
- "Smart Contracts (Sepolia)" (BusinessFactory address, deployer info)
- "Checkpoints" (checkpoint before dividends/vesting UI)
- Any other business wallet references

**Step 2: Full type-check across all packages**

```bash
pnpm --filter @e-y/shared build && pnpm --filter @e-y/web build && pnpm --filter @e-y/api build && cd apps/mobile && npx tsc --noEmit
```
Expected: All builds succeed, zero type errors.

**Step 3: Fix any remaining broken references**

If type-check reveals lingering imports or references, fix them.

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: fix remaining business wallet references after removal"
```

---

## Execution Notes

- **Order matters:** Task 1 (shared) MUST be done first since all other layers import from it.
- **Tasks 2-5 are independent** of each other and CAN be parallelized after Task 1.
- **Task 6 (contracts)** is fully independent and can run anytime.
- **Task 7 (docs)** is fully independent and can run anytime.
- **Task 8 (verification)** must run last.
- **Total estimated scope:** ~45 file deletions + ~60 surgical edits across the monorepo.
- **Contact email** (`eternity.shard.business@gmail.com`) must be kept — it's the company email, not a feature.
