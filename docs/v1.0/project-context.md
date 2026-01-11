---
project: E-Y
version: 1.0.0
created: 2026-01-11
type: project-context
purpose: AI Agent Implementation Guide
---

# E-Y Project Context

**This file MUST be read before writing ANY code.** It contains critical rules that ensure consistent, high-quality implementation.

## Core Principles

### 1. Documentation First

```
ALWAYS: Code follows documentation
NEVER:  Invent features not in PRD/Architecture
```

**Reference Documents (in priority order):**
1. `docs/v1.0/architecture.md` — технические решения
2. `docs/v1.0/prd.md` — требования и функционал
3. `docs/v1.0/product-brief.md` — видение продукта

**Before implementing anything:**
- Verify the feature exists in PRD
- Check architecture.md for technical approach
- If not documented → ASK, don't invent

### 2. No Duplication

```
ALWAYS: Single source of truth
NEVER:  Copy-paste code between files
```

**Anti-patterns:**
```typescript
// ❌ WRONG: Duplicated logic
// file1.ts
const formatAddress = (addr: string) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

// file2.ts
const shortenAddress = (addr: string) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

// ✅ CORRECT: Single utility
// packages/shared/src/utils/format.ts
export const formatAddress = (addr: string) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

// file1.ts & file2.ts
import { formatAddress } from '@e-y/shared';
```

**Duplication checklist before writing code:**
- [ ] Does this function already exist in `@e-y/shared`?
- [ ] Does this component exist in `components/ui/`?
- [ ] Is there a similar pattern elsewhere I should reuse?

### 3. Clean Code Standards

**File Length:**
- Components: MAX 200 lines
- Services: MAX 300 lines
- If larger → split into smaller modules

**Function Length:**
- MAX 30 lines per function
- If larger → extract helper functions

**Nesting:**
- MAX 3 levels of nesting
- Use early returns to reduce nesting

```typescript
// ❌ WRONG: Deep nesting
if (user) {
  if (user.wallet) {
    if (user.wallet.balance > 0) {
      // logic
    }
  }
}

// ✅ CORRECT: Early returns
if (!user) return;
if (!user.wallet) return;
if (user.wallet.balance <= 0) return;
// logic
```

---

## Technology Rules

### TypeScript

**Strict Mode Required:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type Everything:**
```typescript
// ❌ WRONG
const fetchData = async (id) => { ... }

// ✅ CORRECT
const fetchData = async (id: string): Promise<User | null> => { ... }
```

**No `any`:**
```typescript
// ❌ WRONG
const data: any = response.json();

// ✅ CORRECT
const data: ApiResponse<User> = response.json();
```

### React Native / Expo

**Functional Components Only:**
```typescript
// ❌ WRONG: Class component
class MyComponent extends React.Component { ... }

// ✅ CORRECT: Functional component
const MyComponent: React.FC<Props> = ({ ... }) => { ... }
```

**Named Exports:**
```typescript
// ❌ WRONG
export default function Button() { ... }

// ✅ CORRECT
export const Button: React.FC<ButtonProps> = () => { ... }
```

**Hooks Rules:**
- Custom hooks start with `use`
- Hooks at top level only
- Dependencies array must be complete

### Redux Toolkit

**Slice Structure:**
```typescript
interface FeatureState {
  // Data
  items: Item[];
  selectedId: string | null;

  // Status (NOT isLoading boolean!)
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

**Async Thunks:**
```typescript
// Use createAsyncThunk, not manual dispatch
export const fetchItems = createAsyncThunk(
  'feature/fetchItems',
  async (params: FetchParams, { rejectWithValue }) => {
    try {
      return await api.getItems(params);
    } catch (error) {
      return rejectWithValue(mapError(error));
    }
  }
);
```

### NestJS Backend

**Module Structure:**
```
modules/{feature}/
├── {feature}.module.ts      # Module definition
├── {feature}.controller.ts  # HTTP endpoints
├── {feature}.service.ts     # Business logic
├── {feature}.gateway.ts     # WebSocket (if needed)
├── dto/                     # Request/Response DTOs
└── entities/                # Database entities
```

**Validation:**
```typescript
// ALWAYS use class-validator
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 20)
  username: string;
}
```

---

## Naming Conventions

### Files (kebab-case)
```
wallet-service.ts       ✅
WalletService.ts        ❌
walletService.ts        ❌
```

### Components (PascalCase)
```
BalanceCard.tsx         ✅
balanceCard.tsx         ❌
balance-card.tsx        ❌
```

### Functions (camelCase)
```typescript
getUserBalance()        ✅
GetUserBalance()        ❌
get_user_balance()      ❌
```

### Constants (SCREAMING_SNAKE_CASE)
```typescript
const MAX_BLIK_AGE = 120000;    ✅
const maxBlikAge = 120000;      ❌
```

### Types/Interfaces (PascalCase)
```typescript
interface BlikCode { ... }      ✅
interface blikCode { ... }      ❌
interface BLIK_CODE { ... }     ❌
```

### Database (snake_case)
```sql
users, blik_codes, created_at   ✅
Users, blikCodes, createdAt     ❌
```

---

## Error Handling

### Error Codes Format
```typescript
// Pattern: DOMAIN_ERROR_TYPE
'WALLET_NOT_FOUND'
'WALLET_INSUFFICIENT_BALANCE'
'BLIK_CODE_EXPIRED'
'BLIK_CODE_INVALID'
'TX_FAILED'
'NETWORK_ERROR'
```

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: 'BLIK_CODE_EXPIRED',
    message: 'BLIK code has expired. Please generate a new one.'
  }
}
```

### Error Handling Pattern
```typescript
// Service layer: throw with code
throw new AppError('BLIK_CODE_EXPIRED', 'Code expired after 2 minutes');

// Component layer: display user-friendly message
try {
  await redeemBlikCode(code);
} catch (error) {
  if (error.code === 'BLIK_CODE_EXPIRED') {
    showToast('Code expired. Generate a new one.');
  } else {
    showToast('Something went wrong. Please try again.');
  }
}
```

---

## Testing Requirements

### Test Location
```
// Co-located with source
features/wallet/services/wallet-service.ts
features/wallet/services/wallet-service.test.ts

// E2E in __tests__
__tests__/e2e/blik-flow.test.ts
```

### Test Naming
```typescript
describe('WalletService', () => {
  describe('createWallet', () => {
    it('should generate valid 12-word seed phrase', () => { ... });
    it('should derive correct address from seed', () => { ... });
    it('should throw on invalid seed phrase', () => { ... });
  });
});
```

### Minimum Coverage
- Services: 80%+
- Crypto functions: 100%
- Components: Snapshot + interaction tests

---

## Security Rules

### NEVER Do This
```typescript
// ❌ NEVER log sensitive data
console.log('Seed phrase:', seedPhrase);
console.log('Private key:', privateKey);

// ❌ NEVER store keys in plain text
AsyncStorage.setItem('privateKey', key);

// ❌ NEVER send keys to server
await api.post('/backup', { seedPhrase });

// ❌ NEVER use eval or Function constructor
eval(userInput);
new Function(userInput);
```

### ALWAYS Do This
```typescript
// ✅ Use secure storage for sensitive data
await SecureStore.setItemAsync('encryptedSeed', encrypted);

// ✅ Clear sensitive data from memory
privateKey = null;
seed.fill(0);

// ✅ Validate all external input
if (!isValidAddress(address)) throw new Error('Invalid address');
```

---

## Import Order

```typescript
// 1. React/React Native
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import { useDispatch } from 'react-redux';
import { ethers } from 'ethers';

// 3. Internal packages
import { formatAddress } from '@e-y/shared';
import { signTransaction } from '@e-y/crypto';

// 4. Local imports (relative)
import { useWallet } from '../hooks/useWallet';
import { WalletCard } from '../components/WalletCard';

// 5. Types (always last)
import type { User, Wallet } from '@e-y/shared/types';
```

---

## Git Commit Rules

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Build, config, dependencies

### Examples
```
feat(blik): add code generation with 2-min expiry
fix(wallet): correct balance calculation for ERC-20
refactor(send): extract gas estimation to separate service
docs(readme): update setup instructions
test(crypto): add seed phrase validation tests
```

### Rules
- First line: MAX 72 characters
- Use imperative mood: "add" not "added"
- Reference issues: `Closes #123`

---

## API Response Format

### Success
```typescript
{
  success: true,
  data: T
}
```

### Error
```typescript
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

### Paginated
```typescript
{
  success: true,
  data: T[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    hasMore: boolean
  }
}
```

---

## Architecture Boundaries

### What Goes Where

| Code Type | Location | Import From |
|-----------|----------|-------------|
| Shared types | `packages/shared/src/types/` | `@e-y/shared` |
| Shared utils | `packages/shared/src/utils/` | `@e-y/shared` |
| Crypto functions | `packages/crypto/src/` | `@e-y/crypto` |
| Mobile components | `apps/mobile/components/` | Relative import |
| Mobile features | `apps/mobile/features/` | Relative import |
| API modules | `apps/api/src/modules/` | Relative import |

### Forbidden Imports

```typescript
// ❌ Mobile should NEVER import from API
import { something } from '../../apps/api/src/...';

// ❌ API should NEVER import mobile code
import { component } from '../../apps/mobile/...';

// ❌ Packages should NEVER import from apps
import { feature } from '../../apps/mobile/features/...';
```

---

## Pre-Implementation Checklist

Before writing ANY code, verify:

- [ ] Feature exists in PRD (`docs/v1.0/prd.md`)
- [ ] Technical approach matches architecture (`docs/v1.0/architecture.md`)
- [ ] No duplicate code/components exist
- [ ] Naming follows conventions
- [ ] File location is correct per architecture
- [ ] Types are defined in `@e-y/shared` if shared

---

## Quick Reference

### Project Structure
```
e-y/
├── apps/
│   ├── mobile/     # Expo React Native
│   └── api/        # NestJS Backend
├── packages/
│   ├── shared/     # @e-y/shared (types, utils)
│   └── crypto/     # @e-y/crypto (wallet, signing)
└── docs/v1.0/      # Documentation
```

### Key Commands
```bash
pnpm dev            # Start all services
pnpm lint           # Run linters
pnpm test           # Run tests
pnpm typecheck      # TypeScript check
```

### Key Files
- Architecture: `docs/v1.0/architecture.md`
- PRD: `docs/v1.0/prd.md`
- This context: `_bmad-output/planning-artifacts/project-context.md`

---

**Remember: When in doubt, check the documentation. Don't invent.**
